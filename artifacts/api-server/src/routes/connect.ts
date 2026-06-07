import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userProfilesTable } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";
import { writeFirestoreDoc } from "../firebaseAdmin";

const router: IRouter = Router();

async function getOrCreateConnectAccount(
  stripe: Awaited<ReturnType<typeof getUncachableStripeClient>>,
  uid: string,
  email?: string,
): Promise<string> {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, uid))
    .limit(1);

  if (profile?.stripeConnectAccountId) {
    return profile.stripeConnectAccountId;
  }

  const account = await stripe.accounts.create({
    type: "express",
    ...(email ? { email } : {}),
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { uid },
  });

  await db
    .insert(userProfilesTable)
    .values({
      firebaseUid: uid,
      stripeConnectAccountId: account.id,
      stripeConnectOnboarded: false,
    })
    .onConflictDoUpdate({
      target: userProfilesTable.firebaseUid,
      set: {
        stripeConnectAccountId: account.id,
        stripeConnectOnboarded: false,
      },
    });

  try {
    await writeFirestoreDoc("users", uid, { stripeConnectAccountId: account.id, stripeConnectOnboarded: false });
  } catch (err) {
    logger.warn({ err, uid }, "Firestore sync non-fatal");
  }

  return account.id;
}

// POST /stripe/connect/onboard
// Creates (or retrieves) an Express account and returns an Account Link URL
router.post("/stripe/connect/onboard", async (req, res): Promise<void> => {
  const { uid, email, returnUrl } = req.body as { uid?: string; email?: string; returnUrl?: string };
  if (!uid || !returnUrl) {
    res.status(400).json({ error: "uid and returnUrl are required" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const accountId = await getOrCreateConnectAccount(stripe, uid, email);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${returnUrl}?refresh=true`,
      return_url: `${returnUrl}?connected=true`,
      type: "account_onboarding",
    });

    logger.info({ uid, accountId }, "Created Stripe Connect onboarding link");
    res.json({ url: accountLink.url, accountId });
  } catch (err) {
    logger.error({ err, uid }, "Failed to create connect onboarding link");
    res.status(500).json({ error: "Failed to create onboarding link" });
  }
});

// POST /stripe/connect/login
// Returns a Stripe Express dashboard login link
router.post("/stripe/connect/login", async (req, res): Promise<void> => {
  const { uid } = req.body as { uid?: string };
  if (!uid) {
    res.status(400).json({ error: "uid is required" });
    return;
  }

  try {
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.firebaseUid, uid))
      .limit(1);

    if (!profile?.stripeConnectAccountId) {
      res.status(404).json({ error: "No connected Stripe account found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(profile.stripeConnectAccountId);

    logger.info({ uid, accountId: profile.stripeConnectAccountId }, "Created Stripe Express login link");
    res.json({ url: loginLink.url });
  } catch (err) {
    logger.error({ err, uid }, "Failed to create login link");
    res.status(500).json({ error: "Failed to create login link" });
  }
});

// GET /stripe/connect/account?uid=...
// Returns account status, details_submitted, payouts_enabled
router.get("/stripe/connect/account", async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === "string" ? req.query.uid : "";
  if (!uid) {
    res.status(400).json({ error: "uid is required" });
    return;
  }

  try {
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.firebaseUid, uid))
      .limit(1);

    if (!profile?.stripeConnectAccountId) {
      res.json({ connected: false });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.retrieve(profile.stripeConnectAccountId);

    const onboarded = account.details_submitted && account.payouts_enabled;

    if (onboarded && !profile.stripeConnectOnboarded) {
      await db
        .update(userProfilesTable)
        .set({ stripeConnectOnboarded: true })
        .where(eq(userProfilesTable.firebaseUid, uid));
      try {
        await writeFirestoreDoc("users", uid, { stripeConnectOnboarded: true });
      } catch { /* non-fatal */ }
    }

    res.json({
      connected: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      onboarded,
    });
  } catch (err) {
    logger.error({ err, uid }, "Failed to retrieve connect account");
    res.status(500).json({ error: "Failed to retrieve account" });
  }
});

// GET /stripe/connect/balance?uid=...
// Returns available and pending balance for the connected account
router.get("/stripe/connect/balance", async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === "string" ? req.query.uid : "";
  if (!uid) {
    res.status(400).json({ error: "uid is required" });
    return;
  }

  try {
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.firebaseUid, uid))
      .limit(1);

    if (!profile?.stripeConnectAccountId) {
      res.json({ available: 0, pending: 0 });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const balance = await stripe.balance.retrieve(
      { stripeAccount: profile.stripeConnectAccountId } as Parameters<typeof stripe.balance.retrieve>[0]
    );

    const sumUsd = (arr: { currency: string; amount: number }[]) =>
      arr.filter(b => b.currency === "usd").reduce((s, b) => s + b.amount, 0) / 100;

    res.json({
      available: sumUsd(balance.available as { currency: string; amount: number }[]),
      pending: sumUsd(balance.pending as { currency: string; amount: number }[]),
    });
  } catch (err) {
    logger.error({ err, uid }, "Failed to retrieve connect balance");
    res.status(500).json({ error: "Failed to retrieve balance" });
  }
});

// GET /stripe/connect/payouts?uid=...
// Returns payout history for the connected account
router.get("/stripe/connect/payouts", async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === "string" ? req.query.uid : "";
  if (!uid) {
    res.status(400).json({ error: "uid is required" });
    return;
  }

  try {
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.firebaseUid, uid))
      .limit(1);

    if (!profile?.stripeConnectAccountId) {
      res.json({ data: [] });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const payouts = await stripe.payouts.list(
      { limit: 50 },
      { stripeAccount: profile.stripeConnectAccountId }
    );

    res.json({
      data: payouts.data.map(p => ({
        id: p.id,
        amount: p.amount / 100,
        currency: p.currency,
        status: p.status,
        arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        description: p.description,
        method: p.method,
        type: p.type,
      })),
    });
  } catch (err) {
    logger.error({ err, uid }, "Failed to retrieve connect payouts");
    res.status(500).json({ error: "Failed to retrieve payouts" });
  }
});

// GET /stripe/connect/dashboard?uid=...
// Redirect link for mobile "Manage Payouts" button — drops creator straight into Stripe Express
router.get("/stripe/connect/dashboard", async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === "string" ? req.query.uid : "";
  if (!uid) {
    res.status(400).send("uid is required");
    return;
  }

  try {
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.firebaseUid, uid))
      .limit(1);

    if (!profile?.stripeConnectAccountId) {
      res.status(404).send("No connected Stripe account for this user");
      return;
    }

    const stripe = await getUncachableStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(profile.stripeConnectAccountId);

    logger.info({ uid, accountId: profile.stripeConnectAccountId }, "Dashboard redirect issued");
    res.redirect(302, loginLink.url);
  } catch (err) {
    logger.error({ err, uid }, "Failed to create dashboard redirect");
    res.status(500).send("Failed to generate dashboard link");
  }
});

export default router;

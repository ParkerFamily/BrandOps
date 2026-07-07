import { Router, type IRouter } from 'express';
import { sql, eq } from 'drizzle-orm';
import { db, creatorsTable, paymentsTable, campaignsTable, userProfilesTable } from '@workspace/db';
import { getUncachableStripeClient, getStripePublishableKey } from '../stripeClient';
import { logger } from '../lib/logger';
import { writeFirestoreDoc } from '../firebaseAdmin';
import {
  computePlatformPayoutAmounts,
  creatorAmountFromPaymentIntentMetadata,
} from '../lib/platformFee';
import {
  getBrandDefaultPaymentMethod,
  resolveBrandStripeCustomer,
  resolveConnectAccountIdForUid,
  resolveCreatorConnectAccount,
} from '../lib/creatorConnect';
import {
  createConnectDashboardHandoff,
  verifyConnectDashboardHandoff,
} from '../lib/connectDashboardHandoff';
import { resolveFirebaseUid, type AuthedRequest } from '../lib/firebaseAuth';

// Write Stripe status fields to Firestore users/{uid} so mobile app stays in sync
async function syncToFirestore(uid: string, fields: Record<string, unknown>): Promise<void> {
  try {
    await writeFirestoreDoc('users', uid, fields);
  } catch (err) {
    logger.warn({ err, uid }, 'Firestore sync failed (non-fatal)');
  }
}

const router: IRouter = Router();

// Get publishable key for frontend
router.get('/stripe/config', async (_req, res): Promise<void> => {
  const publishableKey = await getStripePublishableKey();
  res.json({ publishableKey });
});

// List products with prices from synced stripe schema
router.get('/stripe/products', async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    WITH paginated_products AS (
      SELECT id, name, description, metadata, active
      FROM stripe.products
      WHERE active = true
      ORDER BY created DESC
    )
    SELECT
      p.id as product_id,
      p.name as product_name,
      p.description as product_description,
      p.active as product_active,
      p.metadata as product_metadata,
      pr.id as price_id,
      pr.unit_amount,
      pr.currency,
      pr.recurring,
      pr.active as price_active
    FROM paginated_products p
    LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
    ORDER BY p.name, pr.unit_amount
  `);

  // Group prices by product
  const productsMap = new Map<string, { id: string; name: string; description: string; prices: unknown[] }>();
  for (const row of result.rows as any[]) {
    if (!productsMap.has(row.product_id)) {
      productsMap.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        description: row.product_description,
        prices: [],
      });
    }
    if (row.price_id) {
      productsMap.get(row.product_id)!.prices.push({
        id: row.price_id,
        unit_amount: row.unit_amount,
        currency: row.currency,
        recurring: row.recurring,
        active: row.price_active,
      });
    }
  }

  res.json({ data: Array.from(productsMap.values()) });
});

// Create a Connect destination charge — brand pays creator payout + 10% BrandOps fee
router.post('/stripe/payout-intent', async (req, res): Promise<void> => {
  const { amount, creatorEmail, creatorName, submissionId, brandUid, paymentId } = req.body as {
    amount?: number;
    creatorEmail?: string;
    creatorName?: string;
    submissionId?: string;
    brandUid?: string;
    paymentId?: string;
  };

  if (!amount || !creatorEmail || !brandUid || !submissionId) {
    res.status(400).json({ error: 'amount, creatorEmail, brandUid, and submissionId are required' });
    return;
  }

  const creatorAmountInput = Number(amount);
  if (!Number.isFinite(creatorAmountInput) || creatorAmountInput <= 0) {
    res.status(400).json({ error: 'amount must be a positive number' });
    return;
  }

  const breakdown = computePlatformPayoutAmounts(creatorAmountInput);
  const stripe = await getUncachableStripeClient();

  const creatorConnect = await resolveCreatorConnectAccount(String(creatorEmail));
  if (!creatorConnect) {
    res.status(402).json({
      error: 'creator_connect_required',
      message: 'Creator must complete Stripe Connect payout setup before you can pay them.',
    });
    return;
  }

  const creatorAccount = await stripe.accounts.retrieve(creatorConnect.accountId);
  if (!creatorAccount.payouts_enabled) {
    res.status(402).json({
      error: 'creator_payouts_disabled',
      message: 'Creator Stripe account is not ready to receive payouts yet.',
    });
    return;
  }

  const brandCustomerId = await resolveBrandStripeCustomer(String(brandUid));
  if (!brandCustomerId) {
    res.status(402).json({
      error: 'brand_billing_required',
      message: 'Add a payment method in Settings before paying creators.',
    });
    return;
  }

  const defaultPaymentMethod = await getBrandDefaultPaymentMethod(brandCustomerId);
  if (!defaultPaymentMethod) {
    res.status(402).json({
      error: 'brand_payment_method_required',
      message: 'Add a card in Settings before paying creators.',
    });
    return;
  }

  const metadata = {
    submissionId: String(submissionId),
    creatorEmail: String(creatorEmail),
    creatorName: String(creatorName ?? ''),
    brandUid: String(brandUid),
    type: 'creator_payout',
    creatorAmountCents: String(breakdown.creatorAmountCents),
    platformFeeCents: String(breakdown.platformFeeCents),
    totalAmountCents: String(breakdown.totalCents),
    connectedAccountId: creatorConnect.accountId,
  };

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: breakdown.totalCents,
      currency: 'usd',
      customer: brandCustomerId,
      payment_method: defaultPaymentMethod,
      confirm: true,
      off_session: true,
      application_fee_amount: breakdown.platformFeeCents,
      transfer_data: {
        destination: creatorConnect.accountId,
      },
      metadata,
      description: `BrandOps creator payout for submission ${submissionId}`,
    });
  } catch (err: unknown) {
    const stripeErr = err as { code?: string; message?: string };
    if (stripeErr.code === 'authentication_required') {
      paymentIntent = await stripe.paymentIntents.create({
        amount: breakdown.totalCents,
        currency: 'usd',
        customer: brandCustomerId,
        application_fee_amount: breakdown.platformFeeCents,
        transfer_data: {
          destination: creatorConnect.accountId,
        },
        metadata,
        description: `BrandOps creator payout for submission ${submissionId}`,
      });
    } else {
      req.log.error({ err, submissionId, creatorEmail }, 'Stripe payout intent failed');
      res.status(500).json({
        error: 'stripe_payout_failed',
        message: stripeErr.message ?? 'Failed to create payout charge',
      });
      return;
    }
  }

  const workflowStatus = paymentIntent.status === 'succeeded' ? 'paid' : 'processing';
  const firestorePatch: Record<string, unknown> = {
    creatorAmount: breakdown.creatorAmount,
    platformFeeAmount: breakdown.platformFeeAmount,
    totalAmount: breakdown.totalAmount,
    amount: breakdown.creatorAmount,
    stripePaymentIntentId: paymentIntent.id,
    connectedAccountId: creatorConnect.accountId,
    paymentStatus: paymentIntent.status,
    status: workflowStatus,
  };

  if (paymentId) {
    try {
      await writeFirestoreDoc('payments', String(paymentId), firestorePatch);
    } catch (err) {
      logger.warn({ err, paymentId }, 'Firestore payment sync failed (non-fatal)');
    }
  }

  req.log.info(
    {
      paymentIntentId: paymentIntent.id,
      creatorAmount: breakdown.creatorAmount,
      platformFeeAmount: breakdown.platformFeeAmount,
      totalAmount: breakdown.totalAmount,
      status: paymentIntent.status,
    },
    'Created Connect payout charge'
  );

  res.status(201).json({
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    customerId: brandCustomerId,
    creatorAmount: breakdown.creatorAmount,
    platformFeeAmount: breakdown.platformFeeAmount,
    totalAmount: breakdown.totalAmount,
    connectedAccountId: creatorConnect.accountId,
    paymentStatus: paymentIntent.status,
    status: workflowStatus,
  });
});

// Get payment intent status
router.get('/stripe/payout-intent/:id', async (req, res): Promise<void> => {
  const stripe = await getUncachableStripeClient();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const pi = await stripe.paymentIntents.retrieve(raw);
  const creatorAmount = creatorAmountFromPaymentIntentMetadata(pi.metadata as Record<string, string>);
  res.json({
    id: pi.id,
    status: pi.status,
    amount: creatorAmount ?? pi.amount / 100,
    totalAmount: pi.amount / 100,
    platformFeeAmount: pi.metadata?.platformFeeCents ? Number(pi.metadata.platformFeeCents) / 100 : null,
    currency: pi.currency,
    connectedAccountId: pi.metadata?.connectedAccountId ?? null,
  });
});

// List recent payout intents (creator payouts only, scoped to brandUid)
router.get('/stripe/payouts', async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
  if (!uid) {
    res.status(400).json({ error: 'uid is required' });
    return;
  }
  const stripe = await getUncachableStripeClient();
  const paymentIntents = await stripe.paymentIntents.list({ limit: 100 });
  const payouts = paymentIntents.data
    .filter(pi => pi.metadata?.type === 'creator_payout' && pi.metadata?.brandUid === uid)
    .map(pi => {
      const creatorAmount = creatorAmountFromPaymentIntentMetadata(pi.metadata as Record<string, string>);
      return {
        id: pi.id,
        amount: creatorAmount ?? pi.amount / 100,
        totalAmount: pi.amount / 100,
        platformFeeAmount: pi.metadata?.platformFeeCents ? Number(pi.metadata.platformFeeCents) / 100 : null,
        currency: pi.currency,
        status: pi.status,
        creatorEmail: pi.metadata?.creatorEmail,
        submissionId: pi.metadata?.submissionId,
        connectedAccountId: pi.metadata?.connectedAccountId ?? null,
        createdAt: new Date(pi.created * 1000).toISOString(),
      };
    });

  res.json({ data: payouts });
});

// All real charges for the authenticated brand — Stripe is the source of truth
router.get('/stripe/brand-charges', async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
  if (!uid) {
    res.status(400).json({ error: 'uid is required' });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, uid))
    .limit(1);

  if (!profile?.stripeCustomerId) {
    res.json({ data: [], totalPaid: 0, totalProcessing: 0, totalPending: 0 });
    return;
  }

  const stripe = await getUncachableStripeClient();

  // Fetch all charges for this customer (real money in/out)
  const charges = await stripe.charges.list({
    customer: profile.stripeCustomerId,
    limit: 100,
  });

  const mapped = charges.data.map(c => ({
    id: c.id,
    amount: c.amount / 100,
    currency: c.currency,
    status: c.status, // 'succeeded' | 'pending' | 'failed'
    description: c.description ?? c.metadata?.type ?? 'Charge',
    receiptUrl: c.receipt_url,
    createdAt: new Date(c.created * 1000).toISOString(),
  }));

  const totalPaid = mapped
    .filter(c => c.status === 'succeeded')
    .reduce((s, c) => s + c.amount, 0);
  const totalProcessing = mapped
    .filter(c => c.status === 'pending')
    .reduce((s, c) => s + c.amount, 0);
  const totalPending = 0; // pending means Stripe is processing — no separate "queued" bucket

  req.log.info({ uid, customerId: profile.stripeCustomerId, count: mapped.length, totalPaid }, 'Brand charges fetched');
  res.json({ data: mapped, totalPaid, totalProcessing, totalPending });
});

// Real earnings for a specific creator — queries Stripe directly by email
// Also cross-references the local DB for campaign/submission context
router.get('/stripe/creator-earnings', async (req, res): Promise<void> => {
  const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
  if (!email) {
    res.status(400).json({ error: 'email query parameter is required' });
    return;
  }

  const stripe = await getUncachableStripeClient();

  // Use Stripe Search API to find payment intents for this creator
  let stripePayouts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    submissionId: string | undefined;
    createdAt: string;
  }> = [];

  try {
    const searchResult = await stripe.paymentIntents.search({
      query: `metadata['creatorEmail']:'${email}' AND metadata['type']:'creator_payout'`,
      limit: 100,
    });
    stripePayouts = searchResult.data.map(pi => {
      const creatorAmount = creatorAmountFromPaymentIntentMetadata(pi.metadata as Record<string, string>);
      return {
        id: pi.id,
        amount: creatorAmount ?? pi.amount / 100,
        currency: pi.currency,
        status: pi.status,
        submissionId: pi.metadata?.submissionId,
        createdAt: new Date(pi.created * 1000).toISOString(),
      };
    });
  } catch {
    // Fallback: list and filter if search not available
    const listResult = await stripe.paymentIntents.list({ limit: 100 });
    stripePayouts = listResult.data
      .filter(pi => pi.metadata?.type === 'creator_payout' && pi.metadata?.creatorEmail === email)
      .map(pi => {
        const creatorAmount = creatorAmountFromPaymentIntentMetadata(pi.metadata as Record<string, string>);
        return {
          id: pi.id,
          amount: creatorAmount ?? pi.amount / 100,
          currency: pi.currency,
          status: pi.status,
          submissionId: pi.metadata?.submissionId,
          createdAt: new Date(pi.created * 1000).toISOString(),
        };
      });
  }

  // Also query local DB for context (campaign title, etc.)
  const dbPayments = await db
    .select({
      id: paymentsTable.id,
      amount: paymentsTable.amount,
      status: paymentsTable.status,
      paidAt: paymentsTable.paidAt,
      createdAt: paymentsTable.createdAt,
      campaignTitle: campaignsTable.title,
      submissionId: paymentsTable.submissionId,
    })
    .from(paymentsTable)
    .innerJoin(creatorsTable, eq(paymentsTable.creatorId, creatorsTable.id))
    .innerJoin(campaignsTable, eq(paymentsTable.campaignId, campaignsTable.id))
    .where(eq(creatorsTable.email, email));

  // Merge: prefer Stripe as source of truth for amounts/status;
  // enrich with DB campaign context where available
  const dbBySubmissionId = new Map(dbPayments.map(p => [String(p.submissionId), p]));

  const merged = stripePayouts.map(sp => {
    const db = sp.submissionId ? dbBySubmissionId.get(sp.submissionId) : undefined;
    return {
      stripeId: sp.id,
      amount: sp.amount,
      currency: sp.currency,
      stripeStatus: sp.status,
      campaignTitle: db?.campaignTitle ?? null,
      dbStatus: db?.status ?? null,
      paidAt: db?.paidAt ?? null,
      createdAt: sp.createdAt,
    };
  });

  // If there are DB payments not in Stripe (e.g. manually recorded), include those too
  const stripeSubmissionIds = new Set(stripePayouts.map(sp => sp.submissionId).filter(Boolean));
  for (const dbP of dbPayments) {
    if (!stripeSubmissionIds.has(String(dbP.submissionId))) {
      merged.push({
        stripeId: null as unknown as string,
        amount: parseFloat(dbP.amount),
        currency: 'usd',
        stripeStatus: dbP.status === 'paid' ? 'succeeded' : 'pending',
        campaignTitle: dbP.campaignTitle,
        dbStatus: dbP.status,
        paidAt: dbP.paidAt,
        createdAt: dbP.createdAt.toISOString(),
      });
    }
  }

  // Sort newest first
  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalEarned = merged
    .filter(p => p.stripeStatus === 'succeeded' || p.dbStatus === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = merged
    .filter(p => p.stripeStatus !== 'succeeded' && p.dbStatus !== 'paid' && p.stripeStatus !== 'canceled')
    .reduce((sum, p) => sum + p.amount, 0);

  req.log.info({ email, count: merged.length, totalEarned }, 'Creator earnings fetched');
  res.json({ totalEarned, pendingAmount, payments: merged });
});

// ── CREATOR STRIPE CONNECT ────────────────────────────────────────────────

async function createStripeConnectLoginLink(accountId: string): Promise<string> {
  const stripe = await getUncachableStripeClient();
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}

/** Mobile: exchange Firebase auth for a one-time browser URL (Manage payouts). */
router.post('/stripe/connect/dashboard-handoff', async (req, res): Promise<void> => {
  const authedUid = await resolveFirebaseUid(req as AuthedRequest);
  if (!authedUid) {
    res.status(401).json({ error: 'Sign in required. Send Authorization: Bearer <Firebase ID token>.' });
    return;
  }

  const bodyUid = typeof (req.body as { uid?: string })?.uid === 'string' ? (req.body as { uid: string }).uid.trim() : authedUid;
  if (bodyUid !== authedUid) {
    res.status(403).json({ error: 'uid does not match signed-in user.' });
    return;
  }

  const accountId = await resolveConnectAccountIdForUid(authedUid);
  if (!accountId) {
    res.status(402).json({
      error: 'connect_not_linked',
      message: 'Complete Stripe Connect payout setup before opening the payout dashboard.',
    });
    return;
  }

  try {
    const openUrl = await createConnectDashboardHandoff(authedUid);
    req.log.info({ uid: authedUid, accountId }, 'Connect dashboard handoff created');
    res.json({ openUrl, accountId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create dashboard handoff';
    req.log.error({ err, uid: authedUid }, 'connect dashboard handoff failed');
    res.status(500).json({ error: message });
  }
});

/**
 * Opens Stripe Express payout dashboard for a creator.
 * Mobile: POST /stripe/connect/dashboard-handoff first, then Linking.openURL(openUrl).
 * Authenticated fetch with Bearer also returns { url } directly.
 */
router.get('/stripe/connect/dashboard', async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === 'string' ? req.query.uid.trim() : '';
  const handoff = typeof req.query.handoff === 'string' ? req.query.handoff.trim() : '';

  if (!uid) {
    res.status(400).json({ error: 'uid query parameter is required' });
    return;
  }

  let authedUid: string | null = null;
  if (handoff) {
    const valid = await verifyConnectDashboardHandoff(handoff, uid);
    if (valid) authedUid = uid;
  } else {
    authedUid = await resolveFirebaseUid(req as AuthedRequest);
    if (authedUid && authedUid !== uid) {
      res.status(403).json({ error: 'uid does not match signed-in user.' });
      return;
    }
  }

  if (!authedUid) {
    res.status(401).json({ error: 'Sign in required or use a valid handoff token.' });
    return;
  }

  const accountId = await resolveConnectAccountIdForUid(uid);
  if (!accountId) {
    res.status(402).json({
      error: 'connect_not_linked',
      message: 'Complete Stripe Connect payout setup first.',
    });
    return;
  }

  try {
    const url = await createStripeConnectLoginLink(accountId);
    req.log.info({ uid, accountId }, 'Connect dashboard login link created');

    if (handoff || req.headers.accept?.includes('application/json') || req.headers.authorization) {
      if (handoff) {
        res.redirect(url);
        return;
      }
      res.json({ url, accountId });
      return;
    }

    res.redirect(url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to open Connect dashboard';
    req.log.error({ err, uid, accountId }, 'Connect dashboard login link failed');
    res.status(500).json({ error: message });
  }
});

// Start creator Connect Express onboarding — creates account if needed, returns hosted onboarding URL
router.post('/stripe/creator-connect/start', async (req, res): Promise<void> => {
  const authedUid = await resolveFirebaseUid(req as AuthedRequest);
  if (!authedUid) {
    res.status(401).json({ error: 'Sign in required. Send Authorization: Bearer <Firebase ID token>.' });
    return;
  }

  const { uid, email, name, returnUrl } = req.body as {
    uid?: string; email?: string; name?: string; returnUrl?: string;
  };

  const effectiveUid = typeof uid === 'string' && uid.trim() ? uid.trim() : authedUid;
  if (effectiveUid !== authedUid) {
    res.status(403).json({ error: 'uid does not match signed-in user.' });
    return;
  }

  const effectiveEmail = typeof email === 'string' ? email.trim() : '';
  if (!effectiveEmail) {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const base = returnUrl ?? 'https://brandopsapp.com/settings/payouts';

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, effectiveUid))
    .limit(1);

  let accountId = profile?.stripeConnectAccountId;

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: effectiveEmail,
        ...(typeof name === 'string' && name.trim() ? { business_profile: { name: name.trim() } } : {}),
      });
      accountId = account.id;

      await db
        .insert(userProfilesTable)
        .values({ firebaseUid: effectiveUid, stripeConnectAccountId: accountId })
        .onConflictDoUpdate({
          target: userProfilesTable.firebaseUid,
          set: { stripeConnectAccountId: accountId, updatedAt: new Date() },
        });

      await syncToFirestore(effectiveUid, {
        stripeConnectAccountId: accountId,
        stripeConnected: false,
        stripePayoutsEnabled: false,
        payoutMethodReady: false,
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}?stripe_connect=refresh`,
      return_url: `${base}?stripe_connect=complete`,
      type: 'account_onboarding',
    });

    req.log.info({ uid: effectiveUid, accountId }, 'Creator Connect onboarding link created');
    res.json({ url: accountLink.url, accountId });
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    if (msg.includes('signed up for Connect')) {
      req.log.warn({ uid: effectiveUid }, 'Stripe Connect not enabled on this account');
      res.status(402).json({
        error: 'connect_not_enabled',
        message: 'Stripe Connect is not enabled on this Stripe account.',
        activationUrl: 'https://dashboard.stripe.com/connect/accounts/overview',
      });
      return;
    }
    if (msg.includes('platform-profile') || msg.includes('managing losses')) {
      req.log.warn({ uid: effectiveUid }, 'Stripe Connect platform profile incomplete');
      res.status(402).json({
        error: 'platform_profile_incomplete',
        message: 'Your Stripe Connect platform profile is not complete.',
        activationUrl: 'https://dashboard.stripe.com/settings/connect/platform-profile',
      });
      return;
    }
    req.log.error({ err, uid: effectiveUid }, 'creator-connect/start failed');
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

// Check creator Connect Express account status
router.get('/stripe/creator-connect/status', async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
  if (!uid) {
    res.status(400).json({ error: 'uid is required' });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, uid))
    .limit(1);

  if (!profile?.stripeConnectAccountId) {
    res.json({ connected: false, payoutsEnabled: false, chargesEnabled: false });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const account = await stripe.accounts.retrieve(profile.stripeConnectAccountId);

  const fullyOnboarded = account.payouts_enabled && account.charges_enabled;

  if (fullyOnboarded && !profile.stripeConnectOnboarded) {
    await Promise.all([
      db.update(userProfilesTable)
        .set({ stripeConnectOnboarded: true, updatedAt: new Date() })
        .where(eq(userProfilesTable.firebaseUid, uid)),
      syncToFirestore(uid, {
        stripeConnected: true,
        stripePayoutsEnabled: true,
        payoutMethodReady: true,
        stripeConnectAccountId: account.id,
      }),
    ]);
  }

  res.json({
    connected: true,
    accountId: account.id,
    payoutsEnabled: account.payouts_enabled,
    chargesEnabled: account.charges_enabled,
    detailsSubmitted: account.details_submitted,
    requiresAction: !account.payouts_enabled || !account.details_submitted,
  });
});

// ── BRAND PAYMENT METHOD SETUP ────────────────────────────────────────────

// Check brand payment method status
router.get('/stripe/brand-setup/status', async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
  if (!uid) {
    res.status(400).json({ error: 'uid is required' });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, uid))
    .limit(1);

  if (!profile?.stripeCustomerId) {
    res.json({ ready: false, hasCustomer: false, hasPaymentMethod: false });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const methods = await stripe.paymentMethods.list({ customer: profile.stripeCustomerId, type: 'card', limit: 1 });
  const hasPaymentMethod = methods.data.length > 0;

  if (hasPaymentMethod) {
    await syncToFirestore(uid, {
      stripeCustomerId: profile.stripeCustomerId,
      stripeConnected: true,
      payoutMethodReady: true,
    });
  }

  res.json({ ready: hasPaymentMethod, hasCustomer: true, hasPaymentMethod, customerId: profile.stripeCustomerId });
});

// Start brand payment method setup — creates Stripe Customer + Checkout setup session
router.post('/stripe/brand-setup/start', async (req, res): Promise<void> => {
  const { uid, email, name, returnUrl } = req.body as {
    uid?: string; email?: string; name?: string; returnUrl?: string;
  };
  if (!uid || !email) {
    res.status(400).json({ error: 'uid and email are required' });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const base = returnUrl ?? 'http://localhost:80';

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, uid))
    .limit(1);

  let customerId = profile?.stripeCustomerId;

  if (!customerId) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0] ?? await stripe.customers.create({
      email,
      name: name ?? email,
      metadata: { firebaseUid: uid, role: 'brand' },
    });
    customerId = customer.id;

    await db
      .insert(userProfilesTable)
      .values({ firebaseUid: uid, stripeCustomerId: customerId })
      .onConflictDoUpdate({
        target: userProfilesTable.firebaseUid,
        set: { stripeCustomerId: customerId, updatedAt: new Date() },
      });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    payment_method_types: ['card'],
    success_url: `${base}/settings?stripe_setup=complete`,
    cancel_url: `${base}/settings?stripe_setup=cancelled`,
  });

  req.log.info({ uid, customerId, sessionId: session.id }, 'Brand payment setup session created');
  res.json({ url: session.url, customerId });
});

// Check active subscription plan for a brand user
router.get('/stripe/subscription/status', async (req, res): Promise<void> => {
  const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
  if (!uid) { res.status(400).json({ error: 'uid is required' }); return; }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, uid))
    .limit(1);

  if (!profile?.stripeCustomerId) {
    res.json({ plan: 'free', memberLimit: 0, status: 'none' });
    return;
  }

  const stripe = await getUncachableStripeClient();

  const [activeSubs, trialingSubs] = await Promise.all([
    stripe.subscriptions.list({ customer: profile.stripeCustomerId, status: 'active', limit: 1 }),
    stripe.subscriptions.list({ customer: profile.stripeCustomerId, status: 'trialing', limit: 1 }),
  ]);

  const sub = activeSubs.data[0] ?? trialingSubs.data[0];

  if (!sub) {
    res.json({ plan: 'free', memberLimit: 0, status: 'none' });
    return;
  }

  const PRICE_PLAN: Record<string, { plan: string; memberLimit: number | null }> = {
    'price_1TcYGnL8wN3kCgjXK1ffZG9F': { plan: 'starter',    memberLimit: 0    },
    'price_1TcYGnL8wN3kCgjXLhff0cBU': { plan: 'starter',    memberLimit: 0    },
    'price_1TcYGoL8wN3kCgjXSrhDw5iB': { plan: 'growth',     memberLimit: 5    },
    'price_1TcYGoL8wN3kCgjXo4rvaJq6': { plan: 'growth',     memberLimit: 5    },
  };

  const priceId = sub.items.data[0]?.price.id ?? '';
  const info = PRICE_PLAN[priceId] ?? { plan: 'enterprise', memberLimit: null };

  await syncToFirestore(uid, {
    subscriptionPlan: info.plan,
    subscriptionStatus: sub.status,
    stripeConnected: true,
  });

  req.log.info({ uid, plan: info.plan, priceId, status: sub.status }, 'Subscription status checked');
  res.json({ plan: info.plan, memberLimit: info.memberLimit, status: sub.status, currentPeriodEnd: (sub as unknown as Record<string, unknown>)['current_period_end'] ?? null });
});

router.post('/stripe/subscription/start', async (req, res): Promise<void> => {
  const { uid, email, name, priceId, returnUrl } = req.body as {
    uid?: string; email?: string; name?: string; priceId?: string; returnUrl?: string;
  };
  if (!uid || !email || !priceId) {
    res.status(400).json({ error: 'uid, email, and priceId are required' });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const base = returnUrl ?? 'http://localhost:80';

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, uid))
    .limit(1);

  let customerId = profile?.stripeCustomerId;

  if (!customerId) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0] ?? await stripe.customers.create({
      email,
      name: name ?? email,
      metadata: { firebaseUid: uid, role: 'brand' },
    });
    customerId = customer.id;

    await db
      .insert(userProfilesTable)
      .values({ firebaseUid: uid, stripeCustomerId: customerId })
      .onConflictDoUpdate({
        target: userProfilesTable.firebaseUid,
        set: { stripeCustomerId: customerId, updatedAt: new Date() },
      });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { firebaseUid: uid },
    },
    success_url: `${base}/settings?stripe_sub=complete`,
    cancel_url: `${base}/settings?stripe_sub=cancelled`,
    allow_promotion_codes: true,
  });

  req.log.info({ uid, customerId, priceId, sessionId: session.id }, 'Subscription checkout session created');
  res.json({ url: session.url });
});

// One-shot backfill: sync all PostgreSQL Stripe data → Firestore
// Also accepts { uid, email } body to force-sync a single user by Stripe email lookup
router.post('/admin/backfill-stripe-firestore', async (req, res): Promise<void> => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.SESSION_SECRET) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  const stripe = await getUncachableStripeClient();

  // ── Single-user mode: look up by email in Stripe ──────────────────────
  const { uid: singleUid, email: singleEmail } = req.body as { uid?: string; email?: string };
  if (singleUid && singleEmail) {
    const existing = await stripe.customers.list({ email: singleEmail, limit: 1 });
    const customer = existing.data[0];
    if (!customer) {
      res.json({ synced: 0, skipped: 1, failed: 0, results: [{ uid: singleUid, status: 'skipped', error: 'No Stripe customer found for email' }] });
      return;
    }

    const fields: Record<string, unknown> = { stripeCustomerId: customer.id };

    await db.insert(userProfilesTable)
      .values({ firebaseUid: singleUid, stripeCustomerId: customer.id })
      .onConflictDoUpdate({
        target: userProfilesTable.firebaseUid,
        set: { stripeCustomerId: customer.id, updatedAt: new Date() },
      });

    const methods = await stripe.paymentMethods.list({ customer: customer.id, type: 'card', limit: 1 });
    if (methods.data.length > 0) { fields.stripeConnected = true; fields.payoutMethodReady = true; }

    const [activeSubs, trialingSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 }),
      stripe.subscriptions.list({ customer: customer.id, status: 'trialing', limit: 1 }),
    ]);
    const sub = activeSubs.data[0] ?? trialingSubs.data[0];
    if (sub) {
      const PRICE_PLAN: Record<string, string> = {
        'price_1TcYGnL8wN3kCgjXK1ffZG9F': 'starter', 'price_1TcYGnL8wN3kCgjXLhff0cBU': 'starter',
        'price_1TcYGoL8wN3kCgjXSrhDw5iB': 'growth',  'price_1TcYGoL8wN3kCgjXo4rvaJq6': 'growth',
      };
      fields.subscriptionPlan = PRICE_PLAN[sub.items.data[0]?.price.id ?? ''] ?? 'enterprise';
      fields.subscriptionStatus = sub.status;
      fields.stripeConnected = true;
    }

    await syncToFirestore(singleUid, fields);
    res.json({ synced: 1, skipped: 0, failed: 0, results: [{ uid: singleUid, status: 'synced', fields }] });
    return;
  }

  const users = await db
    .select()
    .from(userProfilesTable)
    .where(
      // only users with some stripe data
      sql`stripe_customer_id IS NOT NULL OR stripe_connect_account_id IS NOT NULL`
    );

  const PRICE_PLAN: Record<string, string> = {
    'price_1TcYGnL8wN3kCgjXK1ffZG9F': 'starter',
    'price_1TcYGnL8wN3kCgjXLhff0cBU': 'starter',
    'price_1TcYGoL8wN3kCgjXSrhDw5iB': 'growth',
    'price_1TcYGoL8wN3kCgjXo4rvaJq6': 'growth',
  };

  const results: { uid: string; status: string; fields?: Record<string, unknown>; error?: string }[] = [];

  for (const user of users) {
    const uid = user.firebaseUid;
    const fields: Record<string, unknown> = {};

    try {
      if (user.stripeCustomerId) {
        fields.stripeCustomerId = user.stripeCustomerId;

        const methods = await stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: 'card', limit: 1 });
        if (methods.data.length > 0) {
          fields.stripeConnected = true;
          fields.payoutMethodReady = true;
        }

        const [activeSubs, trialingSubs] = await Promise.all([
          stripe.subscriptions.list({ customer: user.stripeCustomerId, status: 'active', limit: 1 }),
          stripe.subscriptions.list({ customer: user.stripeCustomerId, status: 'trialing', limit: 1 }),
        ]);

        const sub = activeSubs.data[0] ?? trialingSubs.data[0];
        if (sub) {
          const priceId = sub.items.data[0]?.price.id ?? '';
          fields.subscriptionPlan = PRICE_PLAN[priceId] ?? 'enterprise';
          fields.subscriptionStatus = sub.status;
          fields.stripeConnected = true;
        }
      }

      if (user.stripeConnectAccountId) {
        fields.stripeConnectAccountId = user.stripeConnectAccountId;
        const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
        if (account.payouts_enabled && account.charges_enabled) {
          fields.stripeConnected = true;
          fields.stripePayoutsEnabled = true;
          fields.payoutMethodReady = true;
        }
      }

      if (Object.keys(fields).length === 0) {
        results.push({ uid, status: 'skipped' });
        continue;
      }

      await syncToFirestore(uid, fields);
      results.push({ uid, status: 'synced', fields });
    } catch (err: any) {
      results.push({ uid, status: 'failed', error: err?.message });
    }
  }

  const synced = results.filter(r => r.status === 'synced').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed').length;

  req.log.info({ synced, skipped, failed }, 'Stripe → Firestore backfill complete');
  res.json({ synced, skipped, failed, results });
});

export default router;

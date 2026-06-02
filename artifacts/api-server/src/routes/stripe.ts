import { Router, type IRouter } from 'express';
import { sql, eq } from 'drizzle-orm';
import { db, creatorsTable, paymentsTable, campaignsTable, userProfilesTable } from '@workspace/db';
import { getUncachableStripeClient, getStripePublishableKey } from '../stripeClient';
import { logger } from '../lib/logger';
import { getFirebaseAdmin } from '../firebaseAdmin';

// Write Stripe status fields to Firestore users/{uid} so mobile app stays in sync
async function syncToFirestore(uid: string, fields: Record<string, unknown>): Promise<void> {
  try {
    const db = getFirebaseAdmin().firestore();
    await db.collection('users').doc(uid).set(fields, { merge: true });
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

// Create a payment intent for a creator payout
router.post('/stripe/payout-intent', async (req, res): Promise<void> => {
  const { amount, creatorEmail, creatorName, submissionId } = req.body;

  if (!amount || !creatorEmail) {
    res.status(400).json({ error: 'amount and creatorEmail are required' });
    return;
  }

  const stripe = await getUncachableStripeClient();

  // Find or create customer for the creator
  const existing = await stripe.customers.list({ email: creatorEmail, limit: 1 });
  let customer = existing.data[0];

  if (!customer) {
    customer = await stripe.customers.create({
      email: creatorEmail,
      name: creatorName,
      metadata: { role: 'creator' },
    });
  }

  // Create a payment intent (represents a payout queued to send to creator)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // cents
    currency: 'usd',
    customer: customer.id,
    metadata: {
      submissionId: String(submissionId),
      creatorEmail,
      type: 'creator_payout',
    },
    description: `BrandOps creator payout for submission #${submissionId}`,
  });

  req.log.info({ paymentIntentId: paymentIntent.id, amount }, 'Created payout intent');
  res.status(201).json({ paymentIntentId: paymentIntent.id, clientSecret: paymentIntent.client_secret, customerId: customer.id });
});

// Get payment intent status
router.get('/stripe/payout-intent/:id', async (req, res): Promise<void> => {
  const stripe = await getUncachableStripeClient();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const pi = await stripe.paymentIntents.retrieve(raw);
  res.json({ id: pi.id, status: pi.status, amount: pi.amount / 100, currency: pi.currency });
});

// List recent payout intents
router.get('/stripe/payouts', async (req, res): Promise<void> => {
  const stripe = await getUncachableStripeClient();
  const paymentIntents = await stripe.paymentIntents.list({ limit: 20 });
  const payouts = paymentIntents.data
    .filter(pi => pi.metadata?.type === 'creator_payout')
    .map(pi => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency,
      status: pi.status,
      creatorEmail: pi.metadata?.creatorEmail,
      submissionId: pi.metadata?.submissionId,
      createdAt: new Date(pi.created * 1000).toISOString(),
    }));

  res.json({ data: payouts });
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
    stripePayouts = searchResult.data.map(pi => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency,
      status: pi.status,
      submissionId: pi.metadata?.submissionId,
      createdAt: new Date(pi.created * 1000).toISOString(),
    }));
  } catch {
    // Fallback: list and filter if search not available
    const listResult = await stripe.paymentIntents.list({ limit: 100 });
    stripePayouts = listResult.data
      .filter(pi => pi.metadata?.type === 'creator_payout' && pi.metadata?.creatorEmail === email)
      .map(pi => ({
        id: pi.id,
        amount: pi.amount / 100,
        currency: pi.currency,
        status: pi.status,
        submissionId: pi.metadata?.submissionId,
        createdAt: new Date(pi.created * 1000).toISOString(),
      }));
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

// Start creator Connect Express onboarding — creates account if needed, returns hosted onboarding URL
router.post('/stripe/creator-connect/start', async (req, res): Promise<void> => {
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

  let accountId = profile?.stripeConnectAccountId;

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email,
      });
      accountId = account.id;

      await db
        .insert(userProfilesTable)
        .values({ firebaseUid: uid, stripeConnectAccountId: accountId })
        .onConflictDoUpdate({
          target: userProfilesTable.firebaseUid,
          set: { stripeConnectAccountId: accountId, updatedAt: new Date() },
        });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/settings?stripe_connect=refresh`,
      return_url: `${base}/settings?stripe_connect=complete`,
      type: 'account_onboarding',
    });

    req.log.info({ uid, accountId }, 'Creator Connect onboarding link created');
    res.json({ url: accountLink.url, accountId });
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    if (msg.includes('signed up for Connect')) {
      req.log.warn({ uid }, 'Stripe Connect not enabled on this account');
      res.status(402).json({
        error: 'connect_not_enabled',
        message: 'Stripe Connect is not enabled on this Stripe account.',
        activationUrl: 'https://dashboard.stripe.com/connect/accounts/overview',
      });
      return;
    }
    if (msg.includes('platform-profile') || msg.includes('managing losses')) {
      req.log.warn({ uid }, 'Stripe Connect platform profile incomplete');
      res.status(402).json({
        error: 'platform_profile_incomplete',
        message: 'Your Stripe Connect platform profile is not complete.',
        activationUrl: 'https://dashboard.stripe.com/settings/connect/platform-profile',
      });
      return;
    }
    req.log.error({ err, uid }, 'creator-connect/start failed');
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

export default router;

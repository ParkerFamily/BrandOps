import { Router, type IRouter } from 'express';
import { sql, eq } from 'drizzle-orm';
import { db, creatorsTable, paymentsTable, campaignsTable } from '@workspace/db';
import { getUncachableStripeClient, getStripePublishableKey } from '../stripeClient';
import { logger } from '../lib/logger';

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

export default router;

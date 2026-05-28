import { Router, type IRouter } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '@workspace/db';
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

export default router;

import { createRequire } from 'node:module';
import pg from 'pg';
import Stripe from 'stripe';

const _require = createRequire(import.meta.url);
const serviceAccount = _require('../../artifacts/api-server/src/serviceAccount.json');

const { default: admin } = await import('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
const firestore = admin.firestore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-08-27.basil' as any,
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const PRICE_PLAN: Record<string, string> = {
  'price_1TcYGnL8wN3kCgjXK1ffZG9F': 'starter',
  'price_1TcYGnL8wN3kCgjXLhff0cBU': 'starter',
  'price_1TcYGoL8wN3kCgjXSrhDw5iB': 'growth',
  'price_1TcYGoL8wN3kCgjXo4rvaJq6': 'growth',
};

async function run() {
  console.log('Fetching all users with Stripe data from PostgreSQL...');

  const { rows } = await pool.query<{
    firebase_uid: string;
    stripe_customer_id: string | null;
    stripe_connect_account_id: string | null;
    stripe_connect_onboarded: boolean;
  }>(
    `SELECT firebase_uid, stripe_customer_id, stripe_connect_account_id, stripe_connect_onboarded
     FROM user_profiles
     WHERE stripe_customer_id IS NOT NULL OR stripe_connect_account_id IS NOT NULL`
  );

  console.log(`Found ${rows.length} users to backfill.\n`);

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const uid = row.firebase_uid;
    const fields: Record<string, unknown> = {};

    try {
      // Brand: payment method + subscription
      if (row.stripe_customer_id) {
        fields.stripeCustomerId = row.stripe_customer_id;

        const methods = await stripe.paymentMethods.list({
          customer: row.stripe_customer_id,
          type: 'card',
          limit: 1,
        });

        if (methods.data.length > 0) {
          fields.stripeConnected = true;
          fields.payoutMethodReady = true;
        }

        const [activeSubs, trialingSubs] = await Promise.all([
          stripe.subscriptions.list({ customer: row.stripe_customer_id, status: 'active', limit: 1 }),
          stripe.subscriptions.list({ customer: row.stripe_customer_id, status: 'trialing', limit: 1 }),
        ]);

        const sub = activeSubs.data[0] ?? trialingSubs.data[0];
        if (sub) {
          const priceId = sub.items.data[0]?.price.id ?? '';
          fields.subscriptionPlan = PRICE_PLAN[priceId] ?? 'enterprise';
          fields.subscriptionStatus = sub.status;
          fields.stripeConnected = true;
        }
      }

      // Creator: Connect account
      if (row.stripe_connect_account_id) {
        fields.stripeConnectAccountId = row.stripe_connect_account_id;

        const account = await stripe.accounts.retrieve(row.stripe_connect_account_id);
        if (account.payouts_enabled && account.charges_enabled) {
          fields.stripeConnected = true;
          fields.stripePayoutsEnabled = true;
          fields.payoutMethodReady = true;
        }
      }

      if (Object.keys(fields).length === 0) {
        console.log(`  [skip] ${uid} — nothing to write`);
        skipped++;
        continue;
      }

      await firestore.collection('users').doc(uid).set(fields, { merge: true });
      console.log(`  [ok]   ${uid} →`, JSON.stringify(fields));
      synced++;
    } catch (err: any) {
      console.error(`  [fail] ${uid} — ${err?.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${synced} synced, ${skipped} skipped, ${failed} failed.`);
  await pool.end();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });

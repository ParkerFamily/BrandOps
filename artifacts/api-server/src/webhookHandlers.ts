import { getStripeSync } from './stripeClient';
import { queryFirestoreByField, writeFirestoreDoc } from './firebaseAdmin';
import { logger } from './lib/logger';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // StripeSync handles signature verification + subscription lifecycle events
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Also handle creator payout events — signature already verified above
    try {
      const event = JSON.parse(payload.toString()) as { type: string; data: { object: Record<string, unknown> } };

      if (event.type === 'payment_intent.succeeded') {
        await WebhookHandlers.handlePayoutSucceeded(event.data.object);
      }
    } catch (err) {
      logger.warn({ err }, 'Custom webhook event handling failed (non-fatal)');
    }
  }

  private static async handlePayoutSucceeded(pi: Record<string, unknown>): Promise<void> {
    const metadata = pi.metadata as Record<string, string> | undefined;
    if (metadata?.type !== 'creator_payout') return; // not a creator payout — ignore

    const piId = pi.id as string;
    logger.info({ piId }, 'payment_intent.succeeded — updating Firestore payment to paid');

    const matches = await queryFirestoreByField<{ status: string }>(
      'payments',
      'stripePaymentIntentId',
      piId,
    );

    if (matches.length === 0) {
      logger.warn({ piId }, 'No Firestore payment doc found for payment intent');
      return;
    }

    for (const { id } of matches) {
      await writeFirestoreDoc('payments', id, {
        status: 'paid',
        paidAt: new Date().toISOString(),
      });
      logger.info({ piId, paymentDocId: id }, 'Firestore payment marked paid');
    }
  }
}

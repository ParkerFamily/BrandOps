import { randomUUID } from "node:crypto";
import { notificationForPayout, pushPayloadFromNotification } from "@workspace/notifications";
import { sendOneSignalPush } from "@workspace/notifications/server";
import { getAuth, readFirestoreDoc, writeFirestoreDoc } from "../firebaseAdmin";
import { logger } from "./logger";

type UserNotificationDoc = {
  onesignalPlayerId?: string;
  onesignalSubscriptionId?: string;
};

async function resolveUidByEmail(email: string): Promise<string | null> {
  try {
    const user = await getAuth().getUserByEmail(email.trim().toLowerCase());
    return user.uid;
  } catch {
    return null;
  }
}

async function readSubscriptionIds(uid: string): Promise<string[]> {
  const doc = await readFirestoreDoc<UserNotificationDoc>("users", uid).catch(() => null);
  if (!doc) return [];
  const ids = [doc.onesignalPlayerId, doc.onesignalSubscriptionId]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  return [...new Set(ids)];
}

export type ApiPayoutPaidInput = {
  creatorEmail: string;
  amount: number;
  campaignTitle: string | null;
  paymentId: string | number;
};

/**
 * Writes an in-app notification doc and sends a OneSignal push when a payout
 * is marked paid through the API (Postgres payments route). Mirrors the
 * Firestore-triggered payout notification in firebase/functions.
 */
export async function notifyApiPayoutPaid(input: ApiPayoutPaidInput): Promise<void> {
  try {
    const uid = await resolveUidByEmail(input.creatorEmail);
    if (!uid) {
      logger.warn({ creatorEmail: input.creatorEmail }, "Payout notification skipped — no Firebase user for email");
      return;
    }

    const notification = notificationForPayout(uid, {
      amount: input.amount,
      campaignTitle: input.campaignTitle,
      paymentId: String(input.paymentId),
    });

    await writeFirestoreDoc(`users/${uid}/notifications`, randomUUID(), {
      type: notification.type,
      title: notification.title,
      body: notification.body,
      screen: notification.screen,
      entityType: notification.entityType,
      entityId: notification.entityId,
      campaignDocId: notification.campaignDocId ?? null,
      campaignTitle: notification.campaignTitle ?? null,
      read: false,
      createdAt: new Date(),
    });

    const subscriptionIds = await readSubscriptionIds(uid);
    const push = await sendOneSignalPush({
      recipientUid: uid,
      subscriptionIds,
      heading: notification.title,
      message: notification.body,
      data: pushPayloadFromNotification({
        screen: notification.screen,
        entityType: notification.entityType,
        entityId: notification.entityId,
        campaignDocId: notification.campaignDocId,
        title: notification.title,
        body: notification.body,
      }),
    });

    if (!push.sent) {
      logger.warn({ uid, error: push.error }, "Payout push not delivered");
    }
  } catch (err) {
    logger.warn({ err, creatorEmail: input.creatorEmail }, "Payout notification failed (non-fatal)");
  }
}

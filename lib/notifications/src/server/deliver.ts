import type { NotificationWriteInput, PushPayload } from "../types";
import { pushPayloadFromNotification } from "../routes";
import { sendOneSignalPush } from "./oneSignalPush";

export type FirestoreLike = {
  collection(path: string): {
    doc(id?: string): {
      id: string;
      set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
    };
  };
  doc(path: string): {
    get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  };
};

export type DeliverNotificationInput = NotificationWriteInput & {
  /** Skip push when false (in-app only). Default true. */
  sendPush?: boolean;
};

export type DeliverNotificationResult = {
  notificationId: string;
  pushSent: boolean;
  pushRecipients: number;
};

async function readSubscriptionIds(db: FirestoreLike, uid: string): Promise<string[]> {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) return [];
  const data = snap.data() ?? {};
  const ids = [data.onesignalPlayerId, data.onesignalSubscriptionId]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  return [...new Set(ids)];
}

async function sendPushNotification(input: {
  recipientUid: string;
  subscriptionIds: string[];
  heading: string;
  message: string;
  data: PushPayload;
}): Promise<{ sent: boolean; recipients: number }> {
  const result = await sendOneSignalPush(input);
  if (result.error && result.recipients === 0) {
    console.warn("[BrandOps notifications]", result.error);
  }
  return { sent: result.sent, recipients: result.recipients };
}

export async function deliverNotification(
  db: FirestoreLike,
  input: DeliverNotificationInput
): Promise<DeliverNotificationResult> {
  const ref = db.collection(`users/${input.recipientUid}/notifications`).doc();
  const notificationId = ref.id;
  const createdAt = new Date();

  await ref.set({
    type: input.type,
    title: input.title,
    body: input.body,
    screen: input.screen,
    entityType: input.entityType,
    entityId: input.entityId,
    campaignDocId: input.campaignDocId ?? null,
    campaignTitle: input.campaignTitle ?? null,
    read: false,
    createdAt,
  });

  let pushSent = false;
  let pushRecipients = 0;

  if (input.sendPush !== false) {
    const subscriptionIds = await readSubscriptionIds(db, input.recipientUid);
    const push = await sendPushNotification({
      recipientUid: input.recipientUid,
      subscriptionIds,
      heading: input.title,
      message: input.body,
      data: pushPayloadFromNotification({
        screen: input.screen,
        entityType: input.entityType,
        entityId: input.entityId,
        campaignDocId: input.campaignDocId,
        title: input.title,
        body: input.body,
      }),
    });
    pushSent = push.sent;
    pushRecipients = push.recipients;
  }

  return { notificationId, pushSent, pushRecipients };
}

export async function deliverNotifications(
  db: FirestoreLike,
  inputs: DeliverNotificationInput[]
): Promise<DeliverNotificationResult[]> {
  const results: DeliverNotificationResult[] = [];
  for (const input of inputs) {
    if (!input.recipientUid) continue;
    results.push(await deliverNotification(db, input));
  }
  return results;
}

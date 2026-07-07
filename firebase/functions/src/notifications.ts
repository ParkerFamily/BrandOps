import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as functions from "firebase-functions/v1";

type NotificationWriteInput = {
  recipientUid: string;
  type: string;
  title: string;
  body: string;
  screen: string;
  entityType: string;
  entityId: string;
  campaignDocId?: string | null;
  campaignTitle?: string | null;
};

type SubmissionDoc = {
  campaignOwnerUid?: string;
  creatorFirebaseUid?: string;
  creatorName?: string | null;
  creatorEmail?: string | null;
  campaignDocId?: string;
  campaignTitle?: string;
  status?: string;
  payoutAmount?: number | null;
};

function creatorLabel(name?: string | null): string {
  if (name?.trim()) return name.trim();
  return "A creator";
}

function notificationForCreatorSubmissionSent(
  creatorUid: string,
  ctx: {
    submissionDocId: string;
    campaignDocId?: string | null;
    campaignTitle?: string | null;
  }
): NotificationWriteInput {
  const campaign = ctx.campaignTitle ?? "the campaign";
  return {
    recipientUid: creatorUid,
    type: "submission_sent",
    title: "Submission sent",
    body: `You submitted UGC for ${campaign}. Pending brand review.`,
    screen: "submission",
    entityType: "submission",
    entityId: ctx.submissionDocId,
    campaignDocId: ctx.campaignDocId,
    campaignTitle: ctx.campaignTitle,
  };
}

function notificationForNewSubmission(
  brandOwnerUid: string,
  ctx: {
    submissionDocId: string;
    campaignDocId?: string | null;
    campaignTitle?: string | null;
    creatorName?: string | null;
  }
): NotificationWriteInput {
  const campaign = ctx.campaignTitle ?? "your campaign";
  return {
    recipientUid: brandOwnerUid,
    type: "submission_received",
    title: "New submission",
    body: `${creatorLabel(ctx.creatorName)} submitted UGC for ${campaign}.`,
    screen: "review",
    entityType: "submission",
    entityId: ctx.submissionDocId,
    campaignDocId: ctx.campaignDocId,
    campaignTitle: ctx.campaignTitle,
  };
}

function notificationForSubmissionStatus(
  creatorUid: string,
  status: "approved" | "revision_requested" | "rejected",
  ctx: {
    submissionDocId: string;
    campaignDocId?: string | null;
    campaignTitle?: string | null;
    payoutAmount?: number | null;
  }
): NotificationWriteInput | null {
  const campaign = ctx.campaignTitle ?? "your campaign";

  if (status === "approved") {
    const payout =
      ctx.payoutAmount != null && ctx.payoutAmount > 0
        ? ` · $${ctx.payoutAmount.toLocaleString()} if paid`
        : "";
    return {
      recipientUid: creatorUid,
      type: "submission_approved",
      title: "Submission approved",
      body: `Your video for ${campaign} was approved${payout}.`,
      screen: "submission",
      entityType: "submission",
      entityId: ctx.submissionDocId,
      campaignDocId: ctx.campaignDocId,
      campaignTitle: ctx.campaignTitle,
    };
  }

  if (status === "revision_requested") {
    return {
      recipientUid: creatorUid,
      type: "submission_revision",
      title: "Revision requested",
      body: `Updates needed on your submission for ${campaign}.`,
      screen: "revision",
      entityType: "submission",
      entityId: ctx.submissionDocId,
      campaignDocId: ctx.campaignDocId,
      campaignTitle: ctx.campaignTitle,
    };
  }

  if (status === "rejected") {
    return {
      recipientUid: creatorUid,
      type: "submission_rejected",
      title: "Submission rejected",
      body: `Your submission for ${campaign} was not approved.`,
      screen: "submission",
      entityType: "submission",
      entityId: ctx.submissionDocId,
      campaignDocId: ctx.campaignDocId,
      campaignTitle: ctx.campaignTitle,
    };
  }

  return null;
}

async function readSubscriptionIds(uid: string): Promise<string[]> {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  if (!snap.exists) return [];
  const data = snap.data() ?? {};
  const ids = [data.onesignalPlayerId, data.onesignalSubscriptionId]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  return [...new Set(ids)];
}

async function sendPush(recipientUid: string, input: NotificationWriteInput): Promise<void> {
  const appId = process.env.ONESIGNAL_APP_ID?.trim();
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
  if (!appId || !restApiKey) {
    functions.logger.warn("OneSignal push skipped — set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY on functions");
    return;
  }

  const subscriptionIds = await readSubscriptionIds(recipientUid);
  const data = {
    screen: input.screen,
    entityType: input.entityType,
    entityId: input.entityId,
    campaignDocId: input.campaignDocId ?? undefined,
    title: input.title,
    body: input.body,
  };

  const body: Record<string, unknown> = {
    app_id: appId,
    target_channel: "push",
    headings: { en: input.title },
    contents: { en: input.body },
    data,
    ios_badgeType: "Increase",
    ios_badgeCount: 1,
  };

  if (subscriptionIds.length > 0) {
    body.include_subscription_ids = subscriptionIds;
  } else {
    body.include_aliases = { external_id: [recipientUid] };
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${restApiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    functions.logger.warn("OneSignal push failed", { status: response.status, body: text.slice(0, 500) });
    return;
  }

  try {
    const json = JSON.parse(text) as { recipients?: number; id?: string };
    if ((json.recipients ?? 0) === 0 && !json.id) {
      functions.logger.warn("OneSignal push reached 0 devices", {
        recipientUid,
        subscriptionIds,
        type: input.type,
      });
    }
  } catch {
    functions.logger.info("OneSignal push sent", { recipientUid, type: input.type });
  }
}

async function writeAndPush(input: NotificationWriteInput): Promise<void> {
  if (!input.recipientUid) return;

  const ref = getFirestore().collection(`users/${input.recipientUid}/notifications`).doc();
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
    createdAt: FieldValue.serverTimestamp(),
  });

  await sendPush(input.recipientUid, input);
}

type PaymentDoc = {
  submissionId?: string;
  creatorId?: string;
  creatorFirebaseUid?: string;
  creatorEmail?: string | null;
  creatorName?: string | null;
  campaignId?: string;
  campaignTitle?: string | null;
  amount?: number | null;
  status?: string;
};

function notificationForPayout(
  creatorUid: string,
  ctx: {
    paymentId: string;
    amount: number;
    campaignTitle?: string | null;
  }
): NotificationWriteInput {
  const campaign = ctx.campaignTitle ? ` for ${ctx.campaignTitle}` : "";
  return {
    recipientUid: creatorUid,
    type: "payout_sent",
    title: "Payout sent",
    body: `You received $${ctx.amount.toLocaleString()}${campaign}.`,
    screen: "payout",
    entityType: "payment",
    entityId: ctx.paymentId,
    campaignTitle: ctx.campaignTitle,
  };
}

async function resolveCreatorUid(data: PaymentDoc): Promise<string | null> {
  const direct = data.creatorFirebaseUid ?? data.creatorId;
  if (typeof direct === "string" && direct.trim().length >= 20) return direct.trim();

  const email = data.creatorEmail?.trim().toLowerCase();
  if (!email) return null;

  try {
    const user = await getAuth().getUserByEmail(email);
    return user.uid;
  } catch {
    return null;
  }
}

async function ensurePendingPaymentForApprovedSubmission(
  submissionId: string,
  data: SubmissionDoc
): Promise<void> {
  const db = getFirestore();
  const existing = await db
    .collection("payments")
    .where("submissionId", "==", submissionId)
    .limit(1)
    .get();
  if (!existing.empty) return;

  const creatorAmount = data.payoutAmount != null ? Number(data.payoutAmount) : 0;
  const creatorAmountCents = Math.round(creatorAmount * 100);
  const platformFeeCents = Math.round(creatorAmountCents * 0.1);
  const totalAmount = (creatorAmountCents + platformFeeCents) / 100;
  const platformFeeAmount = platformFeeCents / 100;

  // Created as "pending" — the Stripe payout flow flips it to "paid" later,
  // which is what fires the payout notification (a doc born "paid" would
  // never produce a status transition for onUpdate to see).
  await db.collection("payments").add({
    submissionId,
    creatorId: data.creatorFirebaseUid ?? "",
    creatorFirebaseUid: data.creatorFirebaseUid ?? "",
    campaignId: data.campaignDocId ?? "",
    creatorEmail: data.creatorEmail ?? null,
    creatorName: data.creatorName ?? null,
    campaignTitle: data.campaignTitle ?? null,
    amount: Number.isFinite(creatorAmount) ? creatorAmount : 0,
    creatorAmount: Number.isFinite(creatorAmount) ? creatorAmount : 0,
    platformFeeAmount,
    totalAmount,
    currency: "usd",
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function markSubmissionPaid(submissionId: string): Promise<void> {
  if (!submissionId) return;
  await getFirestore()
    .doc(`submissions/${submissionId}`)
    .set({ status: "paid", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

function submissionContext(submissionId: string, data: SubmissionDoc) {
  return {
    submissionDocId: submissionId,
    campaignDocId: data.campaignDocId ?? null,
    campaignTitle: data.campaignTitle ?? null,
    creatorName: data.creatorName ?? null,
    payoutAmount: data.payoutAmount != null ? Number(data.payoutAmount) : null,
  };
}

export const onSubmissionCreatedNotify = functions.firestore
  .document("submissions/{submissionId}")
  .onCreate(async (snap, context) => {
    const data = snap.data() as SubmissionDoc;
    const ownerUid = data.campaignOwnerUid;
    const creatorUid = data.creatorFirebaseUid;
    const ctx = submissionContext(context.params.submissionId, data);

    if (ownerUid && creatorUid && ownerUid !== creatorUid) {
      await writeAndPush(notificationForNewSubmission(ownerUid, ctx));
    }

    if (creatorUid) {
      await writeAndPush(notificationForCreatorSubmissionSent(creatorUid, ctx));
    }
  });

export const onSubmissionUpdatedNotify = functions.firestore
  .document("submissions/{submissionId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as SubmissionDoc;
    const after = change.after.data() as SubmissionDoc;
    const submissionId = context.params.submissionId;

    if (before.status !== after.status) {
      if (after.status === "approved" && before.status !== "approved") {
        await ensurePendingPaymentForApprovedSubmission(submissionId, after);
      }

      const creatorUid = after.creatorFirebaseUid;
      const status = after.status;
      if (
        creatorUid &&
        (status === "approved" || status === "revision_requested" || status === "rejected")
      ) {
        const input = notificationForSubmissionStatus(
          creatorUid,
          status,
          submissionContext(submissionId, after)
        );
        if (input) await writeAndPush(input);
      }
    }
  });

async function notifyPaymentPaid(paymentId: string, data: PaymentDoc): Promise<void> {
  const creatorUid = await resolveCreatorUid(data);
  const amount = data.amount != null ? Number(data.amount) : 0;

  if (creatorUid && Number.isFinite(amount) && amount > 0) {
    await writeAndPush(
      notificationForPayout(creatorUid, {
        paymentId,
        amount,
        campaignTitle: data.campaignTitle ?? null,
      })
    );
  }

  if (data.submissionId) {
    await markSubmissionPaid(data.submissionId);
  }
}

/** Covers payment docs created directly with status "paid" (no update transition). */
export const onPaymentCreatedNotify = functions.firestore
  .document("payments/{paymentId}")
  .onCreate(async (snap, context) => {
    const data = snap.data() as PaymentDoc;
    if (data.status !== "paid") return;
    await notifyPaymentPaid(context.params.paymentId, data);
  });

export const onPaymentUpdatedNotify = functions.firestore
  .document("payments/{paymentId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as PaymentDoc;
    const after = change.after.data() as PaymentDoc;
    if (before.status === after.status) return;
    if (after.status !== "paid") return;

    await notifyPaymentPaid(context.params.paymentId, after);
  });

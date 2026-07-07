import type { NotificationType, NotificationWriteInput } from "./types";

type SubmissionContext = {
  submissionDocId: string;
  campaignDocId?: string | null;
  campaignTitle?: string | null;
  creatorName?: string | null;
  payoutAmount?: number | null;
};

function creatorLabel(name?: string | null): string {
  if (name?.trim()) return name.trim();
  return "A creator";
}

export function notificationForCreatorSubmissionSent(
  creatorUid: string,
  ctx: SubmissionContext
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

export function notificationForNewSubmission(
  brandOwnerUid: string,
  ctx: SubmissionContext
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

export function notificationForSubmissionStatus(
  creatorUid: string,
  status: "approved" | "revision_requested" | "rejected",
  ctx: SubmissionContext
): NotificationWriteInput | null {
  if (!creatorUid) return null;
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

export function notificationForPayout(
  creatorUid: string,
  input: { amount: number; campaignTitle?: string | null; paymentId?: string }
): NotificationWriteInput {
  const campaign = input.campaignTitle ? ` for ${input.campaignTitle}` : "";
  return {
    recipientUid: creatorUid,
    type: "payout_sent",
    title: "Payout sent",
    body: `You received $${input.amount.toLocaleString()}${campaign}.`,
    screen: "payout",
    entityType: "payment",
    entityId: input.paymentId ?? "payout",
    campaignTitle: input.campaignTitle,
  };
}

export function notificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "submission_received":
      return "New submission";
    case "submission_sent":
      return "Submitted";
    case "submission_approved":
      return "Approved";
    case "submission_revision":
      return "Revision";
    case "submission_rejected":
      return "Rejected";
    case "payout_sent":
      return "Payout";
    case "campaign_invite":
      return "Campaign invite";
    default:
      return "Update";
  }
}

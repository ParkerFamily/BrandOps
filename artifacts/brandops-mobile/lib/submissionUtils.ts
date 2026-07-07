import type { ActivityItemType, Payment, Submission } from "@workspace/api-client-react";

export type PostedStatus = "draft" | "scheduled" | "posted";

export type SubmissionReviewMeta = {
  hook: string;
  postedStatus: PostedStatus;
  postedLabel: string;
};

export type ReviewSubmission = Submission & {
  review: SubmissionReviewMeta;
};

function derivePostedStatus(status: Submission["status"]): PostedStatus {
  if (status === "approved" || status === "paid") return "posted";
  if (status === "revision_requested") return "scheduled";
  return "draft";
}

function derivePostedLabel(status: Submission["status"], platform?: string | null): string {
  const label = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : "Platform";
  if (status === "approved" || status === "paid") return `Live on ${label}`;
  if (status === "revision_requested") return `Revision requested · ${label}`;
  return "Awaiting review";
}

/** First spoken line from Whisper transcript — matches web hook overlay context. */
export function deriveHookOverlay(transcript: string | null | undefined, fallback: string): string {
  const text = transcript?.trim();
  if (!text) return fallback;
  const firstSentence = text.match(/^[^.!?\n]+[.!?]?/)?.[0]?.trim();
  if (firstSentence && firstSentence.length >= 12) return firstSentence;
  if (text.length <= 140) return text;
  return `${text.slice(0, 137).trim()}…`;
}

function submissionHook(submission: Submission): string {
  const notes = submission.notes?.trim();
  if (notes) return notes;
  const campaign = submission.campaign?.title?.trim();
  if (campaign && submission.creator?.name) {
    return `${submission.creator.name} · ${campaign}`;
  }
  if (submission.creator?.name) return `${submission.creator.name} · video pending review`;
  if (campaign) return `${campaign} · submission pending review`;
  return "Video submission pending review";
}

export function toReviewSubmission(submission: Submission): ReviewSubmission {
  return {
    ...submission,
    review: {
      hook: submissionHook(submission),
      postedStatus: derivePostedStatus(submission.status),
      postedLabel: derivePostedLabel(submission.status, submission.campaign?.platform),
    },
  };
}

export function getPendingReviews(submissions: Submission[] | undefined): ReviewSubmission[] {
  return (submissions ?? [])
    .filter((s) => s.status === "pending" || s.status === "reviewing")
    .map(toReviewSubmission);
}

export function activityTypeFromApi(type: ActivityItemType): "approval" | "submission" | "campaign" {
  if (type === "approval") return "approval";
  if (type === "campaign_created") return "campaign";
  return "submission";
}

export function computeWeeklyPulse(payments: Payment[] | undefined): number[] {
  const days = [0, 0, 0, 0, 0, 0, 0];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  for (const payment of payments ?? []) {
    if (payment.status !== "paid") continue;
    const when = new Date(payment.paidAt ?? payment.createdAt);
    if (Number.isNaN(when.getTime()) || when < startOfWeek) continue;
    const dayIndex = (when.getDay() + 6) % 7;
    days[dayIndex] = (days[dayIndex] ?? 0) + 1;
  }

  return days;
}

export function computeSpendThisWeek(payments: Payment[] | undefined): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  return (payments ?? []).reduce((sum, payment) => {
    if (payment.status !== "paid") return sum;
    const when = new Date(payment.paidAt ?? payment.createdAt);
    if (Number.isNaN(when.getTime()) || when < startOfWeek) return sum;
    return sum + payment.amount;
  }, 0);
}

export function computeSpendThisMonth(payments: Payment[] | undefined): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return (payments ?? []).reduce((sum, payment) => {
    if (payment.status !== "paid") return sum;
    const when = new Date(payment.paidAt ?? payment.createdAt);
    if (Number.isNaN(when.getTime()) || when < startOfMonth) return sum;
    return sum + payment.amount;
  }, 0);
}

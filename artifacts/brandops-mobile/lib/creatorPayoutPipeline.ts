import type { CreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import type { FirestorePayment } from "@/lib/creatorPaymentsFirestore";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";
import { formatUsd } from "@/lib/creatorEarningsMetrics";

export type PayoutPipelineStage = {
  key: "pending_review" | "approved" | "processing" | "paid";
  label: string;
  count: number;
  amount: number;
};

function payout(submission: FirestoreSubmission): number {
  const amount = submission.payoutAmount ?? 0;
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function paymentAmount(payment: FirestorePayment): number {
  const amount = payment.creatorAmount ?? payment.amount ?? 0;
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

/** Creator-facing payout pipeline — merges submissions with Firestore payments. */
export function computeCreatorPayoutPipeline(
  submissions: FirestoreSubmission[] | undefined,
  payments: FirestorePayment[] | undefined,
  _payoutSetup: CreatorPayoutSetup | null
): PayoutPipelineStage[] {
  const paymentBySubmission = new Map<string, FirestorePayment>();
  for (const payment of payments ?? []) {
    if (payment.submissionId) paymentBySubmission.set(payment.submissionId, payment);
  }

  const countedPaid = new Set<string>();
  const countedProcessing = new Set<string>();

  let pendingReview = 0;
  let pendingReviewAmount = 0;
  let approved = 0;
  let approvedAmount = 0;
  let processing = 0;
  let processingAmount = 0;
  let paid = 0;
  let paidAmount = 0;

  for (const payment of payments ?? []) {
    const amount = paymentAmount(payment);
    if (payment.status === "paid") {
      paid += 1;
      paidAmount += amount;
      if (payment.submissionId) countedPaid.add(payment.submissionId);
    } else if (payment.status === "processing") {
      processing += 1;
      processingAmount += amount;
      if (payment.submissionId) countedProcessing.add(payment.submissionId);
    }
  }

  for (const submission of submissions ?? []) {
    const amount = payout(submission);
    const payment = paymentBySubmission.get(submission.id);

    if (submission.status === "pending" || submission.status === "reviewing") {
      pendingReview += 1;
      pendingReviewAmount += amount;
      continue;
    }

    if (submission.status === "paid" || payment?.status === "paid") {
      if (!countedPaid.has(submission.id)) {
        paid += 1;
        paidAmount += payment ? paymentAmount(payment) : amount;
      }
      continue;
    }

    if (payment?.status === "processing") continue;

    if (submission.status === "approved") {
      if (payment?.status === "pending" || !payment) {
        approved += 1;
        approvedAmount += payment ? paymentAmount(payment) : amount;
      }
    }
  }

  return [
    { key: "pending_review", label: "Pending review", count: pendingReview, amount: pendingReviewAmount },
    { key: "approved", label: "Approved", count: approved, amount: approvedAmount },
    { key: "processing", label: "Processing", count: processing, amount: processingAmount },
    { key: "paid", label: "Paid", count: paid, amount: paidAmount },
  ];
}

export function formatPipelineAmount(stage: PayoutPipelineStage): string {
  if (stage.count === 0) return "—";
  return `${formatUsd(stage.amount)} · ${stage.count}`;
}

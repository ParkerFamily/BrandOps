import type { FirestorePayment } from "@/lib/creatorPaymentsFirestore";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

export type CreatorEarningsSnapshot = {
  totalEarned: number;
  earnedThisMonth: number;
  pendingPayout: number;
  approvedCount: number;
  pendingCount: number;
  revisionCount: number;
  paidCount: number;
};

function payoutForSubmission(submission: FirestoreSubmission): number {
  const amount = submission.payoutAmount ?? 0;
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function paymentAmount(payment: FirestorePayment): number {
  const amount = payment.creatorAmount ?? payment.amount ?? 0;
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function computeCreatorEarnings(
  submissions: FirestoreSubmission[] | undefined,
  payments?: FirestorePayment[]
): CreatorEarningsSnapshot {
  const rows = submissions ?? [];
  const paymentRows = payments ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidSubmissionIds = new Set(
    paymentRows.filter((p) => p.status === "paid" && p.submissionId).map((p) => p.submissionId)
  );

  let totalEarned = 0;
  let earnedThisMonth = 0;
  let pendingPayout = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  let revisionCount = 0;
  let paidCount = 0;

  for (const payment of paymentRows) {
    if (payment.status !== "paid") continue;
    const amount = paymentAmount(payment);
    totalEarned += amount;
    paidCount += 1;
    const paidAt = payment.paidAt ?? payment.createdAt;
    if (paidAt >= monthStart) earnedThisMonth += amount;
  }

  for (const submission of rows) {
    const payout = payoutForSubmission(submission);

    if (submission.status === "paid" && !paidSubmissionIds.has(submission.id)) {
      totalEarned += payout;
      paidCount += 1;
      if (submission.createdAt >= monthStart) earnedThisMonth += payout;
      continue;
    }

    if (submission.status === "approved" && !paidSubmissionIds.has(submission.id)) {
      approvedCount += 1;
      pendingPayout += payout;
    } else if (submission.status === "pending" || submission.status === "reviewing") {
      pendingCount += 1;
    } else if (submission.status === "revision_requested") {
      revisionCount += 1;
    }
  }

  return {
    totalEarned,
    earnedThisMonth,
    pendingPayout,
    approvedCount,
    pendingCount,
    revisionCount,
    paidCount,
  };
}

export function formatUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

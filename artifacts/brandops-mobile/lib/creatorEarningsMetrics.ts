import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

export type CreatorEarningsSnapshot = {
  totalEarned: number;
  earnedThisMonth: number;
  pendingPayout: number;
  approvedCount: number;
  pendingCount: number;
  revisionCount: number;
};

function payoutForSubmission(submission: FirestoreSubmission): number {
  const amount = submission.payoutAmount ?? 0;
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function computeCreatorEarnings(submissions: FirestoreSubmission[] | undefined): CreatorEarningsSnapshot {
  const rows = submissions ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalEarned = 0;
  let earnedThisMonth = 0;
  let pendingPayout = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  let revisionCount = 0;

  for (const submission of rows) {
    const payout = payoutForSubmission(submission);

    if (submission.status === "approved") {
      approvedCount += 1;
      totalEarned += payout;
      if (submission.createdAt >= monthStart) {
        earnedThisMonth += payout;
      }
    } else if (submission.status === "pending") {
      pendingCount += 1;
      pendingPayout += payout;
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
  };
}

export function formatUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

export type CreatorPaymentStatus = {
  expectedPayout: number;
  approvalLabel: string;
  paymentLabel: string;
  hasSubmission: boolean;
};

function statusLabels(status: FirestoreSubmission["status"]): { approval: string; payment: string } {
  switch (status) {
    case "pending":
      return { approval: "Pending review", payment: "Not yet" };
    case "approved":
      return { approval: "Approved", payment: "Queued" };
    case "revision_requested":
      return { approval: "Revision needed", payment: "On hold" };
    case "rejected":
      return { approval: "Not approved", payment: "—" };
    default:
      return { approval: "Unknown", payment: "—" };
  }
}

export function buildCreatorPaymentStatus(
  submissions: FirestoreSubmission[],
  campaignDocId: string,
  defaultPayout: number
): CreatorPaymentStatus {
  const mine = submissions
    .filter((s) => s.campaignDocId === campaignDocId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  if (!mine) {
    return {
      hasSubmission: false,
      expectedPayout: defaultPayout,
      approvalLabel: "Not submitted",
      paymentLabel: "—",
    };
  }

  const labels = statusLabels(mine.status);
  return {
    hasSubmission: true,
    expectedPayout: mine.payoutAmount ?? defaultPayout,
    approvalLabel: labels.approval,
    paymentLabel: labels.payment,
  };
}

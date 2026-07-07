import { useMemo } from "react";
import type { FirestoreCampaign } from "@/lib/campaignsFirestore";
import { useFirestoreCampaigns } from "@/lib/campaignsFirestore";
import { getBrandReviewQueue, getPendingFirestoreReviews } from "@/lib/firestoreReviewAdapter";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";
import { computeCampaignSubmissionStats, filterSubmissionsForBrandOwner } from "@/lib/submissionsFirestore";
import {
  brandPaymentChargeAmount,
  filterPaymentsForBrandOwner,
  isPaymentPaid,
  type FirestorePayment,
} from "@/lib/creatorPaymentsFirestore";
import { showEmptyLoading } from "@/lib/realtimeLoading";
import { useFirestoreOwnerSubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { useFirestoreBrandPayments } from "@/lib/useFirestoreBrandPayments";
import { useAuth } from "@/contexts/AuthContext";

export type BrandRecentActivity = {
  id: string;
  type: "submission" | "approval" | "campaign";
  message: string;
  createdAt: Date;
};

export type BrandWorkspaceMetrics = {
  activeCampaigns: number;
  /** First-time submissions awaiting brand review (matches web “pending review” stat). */
  pendingReview: number;
  /** Items in the mobile review queue (pending + revision requested). */
  reviewQueueCount: number;
  approvedVideos: number;
  totalSpend: number;
  totalProcessing: number;
  totalPending: number;
  spendThisWeek: number;
  spendThisMonth: number;
  totalCreators: number;
  totalBudget: number;
  budgetUsed: number;
  budgetUsedPercent: number;
  weeklyPulse: number[];
  pendingReviews: ReturnType<typeof getPendingFirestoreReviews>;
  recentActivity: BrandRecentActivity[];
};


function startOfWeek(d = new Date()): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return start;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function creatorLabel(submission: FirestoreSubmission): string {
  if (submission.creatorName?.trim()) return submission.creatorName.trim();
  if (submission.creatorEmail) {
    const local = submission.creatorEmail.split("@")[0];
    if (local) return local.replace(/[._]/g, " ");
  }
  return "Creator";
}

function buildRecentActivity(
  submissions: FirestoreSubmission[],
  campaignsByDocId: Map<string, FirestoreCampaign>
): BrandRecentActivity[] {
  const items: BrandRecentActivity[] = [];

  for (const s of [...submissions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    const name = creatorLabel(s);
    const campaignTitle = s.campaignTitle || campaignsByDocId.get(s.campaignDocId)?.title || "Campaign";

    if (s.status === "pending" || s.status === "reviewing") {
      items.push({
        id: s.id,
        type: "submission",
        message: `${name} submitted to ${campaignTitle}`,
        createdAt: s.createdAt,
      });
    } else if (s.status === "approved") {
      items.push({
        id: `${s.id}-approved`,
        type: "approval",
        message: `Approved ${name}'s video · ${campaignTitle}`,
        createdAt: s.createdAt,
      });
    } else if (s.status === "revision_requested") {
      items.push({
        id: `${s.id}-revision`,
        type: "submission",
        message: `Revision requested · ${name} · ${campaignTitle}`,
        createdAt: s.createdAt,
      });
    } else if (s.status === "rejected") {
      items.push({
        id: `${s.id}-rejected`,
        type: "submission",
        message: `Rejected ${name}'s submission · ${campaignTitle}`,
        createdAt: s.createdAt,
      });
    }
  }

  return items.slice(0, 6);
}

export function computeBrandWorkspaceMetrics(
  campaigns: FirestoreCampaign[],
  submissions: FirestoreSubmission[],
  reviewerUid?: string | null,
  payments: FirestorePayment[] = []
): BrandWorkspaceMetrics {
  const campaignsByDocId = new Map(campaigns.map((c) => [c.firestoreDocId, c]));
  const ownedCampaignIds = campaigns.map((c) => c.firestoreDocId);
  const scopedSubmissions =
    reviewerUid != null
      ? filterSubmissionsForBrandOwner(submissions, reviewerUid, ownedCampaignIds)
      : submissions;
  const scopedPayments =
    reviewerUid != null
      ? filterPaymentsForBrandOwner(
          payments,
          reviewerUid,
          ownedCampaignIds,
          scopedSubmissions.map((s) => s.id),
          campaigns.map((c) => c.title)
        )
      : payments;
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const weeklyPulse = [0, 0, 0, 0, 0, 0, 0];

  let pendingReview = 0;
  let approvedVideos = 0;
  let totalSpend = 0;
  let totalProcessing = 0;
  let totalPending = 0;
  let spendThisWeek = 0;
  let spendThisMonth = 0;
  const creatorIds = new Set<string>();

  for (const s of scopedSubmissions) {
    if (s.creatorFirebaseUid) creatorIds.add(s.creatorFirebaseUid);

    if (s.status === "pending" || s.status === "reviewing") pendingReview += 1;

    if (s.status === "approved" || s.status === "paid") approvedVideos += 1;
  }

  for (const p of scopedPayments) {
    const charge = brandPaymentChargeAmount(p);
    if (p.status === "processing") totalProcessing += charge;
    else if (p.status === "pending") totalPending += charge;
    if (!isPaymentPaid(p)) continue;
    const when = p.paidAt ?? p.createdAt;
    totalSpend += charge;
    if (when >= monthStart) spendThisMonth += charge;
    if (when >= weekStart) {
      spendThisWeek += charge;
      const dayIndex = (when.getDay() + 6) % 7;
      weeklyPulse[dayIndex] = (weeklyPulse[dayIndex] ?? 0) + charge;
    }
  }

  const pendingReviews =
    reviewerUid != null
      ? getBrandReviewQueue(scopedSubmissions, campaignsByDocId, reviewerUid)
      : getPendingFirestoreReviews(scopedSubmissions, campaignsByDocId);
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.totalBudget ?? 0), 0);
  const budgetUsed = totalSpend;

  return {
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    pendingReview,
    reviewQueueCount: pendingReviews.length,
    approvedVideos,
    totalSpend,
    totalProcessing,
    totalPending,
    spendThisWeek,
    spendThisMonth,
    totalCreators: creatorIds.size,
    totalBudget,
    budgetUsed,
    budgetUsedPercent: totalBudget > 0 ? (budgetUsed / totalBudget) * 100 : 0,
    weeklyPulse,
    pendingReviews,
    recentActivity: buildRecentActivity(scopedSubmissions, campaignsByDocId),
  };
}

export function enrichCampaignWithSubmissions(
  campaign: FirestoreCampaign,
  submissions: FirestoreSubmission[]
): FirestoreCampaign & { pendingCount: number; approvedCount: number; totalSpent: number } {
  const related = submissions.filter((s) => s.campaignDocId === campaign.firestoreDocId);
  const stats = computeCampaignSubmissionStats(related, campaign.payoutPerVideo ?? 0);
  const needsReview = stats.pending + stats.revision;

  return {
    ...campaign,
    pendingCount: needsReview,
    approvedCount: stats.approved,
    creatorCount: stats.assignedCreators || campaign.creatorCount,
    totalSpent: stats.budgetUsed,
  };
}

export function useBrandWorkspaceMetrics() {
  const { authUid } = useAuth();
  const {
    campaigns,
    loading: campaignsLoading,
    error: campaignsError,
    refetch,
  } = useFirestoreCampaigns({ ownerOnly: true });
  const campaignDocIds = useMemo(() => campaigns.map((c) => c.firestoreDocId), [campaigns]);
  const { submissions, loading: submissionsLoading, error: submissionsError } = useFirestoreOwnerSubmissions(
    null,
    campaignDocIds
  );
  const { payments, loading: paymentsLoading } = useFirestoreBrandPayments();

  const metrics = useMemo(
    () => computeBrandWorkspaceMetrics(campaigns, submissions, authUid, payments),
    [campaigns, submissions, authUid, payments]
  );

  return {
    campaigns,
    submissions,
    payments,
    metrics,
    loading:
      showEmptyLoading(campaignsLoading, campaigns.length) ||
      showEmptyLoading(submissionsLoading, submissions.length) ||
      showEmptyLoading(paymentsLoading, payments.length),
    error: campaignsError ?? submissionsError,
    refetch,
  };
}

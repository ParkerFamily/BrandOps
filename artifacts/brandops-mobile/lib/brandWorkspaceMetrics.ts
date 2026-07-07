import { useMemo } from "react";
import type { FirestoreCampaign } from "@/lib/campaignsFirestore";
import { useFirestoreCampaigns } from "@/lib/campaignsFirestore";
import { getPendingFirestoreReviews } from "@/lib/firestoreReviewAdapter";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";
import { computeCampaignSubmissionStats } from "@/lib/submissionsFirestore";
import { showEmptyLoading } from "@/lib/realtimeLoading";
import { useFirestoreOwnerSubmissions } from "@/lib/useFirestoreOwnerSubmissions";

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

function submissionPayout(submission: FirestoreSubmission, campaign?: FirestoreCampaign): number {
  if (submission.payoutAmount != null && submission.payoutAmount > 0) return submission.payoutAmount;
  return campaign?.payoutPerVideo ?? 0;
}

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

    if (s.status === "pending") {
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
  submissions: FirestoreSubmission[]
): BrandWorkspaceMetrics {
  const campaignsByDocId = new Map(campaigns.map((c) => [c.firestoreDocId, c]));
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const weeklyPulse = [0, 0, 0, 0, 0, 0, 0];

  let pendingReview = 0;
  let approvedVideos = 0;
  let totalSpend = 0;
  let spendThisWeek = 0;
  let spendThisMonth = 0;
  const creatorIds = new Set<string>();

  for (const s of submissions) {
    if (s.creatorFirebaseUid) creatorIds.add(s.creatorFirebaseUid);
    const campaign = campaignsByDocId.get(s.campaignDocId);
    const payout = submissionPayout(s, campaign);

    if (s.status === "pending") pendingReview += 1;

    if (s.status === "approved") {
      approvedVideos += 1;
      totalSpend += payout;
      if (s.createdAt >= monthStart) spendThisMonth += payout;
      if (s.createdAt >= weekStart) {
        spendThisWeek += payout;
        const dayIndex = (s.createdAt.getDay() + 6) % 7;
        weeklyPulse[dayIndex] = (weeklyPulse[dayIndex] ?? 0) + payout;
      }
    }
  }

  const pendingReviews = getPendingFirestoreReviews(submissions, campaignsByDocId);
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.totalBudget ?? 0), 0);
  const budgetUsed = campaigns.reduce((sum, campaign) => {
    const related = submissions.filter((s) => s.campaignDocId === campaign.firestoreDocId && s.status === "approved");
    return sum + related.reduce((acc, s) => acc + submissionPayout(s, campaign), 0);
  }, 0);

  return {
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    pendingReview,
    reviewQueueCount: pendingReviews.length,
    approvedVideos,
    totalSpend,
    spendThisWeek,
    spendThisMonth,
    totalCreators: creatorIds.size,
    totalBudget,
    budgetUsed,
    budgetUsedPercent: totalBudget > 0 ? (budgetUsed / totalBudget) * 100 : 0,
    weeklyPulse,
    pendingReviews,
    recentActivity: buildRecentActivity(submissions, campaignsByDocId),
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
  const {
    campaigns,
    loading: campaignsLoading,
    error: campaignsError,
    refetch,
  } = useFirestoreCampaigns({ ownerOnly: true });
  const { submissions, loading: submissionsLoading, error: submissionsError } = useFirestoreOwnerSubmissions();

  const metrics = useMemo(
    () => computeBrandWorkspaceMetrics(campaigns, submissions),
    [campaigns, submissions]
  );

  return {
    campaigns,
    submissions,
    metrics,
    loading: showEmptyLoading(campaignsLoading, campaigns.length) || showEmptyLoading(submissionsLoading, submissions.length),
    error: campaignsError ?? submissionsError,
    refetch,
  };
}

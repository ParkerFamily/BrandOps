import type { FirestoreCampaign } from "@/lib/campaignsFirestore";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";
import type { ReviewSubmission } from "@/lib/submissionUtils";
import { toReviewSubmission } from "@/lib/submissionUtils";

function creatorDisplayName(submission: FirestoreSubmission): string {
  if (submission.creatorEmail) {
    const local = submission.creatorEmail.split("@")[0];
    if (local) return local.replace(/[._]/g, " ");
  }
  return `Creator ${submission.creatorFirebaseUid.slice(0, 6)}`;
}

export type FirestoreReviewSubmission = ReviewSubmission & {
  firestoreDocId: string;
  storagePath: string | null;
  submissionType: "upload" | "link";
  creatorFirebaseUid: string;
  campaignOwnerUid: string;
};

export function firestoreSubmissionToReview(
  submission: FirestoreSubmission,
  campaign?: FirestoreCampaign | null
): FirestoreReviewSubmission {
  const payout = campaign?.payoutPerVideo ?? 0;
  const platform = campaign?.platform ?? "tiktok";
  const synthetic = toReviewSubmission({
    id: hashSubmissionId(submission.id),
    campaignId: campaign?.id ?? 0,
    creatorId: hashSubmissionId(submission.creatorFirebaseUid),
    videoUrl: submission.videoUrl,
    thumbnailUrl: null,
    status: submission.status === "revision_requested" ? "revision_requested" : submission.status,
    notes: null,
    payoutAmount: payout,
    campaign: campaign
      ? {
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          totalBudget: campaign.totalBudget,
          payoutPerVideo: campaign.payoutPerVideo,
          platform: campaign.platform,
          niche: campaign.niche,
          status: campaign.status,
          deadline:
            campaign.deadline && typeof campaign.deadline === "object" && "getTime" in campaign.deadline
              ? (campaign.deadline as Date).toISOString()
              : String(campaign.deadline ?? new Date().toISOString()),
          inspirationUrls: campaign.inspirationUrls ?? null,
          creatorCount: campaign.creatorCount,
          approvedCount: campaign.approvedCount,
          pendingCount: campaign.pendingCount,
          totalSpent: campaign.totalSpent,
          createdAt:
            campaign.createdAt && typeof campaign.createdAt === "object" && "getTime" in campaign.createdAt
              ? (campaign.createdAt as Date).toISOString()
              : String(campaign.createdAt),
          updatedAt:
            campaign.updatedAt && typeof campaign.updatedAt === "object" && "getTime" in campaign.updatedAt
              ? (campaign.updatedAt as Date).toISOString()
              : String(campaign.updatedAt),
        }
      : {
          id: 0,
          title: submission.campaignTitle,
          description: "",
          totalBudget: 0,
          payoutPerVideo: payout,
          platform,
          niche: "General",
          status: "active",
          deadline: new Date().toISOString(),
          inspirationUrls: null,
          creatorCount: 0,
          approvedCount: 0,
          pendingCount: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
    creator: {
      id: hashSubmissionId(submission.creatorFirebaseUid),
      name: creatorDisplayName(submission),
      email: submission.creatorEmail ?? "",
      handle: submission.creatorEmail ? `@${submission.creatorEmail.split("@")[0]}` : "@creator",
      platform,
      niche: "General",
      followerCount: 0,
      engagementRate: 0,
      approvedVideos: 0,
      totalEarnings: 0,
      status: "active",
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.createdAt.toISOString(),
    },
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.createdAt.toISOString(),
  });

  return {
    ...synthetic,
    firestoreDocId: submission.id,
    storagePath: submission.storagePath,
    submissionType: submission.submissionType,
    creatorFirebaseUid: submission.creatorFirebaseUid,
    campaignOwnerUid: submission.campaignOwnerUid,
  };
}

function hashSubmissionId(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

export function getPendingFirestoreReviews(
  submissions: FirestoreSubmission[],
  campaignsByDocId: Map<string, FirestoreCampaign>
): FirestoreReviewSubmission[] {
  return submissions
    .filter((s) => s.status === "pending" || s.status === "revision_requested")
    .map((s) => firestoreSubmissionToReview(s, campaignsByDocId.get(s.campaignDocId) ?? null));
}

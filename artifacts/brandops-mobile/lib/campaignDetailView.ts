import type { FirestoreCampaign } from "@/lib/campaignsFirestore";
import { canReviewSubmissions, isOperatorRole } from "@/lib/roleExperience";
import type { UserRole } from "@/lib/types";

export function isCampaignOwner(
  campaign: Pick<FirestoreCampaign, "ownerFirebaseUid" | "ownerEmail">,
  authUid: string | null | undefined,
  authEmail: string | null | undefined
): boolean {
  if (authUid && campaign.ownerFirebaseUid && campaign.ownerFirebaseUid === authUid) return true;
  if (authEmail && campaign.ownerEmail) {
    return campaign.ownerEmail.toLowerCase() === authEmail.toLowerCase();
  }
  return false;
}

/** Creator task card vs brand companion dashboard on campaign detail. */
export function shouldShowCreatorCampaignView(
  role: UserRole | null | undefined,
  authUid: string | null | undefined,
  authEmail: string | null | undefined,
  campaign: FirestoreCampaign,
  viewParam?: string | string[]
): boolean {
  const view = Array.isArray(viewParam) ? viewParam[0] : viewParam;
  if (view === "brand") return false;
  if (view === "creator") return true;

  // Creators (and any non-reviewer role) always get the task/upload experience.
  if (!canReviewSubmissions(role)) return true;

  // Brand operators see the dashboard by default; creator task is a preview.
  if (isOperatorRole(role) && isCampaignOwner(campaign, authUid, authEmail)) {
    return false;
  }

  return true;
}

export function campaignDetailHref(
  campaign: Pick<FirestoreCampaign, "firestoreDocId" | "id">,
  options?: { creator?: boolean }
): string {
  const base = `/campaign/${campaign.firestoreDocId}`;
  return options?.creator ? `${base}?view=creator` : base;
}

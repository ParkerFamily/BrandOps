import type { Campaign, Payment, Submission } from "@workspace/api-client-react";

export type CampaignRow = Campaign & { ownerFirebaseUid?: string | null };

/** Production legacy API returns global seed rows with no ownerFirebaseUid. */
export function isLegacyUnscopedWorkspace(campaigns: CampaignRow[] | undefined): boolean {
  if (!campaigns?.length) return false;
  return !campaigns.some((c) => Boolean(c.ownerFirebaseUid));
}

export function filterOwnedCampaigns(
  campaigns: CampaignRow[] | undefined,
  authUid: string | null | undefined
): CampaignRow[] {
  if (!campaigns?.length || !authUid) return [];
  // Hide global seed rows from legacy production API (no ownerFirebaseUid on any row).
  if (isLegacyUnscopedWorkspace(campaigns)) return [];
  return campaigns.filter((c) => c.ownerFirebaseUid === authUid);
}

/** Strip unscoped demo rows from raw API list responses before React Query caches them. */
export function scopeCampaignListResponse(
  data: unknown,
  authUid: string | null | undefined
): unknown {
  if (!Array.isArray(data)) return data;
  return filterOwnedCampaigns(data as CampaignRow[], authUid);
}

export function ownedCampaignIdSet(
  campaigns: CampaignRow[] | undefined,
  authUid: string | null | undefined
): Set<number> {
  return new Set(filterOwnedCampaigns(campaigns, authUid).map((c) => c.id));
}

export function filterOwnedSubmissions(
  submissions: Submission[] | undefined,
  ownedIds: Set<number>
): Submission[] {
  if (!submissions?.length || ownedIds.size === 0) return [];
  return submissions.filter((s) => ownedIds.has(s.campaignId));
}

export function filterOwnedPayments(
  payments: Payment[] | undefined,
  ownedIds: Set<number>
): Payment[] {
  if (!payments?.length || ownedIds.size === 0) return [];
  return payments.filter((p) => ownedIds.has(p.campaignId));
}

export const EMPTY_DASHBOARD_STATS = {
  totalSpend: 0,
  activeCampaigns: 0,
  pendingSubmissions: 0,
  approvedVideos: 0,
  totalCreators: 0,
  totalPayouts: 0,
  campaignBudgetUsed: 0,
} as const;

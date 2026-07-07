import type { QueryClient } from "@tanstack/react-query";
import { getListCampaignsQueryKey } from "@workspace/api-client-react";
import type { Campaign } from "@workspace/api-client-react";
import {
  bootstrapUserFirestoreCampaigns,
  pruneStaleFirestoreCampaigns,
  repairOwnedCampaignsFromFirestore,
} from "@/lib/campaignFirestoreSync";
import { getFirebase } from "@/lib/firebase";
import { isLegacyUnscopedWorkspace, type CampaignRow } from "@/lib/workspaceFilter";

/** React Query key prefixes for all workspace-scoped API data. */
export const WORKSPACE_QUERY_PREFIXES = [
  "/api/dashboard/stats",
  "/api/dashboard/activity",
  "/api/campaigns",
  "/api/submissions",
  "/api/payments",
  "/api/creators",
] as const;

export async function invalidateWorkspaceQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    WORKSPACE_QUERY_PREFIXES.map((prefix) => queryClient.invalidateQueries({ queryKey: [prefix] }))
  );
}

/** Refetch API data and prune Firestore docs removed in Postgres — never re-upsert from mobile. */
export async function refreshWorkspace(queryClient: QueryClient, authUid: string | null): Promise<void> {
  if (!authUid) return;

  const email = getFirebase()?.auth.currentUser?.email ?? null;
  await bootstrapUserFirestoreCampaigns(authUid, email);
  await repairOwnedCampaignsFromFirestore(authUid, email, authUid).catch(() => {});

  await invalidateWorkspaceQueries(queryClient);
  await queryClient.refetchQueries({ queryKey: getListCampaignsQueryKey() });

  const campaigns = queryClient.getQueryData(getListCampaignsQueryKey()) as Campaign[] | undefined;
  if (!isLegacyUnscopedWorkspace(campaigns as CampaignRow[] | undefined)) {
    await pruneStaleFirestoreCampaigns(authUid, campaigns ?? []);
  }
}

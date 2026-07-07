import { useMemo } from "react";
import { useListCampaigns } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { workspaceApiQuery } from "@/lib/apiQueries";
import type { ListCampaignsParams } from "@workspace/api-client-react";
import {
  filterOwnedCampaigns,
  isLegacyUnscopedWorkspace,
  ownedCampaignIdSet,
  type CampaignRow,
} from "@/lib/workspaceFilter";

export function useWorkspaceCampaigns(params?: ListCampaignsParams) {
  const { authUid, isAuthenticated } = useAuth();
  const api = workspaceApiQuery(isAuthenticated);
  const query = useListCampaigns(params, { query: api.campaigns(params) });

  const raw = query.data as CampaignRow[] | undefined;
  const legacyUnscoped = useMemo(() => isLegacyUnscopedWorkspace(raw), [raw]);
  const campaigns = useMemo(() => filterOwnedCampaigns(raw, authUid), [raw, authUid]);
  const ownedIds = useMemo(() => ownedCampaignIdSet(raw, authUid), [raw, authUid]);

  return {
    ...query,
    campaigns,
    ownedIds,
    legacyUnscoped,
  };
}

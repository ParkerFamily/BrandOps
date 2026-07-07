import { useMemo } from "react";
import { useListSubmissions, type ListSubmissionsParams } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { workspaceApiQuery } from "@/lib/apiQueries";
import { filterOwnedSubmissions } from "@/lib/workspaceFilter";
import { useWorkspaceCampaigns } from "@/lib/useWorkspaceCampaigns";

export function useWorkspaceSubmissions(params?: ListSubmissionsParams) {
  const { isAuthenticated } = useAuth();
  const api = workspaceApiQuery(isAuthenticated);
  const query = useListSubmissions(params, { query: api.submissions(params) });
  const { ownedIds } = useWorkspaceCampaigns();

  const submissions = useMemo(
    () => filterOwnedSubmissions(query.data, ownedIds),
    [query.data, ownedIds]
  );

  return { ...query, submissions };
}

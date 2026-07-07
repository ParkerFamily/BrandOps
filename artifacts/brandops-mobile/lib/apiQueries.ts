import {
  getGetCampaignQueryKey,
  getGetCampaignStatsQueryKey,
  getGetDashboardStatsQueryKey,
  getGetRecentActivityQueryKey,
  getGetSubmissionQueryKey,
  getListCampaignsQueryKey,
  getListCreatorsQueryKey,
  getListPaymentsQueryKey,
  getListSubmissionsQueryKey,
  type ListCampaignsParams,
  type ListSubmissionsParams,
} from "@workspace/api-client-react";
import { isApiConfigured } from "@/lib/apiClient";

function ready(authenticated: boolean) {
  return isApiConfigured() && authenticated;
}

/** Workspace API queries — only fetch when signed in (avoids stale/unscoped cache). */
export function workspaceApiQuery(authenticated: boolean) {
  return {
    dashboardStats: () => ({ enabled: ready(authenticated), queryKey: getGetDashboardStatsQueryKey() }),
    recentActivity: () => ({ enabled: ready(authenticated), queryKey: getGetRecentActivityQueryKey() }),
    campaigns: (params?: ListCampaignsParams) => ({
      enabled: ready(authenticated),
      queryKey: getListCampaignsQueryKey(params),
    }),
    payments: () => ({ enabled: ready(authenticated), queryKey: getListPaymentsQueryKey() }),
    submissions: (params?: ListSubmissionsParams) => ({
      enabled: ready(authenticated),
      queryKey: getListSubmissionsQueryKey(params),
    }),
    creators: () => ({ enabled: ready(authenticated), queryKey: getListCreatorsQueryKey() }),
    campaign: (id: number) => ({
      enabled: ready(authenticated) && Number.isFinite(id),
      queryKey: getGetCampaignQueryKey(id),
    }),
    campaignStats: (id: number) => ({
      enabled: ready(authenticated) && Number.isFinite(id),
      queryKey: getGetCampaignStatsQueryKey(id),
    }),
    submission: (id: number) => ({
      enabled: ready(authenticated) && Number.isFinite(id),
      queryKey: getGetSubmissionQueryKey(id),
    }),
  };
}

/** @deprecated Prefer workspaceApiQuery(isAuthenticated) so data is scoped to the signed-in user. */
export const apiQuery = workspaceApiQuery(true);

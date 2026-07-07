import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListCampaignsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

/** Drop cached API data when the signed-in user changes or signs out. */
export function AuthQuerySync() {
  const queryClient = useQueryClient();
  const { authUid, loading } = useAuth();
  const prevUid = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;

    if (prevUid.current !== undefined && prevUid.current !== authUid) {
      queryClient.removeQueries();
    } else if (prevUid.current === undefined && authUid) {
      // Drop any stale unfiltered campaign cache from a previous bundle/session.
      void queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
    }

    prevUid.current = authUid;
  }, [authUid, loading, queryClient]);

  return null;
}

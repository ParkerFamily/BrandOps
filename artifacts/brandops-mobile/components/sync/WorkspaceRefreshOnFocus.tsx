import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isApiConfigured } from "@/lib/apiClient";
import { refreshWorkspace } from "@/lib/workspaceSync";

const MIN_SYNC_MS = 4000;

/** Refetch workspace API after web edits — prune stale Firestore only (no re-create). */
export function WorkspaceRefreshOnFocus() {
  const queryClient = useQueryClient();
  const { authUid, isAuthenticated } = useAuth();
  const lastSyncAt = useRef(0);
  const syncing = useRef(false);

  const sync = useCallback(() => {
    if (!isApiConfigured() || !isAuthenticated || !authUid || syncing.current) return;

    const now = Date.now();
    if (now - lastSyncAt.current < MIN_SYNC_MS) return;

    syncing.current = true;
    lastSyncAt.current = now;
    void refreshWorkspace(queryClient, authUid).finally(() => {
      syncing.current = false;
    });
  }, [authUid, isAuthenticated, queryClient]);

  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => sub.remove();
  }, [sync]);

  return null;
}

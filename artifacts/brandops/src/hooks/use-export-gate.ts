import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";

const FREE_LIMIT = 3;

function storageKey(uid: string) {
  return `brandops_exports_${uid}`;
}

function getUsed(uid: string): number {
  try {
    return parseInt(localStorage.getItem(storageKey(uid)) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function incrementUsed(uid: string): number {
  const next = getUsed(uid) + 1;
  try { localStorage.setItem(storageKey(uid), String(next)); } catch { /* noop */ }
  return next;
}

export function useExportGate() {
  const { user } = useAuth();
  const { canRemoveWatermark, isLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const uid = user?.uid ?? "";
  const exportsUsed = uid ? getUsed(uid) : 0;
  const exportsRemaining = Math.max(0, FREE_LIMIT - exportsUsed);
  const isSubscribed = canRemoveWatermark;

  const tryExport = useCallback(
    (videoUrl: string): boolean => {
      if (isSubscribed) {
        window.open(videoUrl, "_blank", "noreferrer");
        return true;
      }
      if (exportsUsed < FREE_LIMIT) {
        const used = incrementUsed(uid);
        window.open(videoUrl, "_blank", "noreferrer");
        if (used >= FREE_LIMIT) {
          setTimeout(() => setShowUpgradeModal(true), 800);
        }
        return true;
      }
      setShowUpgradeModal(true);
      return false;
    },
    [isSubscribed, exportsUsed, uid],
  );

  return {
    isSubscribed,
    isLoading,
    exportsUsed,
    exportsRemaining,
    freeLimit: FREE_LIMIT,
    tryExport,
    showUpgradeModal,
    setShowUpgradeModal,
  };
}

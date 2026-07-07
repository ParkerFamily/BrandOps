import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isFirebaseConfigured } from "@/lib/env";
import { subscribeBrandPayments, type FirestorePayment } from "@/lib/creatorPaymentsFirestore";
import { showEmptyLoading } from "@/lib/realtimeLoading";

export function useFirestoreBrandPayments() {
  const { isAuthenticated, authUid } = useAuth();
  const [payments, setPayments] = useState<FirestorePayment[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured() || !isAuthenticated || !authUid) {
      setPayments([]);
      setReady(true);
      return;
    }

    setReady(false);
    const unsub = subscribeBrandPayments((rows) => {
      setPayments(rows);
      setReady(true);
      if (__DEV__) {
        const paid = rows.filter((p) => p.status === "paid").length;
        const processing = rows.filter((p) => p.status === "processing").length;
        console.log("[BrandOps brand payments]", rows.length, "total,", paid, "paid,", processing, "processing");
      }
    });

    return () => unsub();
  }, [isAuthenticated, authUid]);

  return {
    payments,
    loading: showEmptyLoading(!ready, payments.length),
  };
}

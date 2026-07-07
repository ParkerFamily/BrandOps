import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isFirebaseConfigured } from "@/lib/env";
import { subscribeCreatorPayments, type FirestorePayment } from "@/lib/creatorPaymentsFirestore";
import { showEmptyLoading } from "@/lib/realtimeLoading";

export function useFirestoreCreatorPayments() {
  const { authUid, authEmail, isAuthenticated } = useAuth();
  const [payments, setPayments] = useState<FirestorePayment[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured() || !isAuthenticated || !authUid) {
      setPayments([]);
      setReady(true);
      return;
    }

    setReady(false);
    const unsub = subscribeCreatorPayments(authUid, authEmail, (rows) => {
      setPayments(rows);
      setReady(true);
    });

    return () => unsub();
  }, [authUid, authEmail, isAuthenticated]);

  return {
    payments,
    loading: showEmptyLoading(!ready, payments.length),
  };
}

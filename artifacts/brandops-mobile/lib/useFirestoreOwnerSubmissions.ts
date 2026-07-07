import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isFirebaseConfigured } from "@/lib/env";
import { showEmptyLoading } from "@/lib/realtimeLoading";
import {
  subscribeMySubmissions,
  subscribeOwnerSubmissions,
  type FirestoreSubmission,
} from "@/lib/submissionsFirestore";

export function useFirestoreOwnerSubmissions(campaignDocId?: string | null) {
  const { authUid, isAuthenticated } = useAuth();
  const [submissions, setSubmissions] = useState<FirestoreSubmission[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured() || !isAuthenticated || !authUid) {
      setSubmissions([]);
      setReady(true);
      setError(null);
      return;
    }

    setReady(false);
    setError(null);

    const unsub = subscribeOwnerSubmissions(authUid, campaignDocId ?? undefined, (rows) => {
      setSubmissions(rows);
      setReady(true);
      if (__DEV__) {
        console.log("[BrandOps submissions]", rows.length, campaignDocId ?? "all");
      }
    });

    return () => unsub();
  }, [authUid, isAuthenticated, campaignDocId]);

  return {
    submissions,
    loading: showEmptyLoading(!ready, submissions.length),
    error,
  };
}

export function useFirestoreMySubmissions() {
  const { authUid, isAuthenticated } = useAuth();
  const [submissions, setSubmissions] = useState<FirestoreSubmission[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured() || !isAuthenticated || !authUid) {
      setSubmissions([]);
      setReady(true);
      return;
    }

    setReady(false);
    const unsub = subscribeMySubmissions(authUid, (rows) => {
      setSubmissions(rows);
      setReady(true);
    });

    return () => unsub();
  }, [authUid, isAuthenticated]);

  return {
    submissions,
    loading: showEmptyLoading(!ready, submissions.length),
  };
}

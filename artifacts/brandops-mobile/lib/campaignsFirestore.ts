import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Campaign } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebase } from "@/lib/firebase";
import { isFirebaseConfigured } from "@/lib/env";
import { logCampaignOwnershipDebug, resolveWorkspaceId } from "@/lib/campaignOwnership";
import {
  bootstrapUserFirestoreCampaigns,
  loadOwnedCampaignDocsFast,
  repairOwnedCampaignsFromFirestore,
  type CampaignSyncDiagnostics,
} from "@/lib/campaignFirestoreSync";
import { subscribeUserCampaignDocIds } from "@/lib/campaignIndex";
import { campaignDetailHref } from "@/lib/campaignDetailView";
import { showEmptyLoading } from "@/lib/realtimeLoading";

export type FirestoreCampaign = Campaign & {
  firestoreDocId: string;
  ownerFirebaseUid?: string | null;
  ownerEmail?: string | null;
};

function toDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

function nestedString(data: DocumentData | undefined, key: string): string | null {
  if (!data || typeof data !== "object") return null;
  const value = data[key];
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function pickString(data: DocumentData, ...keys: string[]): string {
  for (const key of keys) {
    const direct = nestedString(data, key);
    if (direct) return direct;
  }
  return "";
}

function pickFromAi(data: DocumentData, ...keys: string[]): string {
  const ai = data.aiData as DocumentData | undefined;
  if (!ai) return "";
  return pickString(ai, ...keys);
}

function inferTitle(data: DocumentData): string {
  const direct = pickString(data, "title", "name", "productName", "campaignTitle");
  if (direct) return direct;
  const fromAi = pickFromAi(data, "title", "name", "campaignTitle");
  if (fromAi) return fromAi;
  const brief = pickString(data, "description", "brief") || pickFromAi(data, "creatorBrief", "brief", "description");
  if (brief) {
    const firstLine = brief.split("\n")[0]?.trim();
    if (firstLine && firstLine.length < 120) return firstLine;
  }
  return "Untitled campaign";
}

function pickNumber(data: DocumentData, fallback: number, ...keys: string[]): number {
  for (const key of keys) {
    const raw = data[key];
    if (raw != null && !Number.isNaN(Number(raw))) return Number(raw);
  }
  return fallback;
}

function pickPlatform(data: DocumentData): Campaign["platform"] {
  const raw = (
    pickString(data, "platform", "primaryPlatform") || pickFromAi(data, "platform", "primaryPlatform")
  ).toLowerCase();
  if (raw.includes("instagram")) return "instagram";
  if (raw.includes("youtube")) return "youtube";
  return "tiktok";
}

function pickStatus(data: DocumentData): Campaign["status"] {
  const raw = (pickString(data, "status") || pickFromAi(data, "status")).toLowerCase();
  if (raw === "active" || raw === "draft" || raw === "completed" || raw === "paused") return raw;
  return "draft";
}

function campaignNumericId(docId: string, data: DocumentData): number {
  const raw = data.id ?? docId;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const asString = String(raw);
  if (/^\d+$/.test(asString)) return Number(asString);
  let hash = 0;
  for (let i = 0; i < asString.length; i += 1) {
    hash = (hash * 31 + asString.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

export function mapCampaignDoc(docId: string, data: DocumentData): FirestoreCampaign {
  const ai = data.aiData as DocumentData | undefined;
  return {
    firestoreDocId: docId,
    id: campaignNumericId(docId, data),
    title: inferTitle(data),
    description:
      pickString(data, "description", "brief", "summary") ||
      pickFromAi(data, "creatorBrief", "brief", "description") ||
      "",
    totalBudget: pickNumber(data, pickNumber(ai ?? {}, 0, "totalBudget", "budget"), "totalBudget", "budget"),
    payoutPerVideo: pickNumber(data, pickNumber(ai ?? {}, 0, "payoutPerVideo", "payout"), "payoutPerVideo", "payout"),
    platform: pickPlatform(data),
    niche: pickString(data, "niche", "creatorType") || pickFromAi(data, "niche", "creatorType") || "General",
    status: pickStatus(data),
    deadline: toDate(data.deadline ?? data.suggestedDeadline ?? ai?.suggestedDeadline),
    inspirationUrls: (data.inspirationUrls as string | null | undefined) ?? null,
    creatorCount: pickNumber(data, 0, "creatorCount"),
    approvedCount: pickNumber(data, 0, "approvedCount"),
    pendingCount: pickNumber(data, 0, "pendingCount"),
    totalSpent: pickNumber(data, 0, "totalSpent"),
    ownerFirebaseUid:
      pickString(data, "ownerFirebaseUid", "owner_firebase_uid", "ownerId", "brandUid", "workspaceId") || null,
    ownerEmail: pickString(data, "ownerEmail", "authorEmail") || null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function sortCampaigns(rows: FirestoreCampaign[]): FirestoreCampaign[] {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

type LoadContext = {
  uid: string;
  email: string | null;
  workspaceId: string;
};

async function buildLoadContext(uid: string, authEmail: string | null | undefined): Promise<LoadContext> {
  const email = authEmail?.trim() || null;
  const firebase = getFirebase();
  let workspaceId = uid;
  if (firebase) {
    try {
      const userSnap = await getDoc(doc(firebase.db, "users", uid));
      workspaceId = resolveWorkspaceId(uid, userSnap.exists() ? userSnap.data() : null);
    } catch {
      workspaceId = uid;
    }
  }
  return { uid, email, workspaceId };
}

function snapshotToCampaignMap(snap: { docs: { id: string; data: () => DocumentData }[] }): Map<string, DocumentData> {
  const merged = new Map<string, DocumentData>();
  for (const d of snap.docs) merged.set(d.id, d.data());
  return merged;
}

function docsToCampaigns(docs: { id: string; data: DocumentData }[], uid: string): FirestoreCampaign[] {
  return sortCampaigns(docs.map((d) => mapCampaignDoc(d.id, d.data)));
}

export type { CampaignSyncDiagnostics };

/** Pull `campaigns` collection for the signed-in brand user (repair = full sync). */
export async function fetchOwnedCampaignsFromFirestore(
  db: Firestore,
  ctx: LoadContext,
  options?: { repair?: boolean }
): Promise<{ campaigns: FirestoreCampaign[]; diagnostics: CampaignSyncDiagnostics }> {
  const tokenEmail = getFirebase()?.auth.currentUser?.email?.trim() ?? null;

  if (options?.repair) {
    const diagnostics = await repairOwnedCampaignsFromFirestore(ctx.uid, ctx.email, ctx.workspaceId);
    const docs = await loadOwnedCampaignDocsFast(db, ctx);
    return {
      campaigns: docsToCampaigns(docs, ctx.uid),
      diagnostics,
    };
  }

  const docs = await loadOwnedCampaignDocsFast(db, ctx);
  return {
    campaigns: docsToCampaigns(docs, ctx.uid),
    diagnostics: {
      indexedIds: docs.length,
      linkedByEmail: 0,
      linkedOrphans: 0,
      apiSynced: 0,
      loadedDocs: docs.length,
      authEmail: ctx.email,
      tokenEmail,
    },
  };
}

function mergeCampaignMaps(
  primary: Map<string, DocumentData>,
  extra: { id: string; data: DocumentData }[]
): FirestoreCampaign[] {
  const merged = new Map(primary);
  for (const d of extra) merged.set(d.id, d.data);
  return sortCampaigns([...merged.entries()].map(([id, data]) => mapCampaignDoc(id, data)));
}

const repairedUids = new Set<string>();

type UseFirestoreCampaignsOptions = {
  ownerOnly?: boolean;
  status?: Campaign["status"];
};

export function useFirestoreCampaigns(options: UseFirestoreCampaignsOptions = {}) {
  const { ownerOnly, status } = options;
  const { authUid, authEmail, isAuthenticated, loading: authLoading } = useAuth();

  const [campaigns, setCampaigns] = useState<FirestoreCampaign[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncDiagnostics, setSyncDiagnostics] = useState<CampaignSyncDiagnostics | null>(null);
  const ctxRef = useRef<LoadContext | null>(null);

  const refetch = useCallback(async () => {
    const firebase = getFirebase();
    if (!firebase || !authUid) return;

    if (ownerOnly) {
      const ctx = await buildLoadContext(authUid, authEmail);
      ctxRef.current = ctx;
      try {
        const diagnostics = await repairOwnedCampaignsFromFirestore(ctx.uid, ctx.email, ctx.workspaceId);
        const docs = await loadOwnedCampaignDocsFast(firebase.db, ctx);
        setCampaigns(docsToCampaigns(docs, ctx.uid));
        setSyncDiagnostics(diagnostics);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to sync campaigns");
      }
      return;
    }

    if (status) {
      try {
        const snap = await getDocs(query(collection(firebase.db, "campaigns"), where("status", "==", status)));
        setCampaigns(sortCampaigns(snap.docs.map((d) => mapCampaignDoc(d.id, d.data()))));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load campaigns");
      }
    }
  }, [ownerOnly, status, authUid, authEmail]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReady(true);
      setError("Firebase is not configured.");
      return;
    }

    const firebase = getFirebase();
    if (!firebase) {
      setReady(true);
      setError("Firebase is not available.");
      return;
    }

    if (ownerOnly) {
      if (authLoading && !authUid) return;

      if (!authUid || !isAuthenticated) {
        ctxRef.current = null;
        setCampaigns([]);
        setReady(true);
        setError(null);
        return;
      }

      let cancelled = false;
      let unsubCampaigns = () => {};
      let unsubIndex = () => {};
      let ownerMap = new Map<string, DocumentData>();
      let indexedExtras: { id: string; data: DocumentData }[] = [];
      let loadCtx: LoadContext | null = null;

      const applyCampaigns = () => {
        if (cancelled) return;
        setCampaigns(mergeCampaignMaps(ownerMap, indexedExtras));
        setReady(true);
      };

      const applyReadableCampaigns = (snap: { docs: { id: string; data: () => DocumentData }[] }) => {
        if (!loadCtx) return;
        // Match web brand dashboard: show every campaign Firestore rules allow (no extra owner filter).
        ownerMap = snapshotToCampaignMap(snap);
        logCampaignOwnershipDebug(
          "readable campaigns",
          loadCtx.uid,
          loadCtx.workspaceId,
          [...ownerMap.entries()].map(([id, data]) => ({ id, data }))
        );
        applyCampaigns();
      };

      const refreshIndexedExtras = async (ids: string[]) => {
        if (cancelled || ids.length === 0) {
          indexedExtras = [];
          applyCampaigns();
          return;
        }

        const missing = ids.filter((id) => !ownerMap.has(id));
        if (missing.length === 0) {
          indexedExtras = [];
          applyCampaigns();
          return;
        }

        const fetched: { id: string; data: DocumentData }[] = [];
        await Promise.all(
          missing.map(async (docId) => {
            try {
              const snap = await getDoc(doc(firebase.db, "campaigns", docId));
              if (snap.exists()) fetched.push({ id: snap.id, data: snap.data() });
            } catch {
              // ignore — readable listener is primary
            }
          })
        );
        if (cancelled) return;
        indexedExtras = fetched;
        applyCampaigns();
      };

      void (async () => {
        setReady(false);
        setError(null);
        const ctx = await buildLoadContext(authUid, authEmail);
        ctxRef.current = ctx;
        loadCtx = ctx;

        void bootstrapUserFirestoreCampaigns(ctx.uid, ctx.email).catch(() => {});

        unsubCampaigns = onSnapshot(
          collection(firebase.db, "campaigns"),
          (snap) => {
            applyReadableCampaigns(snap);

            if (!repairedUids.has(authUid) && ownerMap.size === 0) {
              repairedUids.add(authUid);
              void repairOwnedCampaignsFromFirestore(ctx.uid, ctx.email, ctx.workspaceId)
                .then((diagnostics) => {
                  if (!cancelled) setSyncDiagnostics(diagnostics);
                })
                .catch(() => {});
            }
          },
          (err) => {
            if (cancelled) return;
            setError(err.message);
            setReady(true);
          }
        );

        unsubIndex = subscribeUserCampaignDocIds(firebase.db, authUid, (ids) => {
          void refreshIndexedExtras(ids);
        });
      })();

      return () => {
        cancelled = true;
        unsubCampaigns();
        unsubIndex();
      };
    }

    if (status) {
      setReady(false);
      const q = query(collection(firebase.db, "campaigns"), where("status", "==", status));
      const unsub = onSnapshot(
        q,
        (snap) => {
          setCampaigns(sortCampaigns(snap.docs.map((d) => mapCampaignDoc(d.id, d.data()))));
          setReady(true);
        },
        (err) => {
          setError(err.message);
          setReady(true);
        }
      );
      return () => unsub();
    }

    setReady(false);
    const q = query(collection(firebase.db, "campaigns"), where("status", "==", "active"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCampaigns(sortCampaigns(snap.docs.map((d) => mapCampaignDoc(d.id, d.data()))));
        setReady(true);
      },
      (err) => {
        setError(err.message);
        setReady(true);
      }
    );
    return () => unsub();
  }, [ownerOnly, status, authUid, authEmail, isAuthenticated, authLoading]);

  const loading = showEmptyLoading(!ready, campaigns.length);

  return { campaigns, loading, error, refetch, syncDiagnostics };
}

export function useFirestoreCampaign(docId: string | null | undefined) {
  const [campaign, setCampaign] = useState<FirestoreCampaign | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId || !isFirebaseConfigured()) {
      setCampaign(null);
      setReady(true);
      return;
    }

    const firebase = getFirebase();
    if (!firebase) {
      setReady(true);
      setError("Firebase is not available.");
      return;
    }

    setReady(false);
    setError(null);

    const ref = doc(firebase.db, "campaigns", docId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setCampaign(null);
        } else {
          setCampaign(mapCampaignDoc(snap.id, snap.data()));
        }
        setReady(true);
      },
      (err) => {
        setError(err.message);
        setReady(true);
      }
    );

    return () => unsub();
  }, [docId]);

  return { campaign, loading: showEmptyLoading(!ready, campaign ? 1 : 0), error };
}

export async function getFirestoreCampaign(docId: string): Promise<FirestoreCampaign | null> {
  const firebase = getFirebase();
  if (!firebase) return null;

  const snap = await getDoc(doc(firebase.db, "campaigns", docId));
  if (!snap.exists()) return null;
  return mapCampaignDoc(snap.id, snap.data());
}

export function campaignDetailPath(
  campaign: Pick<FirestoreCampaign, "firestoreDocId" | "id">,
  options?: { creator?: boolean }
): string {
  return campaignDetailHref(campaign, options);
}

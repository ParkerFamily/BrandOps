import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  or,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import type { Campaign } from "@workspace/api-client-react";
import { getApiAuthHeaders, getApiBaseUrl } from "@/lib/apiClient";
import { getFirebase } from "@/lib/firebase";
import { matchesCampaignOwner, ownerLookupValues, readOwnerField, type CampaignOwnerField } from "@/lib/campaignOwnership";
import { filterOwnedCampaigns, type CampaignRow } from "@/lib/workspaceFilter";
import { registerCampaignDocId, readUserCampaignDocIds } from "@/lib/campaignIndex";

type CampaignSyncInput = Pick<
  Campaign,
  | "id"
  | "title"
  | "description"
  | "totalBudget"
  | "payoutPerVideo"
  | "platform"
  | "niche"
  | "status"
  | "deadline"
> & {
  inspirationUrls?: string | null;
  creatorCount?: number;
  approvedCount?: number;
  pendingCount?: number;
  totalSpent?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export function ownedCampaignsQuery(db: Firestore, uid: string) {
  return query(
    collection(db, "campaigns"),
    or(
      where("ownerFirebaseUid", "==", uid),
      where("owner_firebase_uid", "==", uid),
      where("ownerId", "==", uid),
      where("workspaceId", "==", uid),
      where("brandUid", "==", uid)
    )
  );
}

const OWNER_UID_FIELDS = ["ownerFirebaseUid", "owner_firebase_uid", "ownerId", "workspaceId", "brandUid"] as const;

export type CampaignSyncDiagnostics = {
  indexedIds: number;
  linkedByEmail: number;
  linkedOrphans: number;
  apiSynced: number;
  loadedDocs: number;
  authEmail: string | null;
  tokenEmail: string | null;
};

/** Firestore security rules compare ownerEmail to auth.token.email — always prefer the token. */
function resolveTokenEmail(fallback?: string | null): string | null {
  const tokenEmail = getFirebase()?.auth.currentUser?.email?.trim();
  if (tokenEmail) return tokenEmail;
  const text = fallback?.trim();
  return text || null;
}

function pickString(data: DocumentData | undefined, ...keys: string[]): string | null {
  if (!data) return null;
  for (const key of keys) {
    const value = data[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function deriveCampaignFieldsFromDoc(existing: DocumentData): DocumentData {
  const ai = (existing.aiData as DocumentData | undefined) ?? {};
  const title =
    pickString(existing, "title", "name", "campaignTitle") ??
    pickString(ai, "title", "name", "campaignTitle") ??
    "Untitled campaign";
  const description =
    pickString(existing, "description", "brief", "summary") ??
    pickString(ai, "creatorBrief", "brief", "description") ??
    "";
  const statusRaw = (pickString(existing, "status") ?? pickString(ai, "status") ?? "draft").toLowerCase();
  const status = ["active", "draft", "completed", "paused"].includes(statusRaw) ? statusRaw : "draft";
  const platformRaw = (pickString(existing, "platform") ?? pickString(ai, "platform") ?? "tiktok").toLowerCase();
  const platform = platformRaw.includes("instagram")
    ? "instagram"
    : platformRaw.includes("youtube")
      ? "youtube"
      : "tiktok";

  return {
    title,
    description,
    status,
    platform,
    niche: pickString(existing, "niche", "creatorType") ?? pickString(ai, "niche", "creatorType") ?? "General",
    totalBudget: existing.totalBudget ?? ai.totalBudget ?? ai.budget ?? 0,
    payoutPerVideo: existing.payoutPerVideo ?? ai.payoutPerVideo ?? ai.payout ?? 0,
    deadline: existing.deadline ?? ai.suggestedDeadline ?? null,
    createdAt: existing.createdAt ?? serverTimestamp(),
  };
}

/** Stamp owner fields on a Firestore-native campaign (same as web Campaigns bootstrap). */
export async function normalizeFirestoreCampaignDoc(
  uid: string,
  email: string | null | undefined,
  docId: string,
  patch?: Record<string, unknown>
): Promise<void> {
  const firebase = getFirebase();
  if (!firebase || !docId) return;

  const ref = doc(firebase.db, "campaigns", docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const existing = snap.data() ?? {};
  if (readOwnerField(existing, "ownerFirebaseUid") === uid) {
    await registerCampaignDocId(uid, docId);
    return;
  }

  const derived = deriveCampaignFieldsFromDoc(existing);

  const tokenEmail = resolveTokenEmail(email);

  await setDoc(
    ref,
    {
      ...derived,
      ownerFirebaseUid: uid,
      owner_firebase_uid: uid,
      ownerId: uid,
      workspaceId: uid,
      brandUid: uid,
      ownerEmail: tokenEmail,
      authorEmail: tokenEmail,
      createdBy: uid,
      updatedAt: serverTimestamp(),
      ...patch,
    },
    { merge: true }
  );

  await registerCampaignDocId(uid, docId);
}

/** Link indexed + readable Firestore docs to the signed-in user (mirrors web bootstrap). */
export async function bootstrapUserFirestoreCampaigns(
  uid: string,
  email: string | null | undefined
): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) return;

  const ids = new Set<string>();
  const userSnap = await getDoc(doc(firebase.db, "users", uid));
  const indexed = userSnap.data()?.campaignDocIds;
  if (Array.isArray(indexed)) {
    for (const id of indexed) {
      if (id) ids.add(String(id));
    }
  }

  for (const id of await queryOwnedCampaignDocIds(firebase.db, uid, uid)) {
    ids.add(id);
  }

  await Promise.all(
    [...ids].map(async (id) => {
      try {
        await normalizeFirestoreCampaignDoc(uid, email, id);
      } catch (err) {
        if (__DEV__) console.warn("[BrandOps campaigns] normalize failed:", id, err);
      }
    })
  );
}

export async function queryOwnedCampaignDocIds(
  db: Firestore,
  uid: string,
  workspaceId = uid
): Promise<string[]> {
  const ids = new Set<string>();
  const lookupValues = ownerLookupValues(uid, workspaceId);

  await Promise.all(
    OWNER_UID_FIELDS.flatMap((field) =>
      lookupValues.map(async (value) => {
        try {
          const snap = await getDocs(query(collection(db, "campaigns"), where(field, "==", value)));
          for (const d of snap.docs) ids.add(d.id);
        } catch (err) {
          if (__DEV__) console.warn("[BrandOps campaigns] owner query failed:", field, value, err);
        }
      })
    )
  );

  try {
    const snap = await getDocs(ownedCampaignsQuery(db, uid));
    for (const d of snap.docs) ids.add(d.id);
  } catch {
    // OR query may need an index — individual field queries above are the fallback.
  }

  return [...ids];
}

export async function mergeOwnedCampaignDocs(
  db: Firestore,
  ctx: { uid: string; email: string | null; workspaceId: string },
  merged: Map<string, DocumentData>
): Promise<void> {
  const lookupValues = ownerLookupValues(ctx.uid, ctx.workspaceId);

  await Promise.all(
    OWNER_UID_FIELDS.flatMap((field) =>
      lookupValues.map(async (value) => {
        try {
          const snap = await getDocs(query(collection(db, "campaigns"), where(field, "==", value)));
          for (const d of snap.docs) merged.set(d.id, d.data());
        } catch (err) {
          if (__DEV__) console.warn("[BrandOps campaigns] merge query failed:", field, value, err);
        }
      })
    )
  );

  const emailCandidates = [...new Set([ctx.email, resolveTokenEmail(ctx.email)].filter(Boolean))] as string[];
  for (const email of emailCandidates) {
    for (const field of ["ownerEmail", "authorEmail"] as const) {
      try {
        const snap = await getDocs(query(collection(db, "campaigns"), where(field, "==", email)));
        for (const d of snap.docs) merged.set(d.id, d.data());
      } catch (err) {
        if (__DEV__) console.warn("[BrandOps campaigns] email query failed:", field, err);
      }
    }
  }

  const indexedIds = await readUserCampaignDocIds(ctx.uid);
  await Promise.all(
    indexedIds.map(async (docId) => {
      try {
        const snap = await getDoc(doc(db, "campaigns", docId));
        if (snap.exists()) merged.set(snap.id, snap.data());
      } catch (err) {
        if (__DEV__) console.warn("[BrandOps campaigns] indexed doc read failed:", docId, err);
      }
    })
  );
}

export async function scanReadableOwnedCampaignDocs(
  db: Firestore,
  ctx: { uid: string; email: string | null; workspaceId: string },
  merged: Map<string, DocumentData>
): Promise<void> {
  if (merged.size > 0) return;

  try {
    const snap = await getDocs(collection(db, "campaigns"));
    for (const d of snap.docs) {
      if (matchesCampaignOwner(d.data(), ctx.uid, ctx.workspaceId, ctx.email)) {
        merged.set(d.id, d.data());
      }
    }
  } catch (err) {
    if (__DEV__) console.warn("[BrandOps campaigns] readable scan failed:", err);
  }
}

/** Mirror Postgres/API campaigns into Firestore `campaigns/{id}` for mobile queries. */
export async function syncCampaignToFirestore(
  uid: string,
  campaign: CampaignSyncInput
): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) return;

  await setDoc(
    doc(firebase.db, "campaigns", String(campaign.id)),
    {
      id: campaign.id,
      ownerFirebaseUid: uid,
      owner_firebase_uid: uid,
      ownerId: uid,
      workspaceId: uid,
      title: campaign.title,
      description: campaign.description,
      totalBudget: campaign.totalBudget,
      payoutPerVideo: campaign.payoutPerVideo,
      platform: campaign.platform,
      niche: campaign.niche,
      status: campaign.status,
      deadline: campaign.deadline instanceof Date ? campaign.deadline.toISOString() : campaign.deadline,
      inspirationUrls: campaign.inspirationUrls ?? null,
      creatorCount: campaign.creatorCount ?? 0,
      approvedCount: campaign.approvedCount ?? 0,
      pendingCount: campaign.pendingCount ?? 0,
      totalSpent: campaign.totalSpent ?? 0,
      createdAt: campaign.createdAt?.toISOString?.() ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function syncCampaignsToFirestore(uid: string, campaigns: CampaignSyncInput[]): Promise<void> {
  await Promise.all(campaigns.map((c) => syncCampaignToFirestore(uid, c)));
}

/** Claim or normalize ownership on docs the signed-in user can read (silent — no UI). */
export async function claimCampaignOwnership(
  uid: string,
  email: string | null | undefined,
  workspaceId: string,
  docId: string,
  data: DocumentData
): Promise<boolean> {
  if (readOwnerField(data, "ownerFirebaseUid")) {
    return matchesCampaignOwner(data, uid, workspaceId, email);
  }

  const firebase = getFirebase();
  if (!firebase) return false;

  const authorEmail = readOwnerField(data, "authorEmail" as CampaignOwnerField) ?? readOwnerField(data, "ownerEmail" as CampaignOwnerField);
  if (authorEmail && email && authorEmail.toLowerCase() !== email.toLowerCase()) {
    return false;
  }

  await setDoc(
    doc(firebase.db, "campaigns", docId),
    {
      ownerFirebaseUid: uid,
      owner_firebase_uid: uid,
      ownerId: uid,
      workspaceId,
      ownerEmail: resolveTokenEmail(email),
      authorEmail: resolveTokenEmail(email) ?? authorEmail ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await registerCampaignDocId(uid, docId);

  if (__DEV__) {
    console.log("[BrandOps campaigns] claimed ownership on doc", docId);
  }

  return true;
}

/** Normalize ownership fields on owned docs missing ownerFirebaseUid. */
export async function ensureCampaignOwnershipFields(
  uid: string,
  workspaceId: string,
  docId: string,
  data: DocumentData,
  email?: string | null
): Promise<void> {
  if (readOwnerField(data, "ownerFirebaseUid")) return;
  if (matchesCampaignOwner(data, uid, workspaceId, email)) {
    await claimCampaignOwnership(uid, email, workspaceId, docId, data);
  }
}

/** Attach readable Firestore campaigns to the signed-in user (fixes web/mobile uid drift). */
export async function linkReadableCampaignsToUser(
  uid: string,
  email: string | null | undefined,
  workspaceId: string
): Promise<{ linkedByEmail: number; linkedOrphans: number }> {
  const firebase = getFirebase();
  const tokenEmail = resolveTokenEmail(email);
  if (!firebase || !tokenEmail) return { linkedByEmail: 0, linkedOrphans: 0 };

  const normalizedEmail = tokenEmail.toLowerCase();
  let linkedByEmail = 0;
  let linkedOrphans = 0;

  const snap = await getDocs(collection(firebase.db, "campaigns"));
  for (const d of snap.docs) {
    const data = d.data();
    const ownerUid = readOwnerField(data, "ownerFirebaseUid");
    const ownerEmail = readOwnerField(data, "ownerEmail" as CampaignOwnerField);

    if (ownerUid === uid) {
      await registerCampaignDocId(uid, d.id);
      continue;
    }

    if (ownerEmail && ownerEmail.toLowerCase() === normalizedEmail) {
      try {
        await setDoc(
          doc(firebase.db, "campaigns", d.id),
          {
            ownerFirebaseUid: uid,
            owner_firebase_uid: uid,
            ownerId: uid,
            workspaceId,
            ownerEmail: tokenEmail,
            authorEmail: tokenEmail,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await registerCampaignDocId(uid, d.id);
        linkedByEmail += 1;
        if (__DEV__) console.log("[BrandOps campaigns] linked doc by email", d.id);
      } catch (err) {
        if (__DEV__) console.warn("[BrandOps campaigns] email link failed", d.id, err);
      }
      continue;
    }

    if (ownerEmail && ownerEmail.toLowerCase() !== normalizedEmail) continue;

    if (!ownerEmail) {
      try {
        await setDoc(
          doc(firebase.db, "campaigns", d.id),
          {
            ownerFirebaseUid: uid,
            owner_firebase_uid: uid,
            ownerId: uid,
            workspaceId,
            ownerEmail: tokenEmail,
            authorEmail: tokenEmail,
            createdBy: uid,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await registerCampaignDocId(uid, d.id);
        linkedOrphans += 1;
        if (__DEV__) console.log("[BrandOps campaigns] linked doc to user", d.id);
      } catch (err) {
        if (__DEV__) console.warn("[BrandOps campaigns] link failed", d.id, err);
      }
    }
  }

  return { linkedByEmail, linkedOrphans };
}

/** Re-link indexed Firestore doc IDs to the signed-in user (silent). */
export async function repairUserCampaignIndex(
  uid: string,
  email: string | null | undefined,
  workspaceId: string
): Promise<void> {
  const ids = await readUserCampaignDocIds(uid);
  if (ids.length === 0) return;

  await Promise.all(ids.map((docId) => claimCampaignOwnership(uid, email, workspaceId, docId, {})));
}

/** Heavy repair path — pull-to-refresh or first-time empty state only. */
export async function repairOwnedCampaignsFromFirestore(
  uid: string,
  email: string | null | undefined,
  workspaceId: string
): Promise<CampaignSyncDiagnostics> {
  const indexedIds = await readUserCampaignDocIds(uid);
  const tokenEmail = resolveTokenEmail(email);

  await bootstrapUserFirestoreCampaigns(uid, email);
  let linkResult = { linkedByEmail: 0, linkedOrphans: 0 };

  const firebase = getFirebase();
  if (!firebase) {
    return {
      indexedIds: indexedIds.length,
      linkedByEmail: 0,
      linkedOrphans: 0,
      apiSynced: 0,
      loadedDocs: 0,
      authEmail: email ?? null,
      tokenEmail,
    };
  }

  const ctx = { uid, email: email ?? null, workspaceId };
  let docs = await loadOwnedCampaignDocsFast(firebase.db, ctx);

  if (docs.length === 0) {
    linkResult = await linkReadableCampaignsToUser(uid, email, workspaceId);
    docs = await loadOwnedCampaignDocsFast(firebase.db, ctx);
  }

  let apiSynced = 0;
  if (docs.length === 0) {
    apiSynced = await backfillOwnedCampaignsFromApi(uid);
    await bootstrapUserFirestoreCampaigns(uid, email);
    docs = await loadOwnedCampaignDocsFast(firebase.db, ctx);
  }

  return {
    indexedIds: indexedIds.length,
    linkedByEmail: linkResult.linkedByEmail,
    linkedOrphans: linkResult.linkedOrphans,
    apiSynced,
    loadedDocs: docs.length,
    authEmail: email ?? null,
    tokenEmail,
  };
}

/** Fast read — multi-field owner queries + indexed doc IDs (matches web-readable owned campaigns). */
export async function loadOwnedCampaignDocsFast(
  db: Firestore,
  ctx: { uid: string; email: string | null; workspaceId: string }
): Promise<{ id: string; data: DocumentData }[]> {
  const merged = new Map<string, DocumentData>();
  await mergeOwnedCampaignDocs(db, ctx, merged);
  return [...merged.entries()].map(([id, data]) => ({ id, data }));
}

/** Silent repair: upsert API-owned campaigns into Firestore (never demo/unscoped rows). */
export async function backfillOwnedCampaignsFromApi(uid: string): Promise<number> {
  const base = getApiBaseUrl();
  const firebase = getFirebase();
  if (!base || !firebase) return 0;

  const headers = await getApiAuthHeaders();
  const res = await fetch(`${base}/campaigns`, { headers });
  if (!res.ok) {
    if (__DEV__) console.log("[BrandOps campaigns] API backfill skipped — HTTP", res.status);
    return 0;
  }

  const data = (await res.json()) as CampaignRow[] | unknown;
  if (!Array.isArray(data)) return 0;

  const owned = filterOwnedCampaigns(data as CampaignRow[], uid);
  if (owned.length === 0) {
    if (__DEV__) console.log("[BrandOps campaigns] API backfill found no owned campaigns");
    return 0;
  }

  if (__DEV__) console.log("[BrandOps campaigns] API backfill syncing owned campaigns", owned.length);
  await syncCampaignsToFirestore(uid, owned);
  return owned.length;
}

export async function deleteCampaignFromFirestore(campaignId: number | string): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) return;
  await deleteDoc(doc(firebase.db, "campaigns", String(campaignId)));
}

/** Remove owned Firestore campaign docs that no longer exist in Postgres (never re-create docs). */
export async function pruneStaleFirestoreCampaigns(
  uid: string,
  apiCampaigns: CampaignSyncInput[]
): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) return;

  const apiIds = new Set(apiCampaigns.map((c) => c.id));
  const snap = await getDocs(ownedCampaignsQuery(firebase.db, uid));
  const staleIds = snap.docs
    .map((d) => Number(d.data().id ?? d.id))
    .filter((id) => Number.isFinite(id) && !apiIds.has(id));

  await Promise.all(staleIds.map((id) => deleteCampaignFromFirestore(id)));
}

/** Web only: upsert API rows then prune stale Firestore docs. */
export async function reconcileCampaignsWithFirestore(
  uid: string,
  apiCampaigns: CampaignSyncInput[]
): Promise<void> {
  await syncCampaignsToFirestore(uid, apiCampaigns);
  await pruneStaleFirestoreCampaigns(uid, apiCampaigns);
}

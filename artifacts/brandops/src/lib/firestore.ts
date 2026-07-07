import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  type Unsubscribe,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Shared helpers ────────────────────────────────────────────────────────────

function ts(t: Timestamp | undefined | null): string | null {
  return t ? t.toDate().toISOString() : null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FsCampaign {
  id?: string;
  title: string;
  description: string;
  platform: string;
  niche: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  totalBudget: number;
  payoutPerVideo: number;
  videosNeeded: number;
  creatorType: string;
  tone: string;
  deadline: string;
  inspirationUrls?: string;
  videoStyle?: string;
  brandUid?: string;
  ownerFirebaseUid?: string;
  // Structured campaign builder fields — stored as raw arrays/objects for mobile sync
  goal?: string;                    // e.g. "sales", "awareness", "downloads"
  deliverableTypes?: string[];      // e.g. ["Talking Head", "Product Demo"]
  deliverableLength?: string;       // e.g. "30s", "60s", "Custom"
  usageRightsType?: string;         // e.g. "organic", "organic_paid", "whitelisting", "full_buyout"
  creatorRequirements?: {
    ageRange?: string;              // e.g. "18–35"
    gender?: string;                // e.g. "Any", "Female"
    location?: string;              // e.g. "United States"
    followerRange?: string;         // e.g. "10K–50K"
  };
  niches?: string[];                // e.g. ["Beauty", "Fitness"]
  styleNotes?: string;              // free-text inspiration style notes
  generatedScripts?: { label: string; content: string }[];  // AI sample scripts A/B/C
  // Full AI-generated brief content
  aiData?: {
    hookIdeas?: string[];
    videoConceptIdeas?: string[];
    ctaIdeas?: string[];
    creatorBrief?: string;
    approvalCriteria?: string[];
    deliverables?: string;
    usageRights?: string;
    payoutStrategy?: string;
    doList?: string[];
    dontList?: string[];
    toneAndStyle?: string;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FsCreator {
  id?: string;
  name: string;
  handle: string;
  email: string;
  platform: string;
  niche?: string;
  status?: "active" | "suspended" | "pending";
  contentStyles: string[];
  avatarUrl?: string;
  payoutRate: number;
  suggestedPayout?: number;
  // Performance metrics
  approvalRate?: number;
  revisionRate?: number;
  onTimeDeliveryRate?: number;
  avgTurnaroundDays?: number;
  brandRating?: number;
  completedCampaigns?: number;
  approvedVideos?: number;
  totalEarnings?: number;
  followerCount?: number;
  engagementRate?: number;
  paymentMethod?: string;
  paymentDetails?: string;
  // Stripe
  stripeConnectAccountId?: string;
  stripeConnectOnboarded?: boolean;
  firebaseUid?: string;
  createdAt?: Timestamp;
}

export interface FsSubmission {
  id?: string;
  campaignId: string;
  campaignDocId?: string;
  creatorId: string;
  creatorFirebaseUid?: string;
  campaignOwnerUid?: string;
  brandUid?: string;
  creatorName?: string;
  creatorEmail?: string;
  campaignTitle?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  status: "pending" | "reviewing" | "approved" | "rejected" | "revision_requested" | "paid";
  notes?: string;
  payoutAmount?: number;
  // Video processing pipeline
  processingStatus?: "idle" | "processing" | "done" | "error";
  processedVideoUrl?: string;
  subtitlesContent?: string;
  wordTimestamps?: Array<{ word: string; start: number; end: number; confidence: number }>;
  captionStyle?: string;
  processingError?: string;
  creatorApproval?: "approved_processed" | "approved_original";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FsPayment {
  id?: string;
  submissionId: string;
  creatorId: string;
  campaignId: string;
  brandUid?: string;
  creatorEmail?: string;
  creatorName?: string;
  campaignTitle?: string;
  /** Creator payout amount (unchanged by platform fee). */
  amount: number;
  creatorAmount?: number;
  platformFeeAmount?: number;
  totalAmount?: number;
  currency?: string;
  status: "pending" | "processing" | "paid" | "failed";
  stripePaymentIntentId?: string;
  connectedAccountId?: string;
  paymentStatus?: string;
  stripeTransferId?: string;
  paidAt?: Timestamp | null;
  createdAt?: Timestamp;
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function fsCreateCampaign(
  data: Omit<FsCampaign, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "campaigns"), {
    ...data,
    status: data.status || "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fsUpdateCampaign(id: string, data: Partial<FsCampaign>): Promise<void> {
  await updateDoc(doc(db, "campaigns", id), { ...data, updatedAt: serverTimestamp() });
}

export async function fsDeleteCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, "campaigns", id));
}

export async function fsBackfillCampaignOwner(uid: string): Promise<number> {
  const snap = await getDocs(collection(db, "campaigns"));
  const toUpdate = snap.docs.filter(d => !d.data().brandUid);
  if (toUpdate.length === 0) return 0;
  const batch = writeBatch(db);
  for (const d of toUpdate) {
    batch.update(doc(db, "campaigns", d.id), { brandUid: uid, updatedAt: serverTimestamp() });
  }
  await batch.commit();
  return toUpdate.length;
}

/**
 * Normalize a campaign doc so the mobile app can find it:
 * - Writes ownerFirebaseUid + brandUid if missing
 * - Extracts top-level fields from aiData for legacy docs created with only aiData
 */
export async function fsNormalizeCampaignOwnership(
  id: string,
  uid: string,
  campaign: FsCampaign
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (!campaign.ownerFirebaseUid) updates.ownerFirebaseUid = uid;
  if (!campaign.brandUid) updates.brandUid = uid;
  // Pull top-level fields from aiData for legacy docs that only have aiData
  if (!campaign.title && campaign.aiData?.creatorBrief) {
    const brief = campaign.aiData.creatorBrief;
    const firstLine = brief.split("\n")[0].replace(/^#\s*/, "").trim();
    if (firstLine) updates.title = firstLine.slice(0, 100);
  }
  if (Object.keys(updates).length === 0) return;
  updates.updatedAt = serverTimestamp();
  await updateDoc(doc(db, "campaigns", id), updates);
}

/**
 * Previously claimed unowned campaign docs — now a no-op.
 * Kept for call-site compatibility; do not re-enable the claim logic
 * as it would assign other users' campaigns to the caller.
 */
export async function fsBootstrapUserCampaigns(_uid: string): Promise<void> {
  return;
}

export async function fsGetCampaigns(uid?: string): Promise<FsCampaign[]> {
  const q = uid
    ? query(collection(db, "campaigns"), where("brandUid", "==", uid), orderBy("createdAt", "desc"))
    : query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FsCampaign));
}

export async function fsGetCampaign(id: string): Promise<FsCampaign | null> {
  const snap = await getDoc(doc(db, "campaigns", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FsCampaign;
}

export function fsSubscribeCampaigns(
  cb: (campaigns: FsCampaign[]) => void,
  uid?: string
): Unsubscribe {
  const q = uid
    ? query(collection(db, "campaigns"), where("brandUid", "==", uid), orderBy("createdAt", "desc"))
    : query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as FsCampaign))),
    (err) => { console.warn("[Firestore] campaigns:", err.code); cb([]); }
  );
}

// ── Creators ──────────────────────────────────────────────────────────────────

export async function fsCreateCreator(
  data: Omit<FsCreator, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "creators"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fsUpdateCreator(id: string, data: Partial<FsCreator>): Promise<void> {
  await updateDoc(doc(db, "creators", id), data);
}

export async function fsGetCreators(): Promise<FsCreator[]> {
  const snap = await getDocs(query(collection(db, "creators"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FsCreator));
}

export async function fsGetCreator(id: string): Promise<FsCreator | null> {
  const snap = await getDoc(doc(db, "creators", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FsCreator;
}

export async function fsGetCreatorByEmail(email: string): Promise<FsCreator | null> {
  const snap = await getDocs(
    query(collection(db, "creators"), where("email", "==", email))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as FsCreator;
}

export function fsSubscribeCreators(
  cb: (creators: FsCreator[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "creators"), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as FsCreator))),
    (err) => { console.warn("[Firestore] creators:", err.code); cb([]); }
  );
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function fsCreateSubmission(
  data: Omit<FsSubmission, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "submissions"), {
    ...data,
    campaignDocId: data.campaignId,
    creatorFirebaseUid: data.creatorFirebaseUid ?? data.creatorId,
    status: data.status || "pending",
    processingStatus: "idle",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fsUpdateSubmission(id: string, data: Partial<FsSubmission>): Promise<void> {
  await updateDoc(doc(db, "submissions", id), { ...data, updatedAt: serverTimestamp() });
}

export async function fsGetSubmissions(constraints: QueryConstraint[] = []): Promise<FsSubmission[]> {
  const snap = await getDocs(
    query(collection(db, "submissions"), orderBy("createdAt", "desc"), ...constraints)
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FsSubmission));
}

export async function fsGetSubmission(id: string): Promise<FsSubmission | null> {
  const snap = await getDoc(doc(db, "submissions", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FsSubmission;
}

export function fsSubscribeSubmissions(
  cb: (submissions: FsSubmission[]) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe {
  // When extra where-constraints are present, omit orderBy to avoid requiring
  // a composite index. Sort client-side instead.
  const q = constraints.length > 0
    ? query(collection(db, "submissions"), ...constraints)
    : query(collection(db, "submissions"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as FsSubmission));
      if (constraints.length > 0) {
        docs.sort((a, b) => {
          const at = a.createdAt as { seconds?: number } | undefined;
          const bt = b.createdAt as { seconds?: number } | undefined;
          return (bt?.seconds ?? 0) - (at?.seconds ?? 0);
        });
      }
      cb(docs);
    },
    (err) => { console.warn("[Firestore] submissions:", err.code); cb([]); }
  );
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function fsCreatePayment(
  data: Omit<FsPayment, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "payments"), {
    ...data,
    status: data.status || "pending",
    currency: data.currency || "usd",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fsUpdatePayment(id: string, data: Partial<FsPayment>): Promise<void> {
  await updateDoc(doc(db, "payments", id), data);
}

export async function fsGetPayments(constraints: QueryConstraint[] = []): Promise<FsPayment[]> {
  const snap = await getDocs(
    query(collection(db, "payments"), orderBy("createdAt", "desc"), ...constraints)
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FsPayment));
}

export function fsSubscribePayments(
  cb: (payments: FsPayment[]) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe {
  const q = constraints.length > 0
    ? query(collection(db, "payments"), ...constraints)
    : query(collection(db, "payments"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as FsPayment));
      if (constraints.length > 0) {
        docs.sort((a, b) => {
          const at = a.createdAt as { seconds?: number } | undefined;
          const bt = b.createdAt as { seconds?: number } | undefined;
          return (bt?.seconds ?? 0) - (at?.seconds ?? 0);
        });
      }
      cb(docs);
    },
    (err) => { console.warn("[Firestore] payments:", err.code); cb([]); }
  );
}

// ── User profile (onboarding status) ──────────────────────────────────────────

export interface FsUserProfile {
  onboarded: boolean;
  onboardingData?: Record<string, unknown>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function fsGetUserProfile(uid: string): Promise<FsUserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as FsUserProfile;
}

export async function fsSetUserProfile(uid: string, data: Record<string, unknown>): Promise<void> {
  const { setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "users", uid), {
    onboarded: true,
    onboardingData: data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── React hooks (real-time subscriptions) ─────────────────────────────────────

export { ts };
// Re-export where for use in pages
export { where };

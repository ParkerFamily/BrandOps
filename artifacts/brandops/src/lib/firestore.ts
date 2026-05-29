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
  creatorId: string;
  creatorName?: string;
  creatorEmail?: string;
  campaignTitle?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  status: "pending" | "reviewing" | "approved" | "rejected" | "revision_requested" | "paid";
  notes?: string;
  payoutAmount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FsPayment {
  id?: string;
  submissionId: string;
  creatorId: string;
  campaignId: string;
  creatorEmail?: string;
  creatorName?: string;
  campaignTitle?: string;
  amount: number;
  currency?: string;
  status: "pending" | "processing" | "paid" | "failed";
  stripePaymentIntentId?: string;
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

export async function fsGetCampaigns(): Promise<FsCampaign[]> {
  const snap = await getDocs(query(collection(db, "campaigns"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FsCampaign));
}

export async function fsGetCampaign(id: string): Promise<FsCampaign | null> {
  const snap = await getDoc(doc(db, "campaigns", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FsCampaign;
}

export function fsSubscribeCampaigns(
  cb: (campaigns: FsCampaign[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "campaigns"), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as FsCampaign)))
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
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as FsCreator)))
  );
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function fsCreateSubmission(
  data: Omit<FsSubmission, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "submissions"), {
    ...data,
    status: data.status || "pending",
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
  return onSnapshot(
    query(collection(db, "submissions"), orderBy("createdAt", "desc"), ...constraints),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as FsSubmission)))
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
  return onSnapshot(
    query(collection(db, "payments"), orderBy("createdAt", "desc"), ...constraints),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as FsPayment)))
  );
}

// ── React hooks (real-time subscriptions) ─────────────────────────────────────

export { ts };
// Re-export where for use in pages
export { where };

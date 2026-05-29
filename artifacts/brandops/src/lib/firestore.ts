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
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface FirestoreCampaign {
  id?: string;
  title: string;
  description: string;
  platform: string;
  niche: string;
  status: string;
  totalBudget: number;
  payoutPerVideo: number;
  videosNeeded: number;
  creatorType: string;
  tone: string;
  deadline: string;
  inspirationUrls?: string;
  videoStyle?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // Full AI-generated content stored here
  aiData?: Record<string, unknown>;
}

export interface FirestoreCreator {
  id?: string;
  name: string;
  handle: string;
  email: string;
  platform: string;
  contentStyles: string[];
  payoutRate: number;
  createdAt?: Timestamp;
}

// ── Campaigns ────────────────────────────────────────────────────────────────

export async function fsCreateCampaign(data: Omit<FirestoreCampaign, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(collection(db, "campaigns"), {
    ...data,
    status: data.status || "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fsUpdateCampaign(id: string, data: Partial<FirestoreCampaign>): Promise<void> {
  const ref = doc(db, "campaigns", id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function fsDeleteCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, "campaigns", id));
}

export async function fsGetCampaigns(): Promise<FirestoreCampaign[]> {
  const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreCampaign));
}

export async function fsGetCampaign(id: string): Promise<FirestoreCampaign | null> {
  const snap = await getDoc(doc(db, "campaigns", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FirestoreCampaign;
}

// ── Creators ─────────────────────────────────────────────────────────────────

export async function fsCreateCreator(data: Omit<FirestoreCreator, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "creators"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fsGetCreators(): Promise<FirestoreCreator[]> {
  const q = query(collection(db, "creators"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreCreator));
}

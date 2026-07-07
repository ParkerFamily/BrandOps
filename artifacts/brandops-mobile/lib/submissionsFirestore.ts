import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

export type FirestoreSubmissionStatus = "pending" | "approved" | "rejected" | "revision_requested";

export type FirestoreSubmission = {
  id: string;
  campaignDocId: string;
  campaignTitle: string;
  campaignOwnerUid: string;
  creatorFirebaseUid: string;
  creatorEmail: string | null;
  creatorName: string | null;
  videoUrl: string;
  storagePath: string | null;
  submissionType: "upload" | "link";
  status: FirestoreSubmissionStatus;
  payoutAmount: number | null;
  notes: string | null;
  createdAt: Date;
};

function toDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

function mapSubmission(id: string, data: DocumentData): FirestoreSubmission {
  return {
    id,
    campaignDocId: String(data.campaignDocId ?? ""),
    campaignTitle: String(data.campaignTitle ?? "Campaign"),
    campaignOwnerUid: String(data.campaignOwnerUid ?? data.ownerFirebaseUid ?? ""),
    creatorFirebaseUid: String(data.creatorFirebaseUid ?? ""),
    creatorEmail: (data.creatorEmail as string | null | undefined) ?? null,
    creatorName: (data.creatorName as string | null | undefined) ?? null,
    videoUrl: String(data.videoUrl ?? ""),
    storagePath: (data.storagePath as string | null | undefined) ?? null,
    submissionType: data.submissionType === "link" ? "link" : "upload",
    status: (data.status as FirestoreSubmissionStatus) ?? "pending",
    payoutAmount: data.payoutAmount != null ? Number(data.payoutAmount) : null,
    notes: (data.notes as string | null | undefined) ?? null,
    createdAt: toDate(data.createdAt),
  };
}

export async function createFirestoreSubmission(input: {
  campaignDocId: string;
  campaignTitle: string;
  campaignOwnerUid: string;
  creatorFirebaseUid: string;
  creatorEmail: string | null;
  creatorName?: string | null;
  videoUrl: string;
  storagePath?: string | null;
  submissionType?: "upload" | "link";
  payoutAmount?: number | null;
  durationMs?: number | null;
}): Promise<string> {
  const firebase = getFirebase();
  if (!firebase) throw new Error("Firebase is not configured.");

  const ref = await addDoc(collection(firebase.db, "submissions"), {
    campaignDocId: input.campaignDocId,
    campaignTitle: input.campaignTitle,
    campaignOwnerUid: input.campaignOwnerUid,
    creatorFirebaseUid: input.creatorFirebaseUid,
    creatorEmail: input.creatorEmail,
    creatorName: input.creatorName ?? null,
    videoUrl: input.videoUrl,
    storagePath: input.storagePath ?? null,
    submissionType: input.submissionType ?? (input.storagePath ? "upload" : "link"),
    payoutAmount: input.payoutAmount ?? null,
    durationMs: input.durationMs ?? null,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function readCampaignOwnerUid(campaignDocId: string): Promise<string | null> {
  const firebase = getFirebase();
  if (!firebase) return null;

  const snap = await getDoc(doc(firebase.db, "campaigns", campaignDocId));
  if (!snap.exists()) return null;
  const data = snap.data();
  const owner = data.ownerFirebaseUid ?? data.owner_firebase_uid ?? data.ownerId;
  return owner != null ? String(owner) : null;
}

export function subscribeMySubmissions(
  creatorUid: string,
  onData: (rows: FirestoreSubmission[]) => void
): Unsubscribe {
  const firebase = getFirebase();
  if (!firebase) {
    onData([]);
    return () => {};
  }

  const q = query(collection(firebase.db, "submissions"), where("creatorFirebaseUid", "==", creatorUid));
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs
        .map((d) => mapSubmission(d.id, d.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    );
  });
}

export async function listSubmissionsForCampaign(campaignDocId: string): Promise<FirestoreSubmission[]> {
  const firebase = getFirebase();
  if (!firebase) return [];

  const q = query(collection(firebase.db, "submissions"), where("campaignDocId", "==", campaignDocId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapSubmission(d.id, d.data())).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function subscribeOwnerSubmissions(
  ownerUid: string,
  campaignDocId: string | undefined,
  onData: (rows: FirestoreSubmission[]) => void
): Unsubscribe {
  const firebase = getFirebase();
  if (!firebase) {
    onData([]);
    return () => {};
  }

  const q = campaignDocId
    ? query(
        collection(firebase.db, "submissions"),
        where("campaignOwnerUid", "==", ownerUid),
        where("campaignDocId", "==", campaignDocId)
      )
    : query(collection(firebase.db, "submissions"), where("campaignOwnerUid", "==", ownerUid));

  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs
          .map((d) => mapSubmission(d.id, d.data()))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      );
    },
    (err) => {
      if (__DEV__) console.warn("[BrandOps submissions] listener:", err.message);
      onData([]);
    }
  );
}

export async function getFirestoreSubmission(submissionDocId: string): Promise<FirestoreSubmission | null> {
  const firebase = getFirebase();
  if (!firebase) return null;

  const snap = await getDoc(doc(firebase.db, "submissions", submissionDocId));
  if (!snap.exists()) return null;
  return mapSubmission(snap.id, snap.data());
}

export function subscribeFirestoreSubmission(
  submissionDocId: string,
  onData: (row: FirestoreSubmission | null) => void,
  onError?: (message: string) => void
): Unsubscribe {
  const firebase = getFirebase();
  if (!firebase) {
    onData(null);
    return () => {};
  }

  return onSnapshot(
    doc(firebase.db, "submissions", submissionDocId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(mapSubmission(snap.id, snap.data()));
    },
    (err) => {
      if (__DEV__) console.warn("[BrandOps submission]", submissionDocId, err.message);
      onError?.(err.message || "Could not load submission.");
      onData(null);
    }
  );
}

export async function updateFirestoreSubmissionStatus(
  submissionDocId: string,
  status: FirestoreSubmissionStatus,
  notes?: string
): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) throw new Error("Firebase is not configured.");

  const reviewerUid = firebase.auth.currentUser?.uid;
  if (!reviewerUid) throw new Error("Sign in required to review submissions.");

  const existing = await getFirestoreSubmission(submissionDocId);
  if (!existing) throw new Error("Submission not found.");
  if (existing.campaignOwnerUid !== reviewerUid) {
    throw new Error("Only the campaign owner can review this submission.");
  }
  if (existing.creatorFirebaseUid === reviewerUid) {
    throw new Error("Creators cannot approve their own submissions.");
  }

  await updateDoc(doc(firebase.db, "submissions", submissionDocId), {
    status,
    ...(notes ? { notes } : {}),
    updatedAt: serverTimestamp(),
  });
}

export type CampaignSubmissionStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revision: number;
  budgetUsed: number;
  assignedCreators: number;
};

export function computeCampaignSubmissionStats(
  submissions: FirestoreSubmission[],
  payoutPerVideo: number
): CampaignSubmissionStats {
  const creators = new Set(submissions.map((s) => s.creatorFirebaseUid).filter(Boolean));
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let revision = 0;

  for (const s of submissions) {
    if (s.status === "pending") pending += 1;
    else if (s.status === "approved") approved += 1;
    else if (s.status === "rejected") rejected += 1;
    else if (s.status === "revision_requested") revision += 1;
  }

  return {
    total: submissions.length,
    pending,
    approved,
    rejected,
    revision,
    budgetUsed: approved * payoutPerVideo,
    assignedCreators: creators.size,
  };
}

/** Submissions a brand can approve — excludes the owner's own UGC (mis-tagged owner uid). */
export function countReviewableSubmissions(
  submissions: FirestoreSubmission[],
  reviewerUid: string | null | undefined
): number {
  if (!reviewerUid) return 0;
  return submissions.filter(
    (s) =>
      (s.status === "pending" || s.status === "revision_requested") &&
      s.creatorFirebaseUid !== reviewerUid
  ).length;
}

export function firstReviewableSubmission(
  submissions: FirestoreSubmission[],
  reviewerUid: string | null | undefined
): FirestoreSubmission | undefined {
  if (!reviewerUid) return undefined;
  return submissions.find(
    (s) =>
      (s.status === "pending" || s.status === "revision_requested") &&
      s.creatorFirebaseUid !== reviewerUid
  );
}

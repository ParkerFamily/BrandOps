import { arrayUnion, doc, getDoc, onSnapshot, setDoc, type Firestore, type Unsubscribe } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

const INDEX_FIELD = "campaignDocIds";

export function subscribeUserCampaignDocIds(
  db: Firestore,
  uid: string,
  onIds: (ids: string[]) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      const raw = snap.data()?.[INDEX_FIELD];
      const ids = Array.isArray(raw) ? [...new Set(raw.map(String).filter(Boolean))] : [];
      onIds(ids);
    },
    () => onIds([])
  );
}

export async function registerCampaignDocId(uid: string, docId: string): Promise<void> {
  const firebase = getFirebase();
  if (!firebase || !docId) return;

  await setDoc(
    doc(firebase.db, "users", uid),
    { [INDEX_FIELD]: arrayUnion(docId) },
    { merge: true }
  );
}

export async function readUserCampaignDocIds(uid: string): Promise<string[]> {
  const firebase = getFirebase();
  if (!firebase) return [];

  const snap = await getDoc(doc(firebase.db, "users", uid));
  const raw = snap.data()?.[INDEX_FIELD];
  return Array.isArray(raw) ? [...new Set(raw.map(String).filter(Boolean))] : [];
}

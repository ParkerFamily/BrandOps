import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

/** Save OneSignal subscription/player ID on the user's Firestore profile. */
export async function saveOneSignalPlayerId(uid: string, playerId: string): Promise<void> {
  const firebase = getFirebase();
  if (!firebase || !playerId.trim()) return;

  await setDoc(
    doc(firebase.db, "users", uid),
    {
      onesignalPlayerId: playerId,
      onesignalSubscriptionId: playerId,
      onesignalUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

import { doc, onSnapshot, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import { isFirebaseConfigured } from "@/lib/env";

/** Firestore user fields the mobile app may read for creator payout setup only. */
const CREATOR_PAYOUT_FIELDS = [
  "stripeConnectAccountId",
  "stripeAccountId",
  "stripeConnected",
  "stripeOnboardingComplete",
  "stripeReady",
  "stripePayoutsEnabled",
  "payoutMethodReady",
  "stripeDetailsSubmitted",
] as const;

function pickPayoutFields(data: DocumentData | undefined): DocumentData | undefined {
  if (!data) return undefined;
  const picked: DocumentData = {};
  for (const key of CREATOR_PAYOUT_FIELDS) {
    if (key in data) picked[key] = data[key];
  }
  return picked;
}

/** Listen for creator payout setup fields only — never surfaces brand subscription/billing fields. */
export function subscribeCreatorPayoutProfile(
  uid: string,
  onData: (data: DocumentData | undefined) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onData(undefined);
    return () => {};
  }

  const firebase = getFirebase();
  if (!firebase) {
    onData(undefined);
    return () => {};
  }

  return onSnapshot(
    doc(firebase.db, "users", uid),
    (snap) => onData(pickPayoutFields(snap.exists() ? snap.data() : undefined)),
    () => onData(undefined)
  );
}

import { doc, onSnapshot, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import { isFirebaseConfigured } from "@/lib/env";
import type { FirestoreCampaign } from "@/lib/campaignsFirestore";

export type PaymentReadiness = {
  campaignFunded: boolean;
  stripeConnected: boolean;
  payoutMethodReady: boolean;
  budgetAvailable: number;
  estimatedCreatorPayouts: number;
};

/** Hide payment setup UI on campaign pages once billing is ready. */
export function isPaymentSetupComplete(readiness: PaymentReadiness): boolean {
  return readiness.stripeConnected && readiness.payoutMethodReady && readiness.campaignFunded;
}

function pickBool(data: DocumentData | undefined, ...keys: string[]): boolean {
  if (!data) return false;
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1) return true;
  }
  return false;
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

export function derivePaymentReadiness(
  campaign: FirestoreCampaign,
  userData: DocumentData | undefined
): PaymentReadiness {
  const stripeConnected =
    pickBool(userData, "stripeConnected", "stripeOnboardingComplete", "stripeReady") ||
    Boolean(pickString(userData, "stripeAccountId", "stripeConnectAccountId", "stripeCustomerId"));

  const payoutMethodReady =
    pickBool(userData, "payoutMethodReady", "stripePayoutsEnabled", "stripeDetailsSubmitted") || stripeConnected;

  const budgetAvailable = Math.max(0, (campaign.totalBudget ?? 0) - (campaign.totalSpent ?? 0));
  const estimatedCreatorPayouts = (campaign.pendingCount ?? 0) * (campaign.payoutPerVideo ?? 0);
  const campaignFunded =
    (campaign.totalBudget ?? 0) > 0 ||
    Boolean(pickBool({ active: campaign.status === "active" }, "active"));

  return {
    campaignFunded,
    stripeConnected,
    payoutMethodReady,
    budgetAvailable,
    estimatedCreatorPayouts,
  };
}

export function subscribeUserPaymentProfile(
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
    (snap) => onData(snap.exists() ? snap.data() : undefined),
    () => onData(undefined)
  );
}

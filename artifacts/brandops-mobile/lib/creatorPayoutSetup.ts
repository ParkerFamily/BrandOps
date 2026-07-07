import { useEffect, useState } from "react";
import type { DocumentData } from "firebase/firestore";
import { subscribeCreatorPayoutProfile } from "@/lib/creatorPayoutProfile";

export type CreatorPayoutSetup = {
  stripeConnected: boolean;
  payoutsEnabled: boolean;
  isFullySetUp: boolean;
};

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

/** Creator Stripe Connect payout readiness — not a subscription or in-app purchase gate. */
export function deriveCreatorPayoutSetup(userData: DocumentData | undefined): CreatorPayoutSetup {
  const connectAccountId = pickString(userData, "stripeConnectAccountId", "stripeAccountId");
  const stripeConnected =
    Boolean(connectAccountId) ||
    pickBool(userData, "stripeConnected", "stripeOnboardingComplete", "stripeReady");

  const payoutsEnabled =
    pickBool(userData, "stripePayoutsEnabled", "payoutMethodReady", "stripeDetailsSubmitted") &&
    stripeConnected;

  return {
    stripeConnected,
    payoutsEnabled,
    isFullySetUp: stripeConnected && payoutsEnabled,
  };
}

export function useCreatorPayoutSetup(uid: string | null | undefined): CreatorPayoutSetup | null {
  const [setup, setSetup] = useState<CreatorPayoutSetup | null>(null);

  useEffect(() => {
    if (!uid) {
      setSetup(null);
      return;
    }
    return subscribeCreatorPayoutProfile(uid, (data) => {
      setSetup(deriveCreatorPayoutSetup(data));
    });
  }, [uid]);

  return setup;
}

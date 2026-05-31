import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getOnboarded } from "@/lib/onboarding";

const BASE = import.meta.env.BASE_URL;

interface OnboardingData { accountType?: string; }

interface GateState {
  loading: boolean;
  ready: boolean | null;
  isCreator: boolean;
  startSetup: () => Promise<void>;
}

export function useStripeGate(): GateState {
  const { user } = useAuth();
  const onboarding = getOnboarded() as OnboardingData | null;
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    async function check() {
      setLoading(true);
      try {
        if (isCreator) {
          const r = await fetch(`${BASE}api/stripe/creator-connect/status?uid=${encodeURIComponent(user!.uid)}`);
          if (r.ok) {
            const d = await r.json() as { payoutsEnabled?: boolean; detailsSubmitted?: boolean };
            if (!cancelled) setReady(!!(d.payoutsEnabled && d.detailsSubmitted));
          } else {
            if (!cancelled) setReady(false);
          }
        } else {
          const r = await fetch(`${BASE}api/stripe/brand-setup/status?uid=${encodeURIComponent(user!.uid)}`);
          if (r.ok) {
            const d = await r.json() as { ready?: boolean };
            if (!cancelled) setReady(!!d.ready);
          } else {
            if (!cancelled) setReady(false);
          }
        }
      } catch {
        if (!cancelled) setReady(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [user?.uid, isCreator]);

  const startSetup = async () => {
    if (!user) return;
    if (isCreator) {
      const r = await fetch(`${BASE}api/stripe/creator-connect/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, email: user.email, name: user.displayName, returnUrl: window.location.origin }),
      });
      const d = await r.json() as { url?: string };
      if (d.url) window.location.href = d.url;
    } else {
      const r = await fetch(`${BASE}api/stripe/brand-setup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, email: user.email, name: user.displayName, returnUrl: window.location.origin }),
      });
      const d = await r.json() as { url?: string };
      if (d.url) window.location.href = d.url;
    }
  };

  return { loading, ready, isCreator, startSetup };
}

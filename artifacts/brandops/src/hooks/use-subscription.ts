import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL;

export type PlanName = "free" | "starter" | "growth" | "enterprise";

interface SubscriptionStatus {
  plan: PlanName;
  status: string;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status", user?.uid],
    queryFn: async () => {
      if (!user) return { plan: "free" as PlanName, status: "none" };
      const r = await fetch(
        `${BASE}api/stripe/subscription/status?uid=${encodeURIComponent(user.uid)}`,
      );
      if (!r.ok) return { plan: "free" as PlanName, status: "none" };
      return r.json() as Promise<SubscriptionStatus>;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const plan: PlanName = data?.plan ?? "free";
  const canRemoveWatermark = plan !== "free";

  return { plan, canRemoveWatermark, isLoading };
}

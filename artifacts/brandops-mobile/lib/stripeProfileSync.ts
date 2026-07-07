import { getApiAuthHeaders, getApiBaseUrl } from "@/lib/apiClient";

/** Pull Stripe billing / Connect status from API → Firestore (mobile listens on `users/{uid}`). */
export async function syncStripeProfileFromApi(): Promise<boolean> {
  const base = getApiBaseUrl();
  if (!base) return false;

  try {
    const headers = await getApiAuthHeaders();
    const res = await fetch(`${base}/stripe/sync-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
    });
    return res.ok;
  } catch {
    return false;
  }
}

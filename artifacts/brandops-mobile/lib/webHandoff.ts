import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { User } from "firebase/auth";
import Toast from "react-native-toast-message";
import { getApiAuthHeaders, getApiBaseUrl } from "@/lib/apiClient";
import { getWebAppUrl } from "@/lib/env";
import { getFirebase } from "@/lib/firebase";

/** Allowed web destinations for authenticated mobile handoff (no brand billing/subscription). */
export const WEB_HANDOFF_PATHS = {
  settings: "/settings",
  dashboard: "/dashboard",
  team: "/team",
} as const;

export type WebHandoffDestination = keyof typeof WEB_HANDOFF_PATHS;

type OpenWebSessionOptions = {
  /** Override path (must match API allowlist), e.g. `/campaigns/abc123/creators` */
  redirectTo?: string;
};

async function openInBrowser(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, {
    dismissButtonStyle: "close",
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });
}

/**
 * Opens BrandOps web already signed in when the API handoff endpoint is live.
 * If handoff is unavailable (e.g. API not deployed yet), opens the web page directly.
 */
export async function openAuthenticatedWebSession(
  destination: WebHandoffDestination,
  options?: OpenWebSessionOptions
): Promise<boolean> {
  const firebase = getFirebase();
  if (!firebase?.auth.currentUser) {
    Toast.show({
      type: "error",
      text1: "Sign in required",
      text2: "Sign in to your BrandOps account first.",
    });
    return false;
  }

  const redirectTo = options?.redirectTo ?? WEB_HANDOFF_PATHS[destination];
  const fallbackUrl = getWebAppUrl(redirectTo);
  const base = getApiBaseUrl();

  if (!base) {
    await openInBrowser(fallbackUrl);
    Toast.show({
      type: "info",
      text1: "Opened BrandOps web",
      text2: "Sign in with the same account if prompted.",
    });
    return true;
  }

  try {
    const headers = await getApiAuthHeaders();
    const res = await fetch(`${base}/auth/web-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ redirectTo }),
    });

    const body = (await res.json().catch(() => ({}))) as { sessionUrl?: string; error?: string };

    if (res.ok && body.sessionUrl) {
      await openInBrowser(body.sessionUrl);
      return true;
    }

    await openInBrowser(fallbackUrl);

    const serverHint =
      res.status === 404
        ? "Opened web — sign in with the same email if asked."
        : body.error
          ? `${body.error} Opened web — sign in with the same account if prompted.`
          : "Sign in with the same BrandOps account if prompted.";

    Toast.show({
      type: "info",
      text1: destination === "dashboard" ? "Opened dashboard on web" : "Opened BrandOps web",
      text2: serverHint,
    });
    return true;
  } catch (err) {
    await openInBrowser(fallbackUrl);
    Toast.show({
      type: "info",
      text1: "Opened BrandOps web",
      text2:
        err instanceof Error
          ? `${err.message} — sign in with the same account if prompted.`
          : "Sign in with the same BrandOps account if prompted.",
    });
    return true;
  }
}

async function openStripeHostedUrl(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, {
    dismissButtonStyle: "close",
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });
}

async function startCreatorConnectOnboarding(
  apiBase: string,
  headers: Record<string, string>,
  uid: string,
  user: User
): Promise<boolean> {
  const email = user.email?.trim();
  if (!email) {
    Toast.show({
      type: "error",
      text1: "Email required",
      text2: "Use an account with an email address to set up creator payouts.",
    });
    return false;
  }

  const res = await fetch(`${apiBase}/stripe/creator-connect/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      uid,
      email,
      name: user.displayName?.trim() || undefined,
      returnUrl: getWebAppUrl("/settings/payouts"),
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    message?: string;
  };

  if (res.ok && body.url) {
    await openStripeHostedUrl(body.url);
    Toast.show({
      type: "success",
      text1: "Payout setup opened",
      text2: "Complete the secure form in your browser, then return to BrandOps.",
    });
    return true;
  }

  if (body.error === "connect_not_enabled" || body.error === "platform_profile_incomplete") {
    Toast.show({
      type: "info",
      text1: "Payout setup temporarily unavailable",
      text2: body.message ?? "Try again later or email support@brandopsapp.com.",
    });
    return false;
  }

  throw new Error(body.message ?? body.error ?? "Could not start payout setup");
}

function isConnectNotLinked(status: number, error?: string): boolean {
  return status === 402 || error === "connect_not_linked";
}

/**
 * Opens creator payout setup (Stripe Connect onboarding) or the payout dashboard when already linked.
 * Never falls back to the web dashboard settings page (avoids exposing brand billing/subscription UI).
 */
export async function openCreatorConnectDashboard(uid: string | null | undefined): Promise<boolean> {
  if (!uid) {
    Toast.show({ type: "error", text1: "Sign in required", text2: "Sign in to manage payouts." });
    return false;
  }

  const firebase = getFirebase();
  if (!firebase?.auth.currentUser) {
    Toast.show({
      type: "error",
      text1: "Sign in required",
      text2: "Sign in to your BrandOps account first.",
    });
    return false;
  }

  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    Toast.show({
      type: "error",
      text1: "API not configured",
      text2: "Set EXPO_PUBLIC_API_BASE_URL to open Stripe payouts.",
    });
    return false;
  }

  try {
    const headers = await getApiAuthHeaders();
    const currentUser = firebase.auth.currentUser;

    const handoffRes = await fetch(`${apiBase}/stripe/connect/dashboard-handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ uid }),
    });

    const handoffBody = (await handoffRes.json().catch(() => ({}))) as {
      openUrl?: string;
      error?: string;
      message?: string;
    };

    if (handoffRes.ok && handoffBody.openUrl) {
      await Linking.openURL(handoffBody.openUrl);
      return true;
    }

    if (isConnectNotLinked(handoffRes.status, handoffBody.error)) {
      return await startCreatorConnectOnboarding(apiBase, headers, uid, currentUser);
    }

    const directRes = await fetch(`${apiBase}/stripe/connect/dashboard?uid=${encodeURIComponent(uid)}`, {
      headers,
    });
    const directBody = (await directRes.json().catch(() => ({}))) as { url?: string; error?: string; message?: string };

    if (directRes.ok && directBody.url) {
      await openStripeHostedUrl(directBody.url);
      return true;
    }

    if (isConnectNotLinked(directRes.status, directBody.error)) {
      return await startCreatorConnectOnboarding(apiBase, headers, uid, currentUser);
    }

    throw new Error(
      directBody.message ?? directBody.error ?? handoffBody.message ?? handoffBody.error ?? "Could not open payouts"
    );
  } catch (err) {
    Toast.show({
      type: "error",
      text1: "Could not open payouts",
      text2: err instanceof Error ? err.message : "Try again in a moment.",
    });
    return false;
  }
}

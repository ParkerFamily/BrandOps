import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { env } from "@/lib/env";
import { getFirebase } from "@/lib/firebase";

let initialized = false;

/** Host only — generated client paths already include `/api/...`. */
function normalizeHostBase(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let base = url.trim().replace(/\/+$/, "");
  if (base.endsWith("/api")) base = base.slice(0, -4);
  return base;
}

export function initApiClient(): void {
  if (initialized) return;
  initialized = true;

  setBaseUrl(normalizeHostBase(env.apiBaseUrl));

  const firebase = getFirebase();
  if (firebase) {
    setAuthTokenGetter(async () => {
      const user = firebase.auth.currentUser;
      if (!user) return null;
      return user.getIdToken();
    });
  } else {
    setAuthTokenGetter(null);
  }
}

export function isApiConfigured(): boolean {
  return Boolean(env.apiBaseUrl?.trim());
}

export function getApiBaseUrl(): string | null {
  const host = normalizeHostBase(env.apiBaseUrl);
  return host ? `${host}/api` : null;
}

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const firebase = getFirebase();
  const token = firebase?.auth.currentUser ? await firebase.auth.currentUser.getIdToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

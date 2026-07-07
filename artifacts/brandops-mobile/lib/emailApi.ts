import { env } from "@/lib/env";

function apiBase(): string {
  const base = env.apiBaseUrl?.replace(/\/$/, "");
  if (!base) return "";
  return base.endsWith("/api") ? base : `${base}/api`;
}

async function postEmail(path: string, body: Record<string, unknown>) {
  const base = apiBase();
  if (!base) return;

  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn("[BrandOps email]", path, data);
    }
  } catch (err) {
    console.warn("[BrandOps email] request failed", path, err);
  }
}

export function sendWelcomeEmailFromMobile(params: { to: string; name: string }) {
  void postEmail("/email/welcome", params);
}

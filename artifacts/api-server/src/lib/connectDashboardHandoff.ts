import { SignJWT, jwtVerify } from "jose";

const HANDOFF_TTL_SEC = 5 * 60;

function apiBaseUrl(): string {
  const fromEnv = process.env.BRANDOPS_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const app = (process.env.BRANDOPS_APP_URL ?? "https://brandopsapp.com").replace(/\/+$/, "");
  return `${app}/api`;
}

function handoffSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export async function createConnectDashboardHandoff(uid: string): Promise<string> {
  const token = await new SignJWT({ uid, purpose: "connect_dashboard" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${HANDOFF_TTL_SEC}s`)
    .setIssuedAt()
    .sign(handoffSecret());

  const params = new URLSearchParams({ uid, handoff: token });
  return `${apiBaseUrl()}/stripe/connect/dashboard?${params.toString()}`;
}

export async function verifyConnectDashboardHandoff(handoff: string, uid: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(handoff, handoffSecret());
    return payload.uid === uid && payload.purpose === "connect_dashboard";
  } catch {
    return false;
  }
}

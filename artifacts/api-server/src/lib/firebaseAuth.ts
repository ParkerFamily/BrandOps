import type { Request } from "express";
import { getAuth } from "../firebaseAdmin";

const SESSION_COOKIE_NAME = "brandops_session";

export type AuthedRequest = Request & {
  cookies?: Record<string, string>;
};

/**
 * Resolve the Firebase UID for a request from either an
 * `Authorization: Bearer <ID token>` header (mobile) or the
 * brandops_session cookie (web iframe embeds). Returns null when
 * the request carries no valid credential.
 */
export async function resolveFirebaseUid(req: AuthedRequest): Promise<string | null> {
  const auth = getAuth();

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const idToken = header.slice("Bearer ".length).trim();
    if (idToken) {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        return decoded.uid;
      } catch {
        // fall through to session cookie
      }
    }
  }

  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
  if (sessionCookie) {
    try {
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      return decoded.uid;
    } catch {
      return null;
    }
  }

  return null;
}

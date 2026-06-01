import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "../firebaseAdmin";

const router: IRouter = Router();

const SESSION_COOKIE_NAME = "brandops_session";
const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000; // 14 days

// POST /api/auth/web-session
// Exchange a Firebase ID token for a server-side session cookie (for iframe embeds)
router.post("/auth/web-session", async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  try {
    const auth = getAuth();

    // Verify the ID token is fresh (< 5 min) before issuing a session cookie
    const decoded = await auth.verifyIdToken(idToken, true);

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_DURATION_MS,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });

    req.log.info({ uid: decoded.uid }, "Session cookie created");
    res.json({ status: "ok", uid: decoded.uid });
  } catch (err: unknown) {
    const msg = (err as Error).message ?? "Unknown error";
    req.log.warn({ msg }, "web-session creation failed");

    if (msg.includes("FIREBASE_SERVICE_ACCOUNT_JSON")) {
      res.status(503).json({ error: "Server not configured — add FIREBASE_SERVICE_ACCOUNT_JSON secret" });
    } else {
      res.status(401).json({ error: "Invalid or expired ID token" });
    }
  }
});

// GET /api/auth/session
// Check if the current session cookie is valid
router.get("/auth/session", async (req: Request, res: Response): Promise<void> => {
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME] ?? "";
  if (!sessionCookie) {
    res.json({ valid: false });
    return;
  }

  try {
    const auth = getAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    res.json({ valid: true, uid: decoded.uid, email: decoded.email ?? null });
  } catch {
    res.json({ valid: false });
  }
});

// POST /api/auth/sign-out
// Clear the session cookie
router.post("/auth/sign-out", (_req: Request, res: Response): void => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.json({ status: "ok" });
});

export default router;

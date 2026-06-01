import * as admin from "firebase-admin";
import { createRequire } from "node:module";
import { logger } from "./lib/logger";

let _app: admin.app.App | null = null;

function loadServiceAccount(): admin.ServiceAccount {
  // 1. Try env var first (preferred in production)
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      return JSON.parse(raw) as admin.ServiceAccount;
    } catch {
      logger.warn("FIREBASE_SERVICE_ACCOUNT_JSON env var is not valid JSON — falling back to bundled file");
    }
  }

  // 2. Fall back to the service account file bundled alongside the server
  try {
    const _require = createRequire(import.meta.url);
    return _require("./serviceAccount.json") as admin.ServiceAccount;
  } catch {
    throw new Error(
      "Firebase Admin: could not load service account. " +
      "Set FIREBASE_SERVICE_ACCOUNT_JSON env var or ensure serviceAccount.json is present."
    );
  }
}

export function getFirebaseAdmin(): admin.app.App {
  if (_app) return _app;

  if (admin.apps.length > 0) {
    _app = admin.apps[0]!;
    return _app;
  }

  const serviceAccount = loadServiceAccount();
  _app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  logger.info("Firebase Admin SDK initialized");
  return _app;
}

export function getAuth() {
  return getFirebaseAdmin().auth();
}

import * as admin from "firebase-admin";
import { logger } from "./lib/logger";

let _app: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (_app) return _app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var is not set");
  }

  let credential: admin.credential.Credential;
  try {
    const sa = JSON.parse(raw);
    credential = admin.credential.cert(sa);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON — paste the full service account key file");
  }

  if (admin.apps.length > 0) {
    _app = admin.apps[0]!;
    return _app;
  }

  _app = admin.initializeApp({ credential });
  logger.info("Firebase Admin SDK initialized");
  return _app;
}

export function getAuth() {
  return getFirebaseAdmin().auth();
}

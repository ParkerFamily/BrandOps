import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth as _getAuth } from "firebase-admin/auth";
import { createRequire } from "node:module";
import { logger } from "./lib/logger";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

let _serviceAccount: ServiceAccount | null = null;

export function loadServiceAccount(): ServiceAccount {
  if (_serviceAccount) return _serviceAccount;

  for (const envVar of ["FIREBASE_SERVICE_ACCOUNT_JSON", "FIREBASE_SERVICE_ACCOUNT"]) {
    const raw = process.env[envVar];
    if (!raw) continue;
    try {
      _serviceAccount = JSON.parse(raw) as ServiceAccount;
      logger.info({ envVar }, "Loaded Firebase service account from env var");
      return _serviceAccount;
    } catch {
      logger.warn({ envVar }, "Env var is not valid JSON, trying next source");
    }
  }

  try {
    const _require = createRequire(import.meta.url);
    _serviceAccount = _require("./serviceAccount.json") as ServiceAccount;
    return _serviceAccount;
  } catch {
    throw new Error(
      "Firebase Admin: could not load service account. " +
      "Set FIREBASE_SERVICE_ACCOUNT_JSON env var or ensure serviceAccount.json is present."
    );
  }
}

let _adminApp: App | null = null;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApps()[0]!;
    return _adminApp;
  }
  const sa = loadServiceAccount();
  _adminApp = initializeApp({ credential: cert(sa as any) });
  logger.info("Firebase Admin SDK initialized");
  return _adminApp;
}

export function getFirebaseAdmin(): App {
  return getAdminApp();
}

export function getAuth() {
  return _getAuth(getAdminApp());
}

// ── REST-based Firestore write (bypasses gRPC which fails in Replit sandbox) ─

let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (_cachedToken && now < _tokenExpiry - 60) return _cachedToken;

  // Use firebase-admin's own cert credential — proven JWT implementation
  const sa = loadServiceAccount();
  const credential = cert(sa as any);
  const tokenResponse = await credential.getAccessToken();

  _cachedToken = tokenResponse.access_token;
  // google-auth-library tokens expire in 3600s
  _tokenExpiry = now + 3600;
  return _cachedToken;
}

// Convert a plain JS value to Firestore REST field value format
function toFirestoreValue(val: unknown): unknown {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert Firestore REST typed field value back to plain JS
function fromFirestoreValue(val: Record<string, unknown>): unknown {
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) {
    const arr = val.arrayValue as { values?: unknown[] };
    return (arr.values ?? []).map(v => fromFirestoreValue(v as Record<string, unknown>));
  }
  if ("mapValue" in val) {
    const map = val.mapValue as { fields?: Record<string, unknown> };
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(map.fields ?? {})) {
      result[k] = fromFirestoreValue(v as Record<string, unknown>);
    }
    return result;
  }
  return null;
}

export async function readFirestoreDoc<T>(
  collectionName: string,
  docId: string,
): Promise<T | null> {
  const sa = loadServiceAccount();
  const projectId = sa.project_id;
  const token = await getAccessToken();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore REST read failed (${res.status}): ${text}`);
  }
  const body = (await res.json()) as { fields?: Record<string, unknown> };
  if (!body.fields) return null;

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body.fields)) {
    result[k] = fromFirestoreValue(v as Record<string, unknown>);
  }
  return result as T;
}

// ── Firebase Storage upload via REST ─────────────────────────────────────────

const STORAGE_BUCKET = "rareswap-ec574.firebasestorage.app";

export async function uploadToFirebaseStorage(
  fileBuffer: Buffer,
  storagePath: string,
  contentType: string,
): Promise<string> {
  const token = await getAccessToken();
  const uploadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o` +
    `?uploadType=media&name=${encodeURIComponent(storagePath)}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firebase Storage upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { downloadTokens?: string; name?: string };
  const downloadToken = data.downloadTokens ?? "";
  const encodedPath = encodeURIComponent(storagePath);
  return (
    `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}` +
    `?alt=media&token=${downloadToken}`
  );
}

export async function writeFirestoreDoc(
  collection: string,
  docId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const sa = loadServiceAccount();
  const projectId = sa.project_id;
  const token = await getAccessToken();

  const firestoreFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    firestoreFields[k] = toFirestoreValue(v);
  }

  // PATCH with updateMask = merge behaviour (only touches specified fields)
  const fieldMask = Object.keys(fields)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?${fieldMask}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: firestoreFields }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore REST write failed (${res.status}): ${text}`);
  }
}

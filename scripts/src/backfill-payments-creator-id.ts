import { createRequire } from "node:module";
import { cert } from "firebase-admin/app";

const _require = createRequire(import.meta.url);
const serviceAccount = _require("../../artifacts/api-server/src/serviceAccount.json") as {
  project_id: string;
  client_email: string;
  private_key: string;
};

const PROJECT_ID = serviceAccount.project_id;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Auth ──────────────────────────────────────────────────────────────────────

let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (_cachedToken && now < _tokenExpiry - 60) return _cachedToken;
  const credential = cert(serviceAccount as any);
  const t = await credential.getAccessToken();
  _cachedToken = t.access_token;
  _tokenExpiry = now + 3600;
  return _cachedToken;
}

// ── Firestore REST helpers ────────────────────────────────────────────────────

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } };

function fromVal(v: FsValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(fromVal);
  if ("mapValue" in v) {
    const out: Record<string, unknown> = {};
    for (const [k, fv] of Object.entries(v.mapValue.fields ?? {})) out[k] = fromVal(fv);
    return out;
  }
  return null;
}

function toVal(val: unknown): FsValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "string") return { stringValue: val };
  return { stringValue: String(val) };
}

function docToObj(doc: { fields?: Record<string, FsValue> }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) out[k] = fromVal(v);
  return out;
}

async function listCollection(col: string): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const token = await getToken();
  const results: Array<{ id: string; data: Record<string, unknown> }> = [];
  let pageToken: string | undefined;

  do {
    const url = `${BASE}/${col}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List ${col} failed (${res.status}): ${await res.text()}`);
    const body = await res.json() as { documents?: Array<{ name: string; fields?: Record<string, FsValue> }>; nextPageToken?: string };
    for (const doc of body.documents ?? []) {
      const id = doc.name.split("/").pop()!;
      results.push({ id, data: docToObj(doc) });
    }
    pageToken = body.nextPageToken;
  } while (pageToken);

  return results;
}

async function getDoc(col: string, id: string): Promise<Record<string, unknown> | null> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${col}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Get ${col}/${id} failed (${res.status}): ${await res.text()}`);
  const body = await res.json() as { fields?: Record<string, FsValue> };
  return docToObj(body);
}

async function patchDoc(col: string, id: string, fields: Record<string, unknown>): Promise<void> {
  const token = await getToken();
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toVal(v)])) };
  const res = await fetch(`${BASE}/${col}/${id}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Patch ${col}/${id} failed (${res.status}): ${await res.text()}`);
}

// ── Backfill ──────────────────────────────────────────────────────────────────

async function run() {
  console.log("🔍  Listing all payment docs...");
  const payments = await listCollection("payments");
  console.log(`    Found ${payments.length} payment doc(s).`);

  let patched = 0;
  let skipped = 0;
  let errors = 0;

  for (const { id, data } of payments) {
    const needsCreator = !data.creatorId || data.creatorId === "";
    const needsCampaign = !data.campaignId || data.campaignId === "";

    if (!needsCreator && !needsCampaign) {
      skipped++;
      continue;
    }

    const submissionId = data.submissionId as string | undefined;
    if (!submissionId) {
      console.warn(`  ⚠️  payment/${id}: empty creatorId/campaignId but no submissionId — skipping`);
      errors++;
      continue;
    }

    let sub: Record<string, unknown> | null = null;
    try {
      sub = await getDoc("submissions", submissionId);
    } catch (e) {
      console.error(`  ❌  payment/${id}: failed to fetch submission/${submissionId}:`, e);
      errors++;
      continue;
    }

    if (!sub) {
      console.warn(`  ⚠️  payment/${id}: submission/${submissionId} not found — skipping`);
      errors++;
      continue;
    }

    const patch: Record<string, unknown> = {};

    if (needsCreator) {
      const creatorId = (sub.creatorFirebaseUid ?? sub.creatorId ?? "") as string;
      if (creatorId) {
        patch.creatorId = creatorId;
      } else {
        console.warn(`  ⚠️  payment/${id}: submission has no creatorFirebaseUid or creatorId`);
      }
    }

    if (needsCampaign) {
      const campaignId = (sub.campaignDocId ?? sub.campaignId ?? "") as string;
      if (campaignId) {
        patch.campaignId = campaignId;
      } else {
        console.warn(`  ⚠️  payment/${id}: submission has no campaignDocId or campaignId`);
      }
    }

    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }

    try {
      await patchDoc("payments", id, patch);
      console.log(`  ✅  payment/${id} patched:`, patch);
      patched++;
    } catch (e) {
      console.error(`  ❌  payment/${id}: patch failed:`, e);
      errors++;
    }
  }

  console.log(`\n📊  Done — ${patched} patched, ${skipped} already clean, ${errors} errors`);
}

run().catch(e => { console.error(e); process.exit(1); });

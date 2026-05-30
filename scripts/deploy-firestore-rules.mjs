/**
 * Deploy Firestore security rules to Firebase via REST API.
 * Requires FIREBASE_SERVICE_ACCOUNT env var (full service account JSON as a string).
 * Usage: node scripts/deploy-firestore-rules.mjs
 */
import { readFileSync } from "fs";
import { createSign } from "crypto";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error("FIREBASE_SERVICE_ACCOUNT env var not set (must be the full service account JSON)");
  process.exit(1);
}
const sa = JSON.parse(raw);
const rules = readFileSync("firestore.rules", "utf8");

function buildJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase"
  })).toString("base64url");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key, "base64url");
  return `${header}.${payload}.${sig}`;
}

async function getAccessToken() {
  const jwt = buildJwt();
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(JSON.stringify(data));
  return data.access_token;
}

const token = await getAccessToken();
console.log("Got access token ✓");

const rulesetRes = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${sa.project_id}/rulesets`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: rules }] } })
  }
);
const ruleset = await rulesetRes.json();
if (!ruleset.name) throw new Error("Ruleset creation failed: " + JSON.stringify(ruleset));
console.log("Created ruleset:", ruleset.name);

const releaseRes = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${sa.project_id}/releases/cloud.firestore`,
  {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      release: {
        name: `projects/${sa.project_id}/releases/cloud.firestore`,
        rulesetName: ruleset.name
      }
    })
  }
);
const release = await releaseRes.json();
if (!release.name) throw new Error("Release update failed: " + JSON.stringify(release));
console.log("✓ Firestore rules deployed successfully");
console.log("  Ruleset:", ruleset.name);
console.log("  Updated:", release.updateTime);

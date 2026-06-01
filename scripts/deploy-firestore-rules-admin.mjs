/**
 * Deploy Firestore security rules using firebase-admin (avoids manual JWT signing).
 * Usage: node scripts/deploy-firestore-rules-admin.mjs
 */
import { readFileSync } from "fs";
import { createRequire } from "module";

// firebase-admin lives in the api-server package — resolve from there
const _require = createRequire(
  new URL("../artifacts/api-server/package.json", import.meta.url)
);

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  try {
    return JSON.parse(readFileSync("artifacts/api-server/src/serviceAccount.json", "utf8"));
  } catch {
    console.error("Cannot load service account");
    process.exit(1);
  }
}

const sa = loadServiceAccount();
const rules = readFileSync("firestore.rules", "utf8");

const admin = _require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

// Get access token via firebase-admin credential
const token = await admin.app().options.credential.getAccessToken();
const accessToken = token.access_token;
console.log("Got access token ✓");

const projectId = sa.project_id;

// Create ruleset
const rulesetRes = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: rules }] } }),
  }
);
const ruleset = await rulesetRes.json();
if (!ruleset.name) throw new Error("Ruleset creation failed: " + JSON.stringify(ruleset));
console.log("Created ruleset:", ruleset.name);

// Attach ruleset to Firestore release
const releaseRes = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`,
  {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: ruleset.name,
      },
    }),
  }
);
const release = await releaseRes.json();
if (!release.name) throw new Error("Release update failed: " + JSON.stringify(release));
console.log("✓ Firestore rules deployed successfully");
console.log("  Ruleset:", ruleset.name);
console.log("  Updated:", release.updateTime);

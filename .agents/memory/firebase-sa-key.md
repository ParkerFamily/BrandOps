---
name: Firebase service account key rotation
description: History of SA key rotations and what to do when a key stops working
---

**Active key:** `5bb3c06352763ab419e02e7bec02db3c8972335f` (as of 2026-06-02)

**Revoked keys:** ee7c271c (original), 3e7c6eeb (first replacement — immediately revoked)

**Symptom when key is revoked:** `invalid_grant: Invalid JWT Signature` from `oauth2.googleapis.com/token` — NOT a code bug.

**Diagnosis:** Run the inline Node.js test in a bash shell to confirm the key works before updating the file:
```js
// sign a JWT manually with createSign('RSA-SHA256') + fetch oauth2.googleapis.com/token
// status 200 = key is valid; status 400 invalid_grant = key is revoked
```

**Where to update:**
1. `artifacts/api-server/src/serviceAccount.json` — file used at runtime (copied to dist/ by build)
2. `FIREBASE_SERVICE_ACCOUNT_JSON` Replit secret — set this to the full JSON so production deployments work without the bundled file

**Both env vars** (`FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_SERVICE_ACCOUNT`) are currently set to non-JSON garbage in Replit secrets. The server falls back to the bundled file. For production resilience, update `FIREBASE_SERVICE_ACCOUNT_JSON` secret with the full JSON content.

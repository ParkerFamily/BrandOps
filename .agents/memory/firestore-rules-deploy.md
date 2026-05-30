---
name: Firestore rules deployment
description: How to deploy firestore.rules to Firebase project rareswap-ec574 from Replit
---

Deploy via REST API — not firebase CLI (deprecated --token flag returns 401).

**Script:** `node scripts/deploy-firestore-rules.mjs`

**Requires:** `FIREBASE_SERVICE_ACCOUNT` secret must be the full service account JSON string (not a Firebase CI token hash).

**Why:** `firebase deploy --only firestore:rules` fails with 403 because the service account lacks `serviceusage.googleapis.com` permission. Direct Firebase Rules REST API (`firebaserules.googleapis.com`) works fine with the same service account.

**How to apply:** Any time `firestore.rules` changes, run the script. It gets an OAuth2 token from the service account, POSTs a new ruleset, then PATCHes the `cloud.firestore` release to point to it.

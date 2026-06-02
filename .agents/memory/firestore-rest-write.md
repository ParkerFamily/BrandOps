---
name: Firestore REST write architecture
description: Why and how Firestore writes go through REST API instead of Admin SDK gRPC in this project
---

Firebase Admin SDK gRPC connection to Firestore (`firestore.googleapis.com:443`) is blocked in the Replit sandbox — calls fail with `16 UNAUTHENTICATED`. The REST API (`firestore.googleapis.com/v1/...`) works fine over HTTPS.

**Solution:** `writeFirestoreDoc(collection, docId, fields)` in `artifacts/api-server/src/firebaseAdmin.ts` — uses `cert()` from `firebase-admin/app` to get an OAuth2 token, then PATCHes the Firestore REST endpoint with an `updateMask` (merge behaviour).

**Why:** gRPC uses a persistent channel that the sandbox firewall drops; HTTPS fetch is unrestricted.

**How to apply:** Any server-side Firestore write must use `writeFirestoreDoc()`, never `getFirestore().collection(...).set()`. Firebase Auth token verification (read-only, uses Google public keys) still works via the normal Admin SDK.

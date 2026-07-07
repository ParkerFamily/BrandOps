import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v1";
import { onSubmissionCreatedNotify, onSubmissionUpdatedNotify, onPaymentCreatedNotify, onPaymentUpdatedNotify } from "./notifications";

initializeApp();

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

/** Reject a second Firestore profile for an email that already belongs to another uid. */
async function findConflictingUserDoc(
  db: Firestore,
  uid: string,
  email: string | null,
  emailLower: string | null,
): Promise<QueryDocumentSnapshot | null> {
  const seen = new Map<string, QueryDocumentSnapshot>();

  if (email) {
    const byEmail = await db.collection("users").where("email", "==", email).limit(5).get();
    for (const doc of byEmail.docs) {
      if (doc.id !== uid) seen.set(doc.id, doc);
    }
  }

  if (emailLower) {
    const byLower = await db.collection("users").where("emailLower", "==", emailLower).limit(5).get();
    for (const doc of byLower.docs) {
      if (doc.id !== uid) seen.set(doc.id, doc);
    }
  }

  return seen.values().next().value ?? null;
}

/** Ensure every Firebase Auth user gets a Firestore profile doc (one email → one uid). */
export const onAuthUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = getFirestore();
  const auth = getAuth();
  const email = user.email?.trim() || null;
  const emailLower = normalizeEmail(email);

  if (email || emailLower) {
    const conflict = await findConflictingUserDoc(db, user.uid, email, emailLower);
    if (conflict) {
      functions.logger.warn("Blocked duplicate user profile for email", {
        email,
        newUid: user.uid,
        canonicalUid: conflict.id,
      });
      try {
        await auth.deleteUser(user.uid);
      } catch (error) {
        functions.logger.error("Failed to delete duplicate auth user", { uid: user.uid, error });
      }
      return;
    }
  }

  await db.doc(`users/${user.uid}`).set(
    {
      email,
      emailLower,
      displayName: user.displayName ?? null,
      onboardingComplete: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
});

export { onSubmissionCreatedNotify, onSubmissionUpdatedNotify, onPaymentCreatedNotify, onPaymentUpdatedNotify };

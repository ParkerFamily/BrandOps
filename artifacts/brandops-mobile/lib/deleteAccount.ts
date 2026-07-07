import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
} from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import { resetOnboardingSession } from "@/lib/onboardingStorage";
import { clearPendingWorkspaceSwitch } from "@/lib/workspaceSetup";

export class AccountDeletionRequiresRecentLogin extends Error {
  constructor() {
    super("requires-recent-login");
    this.name = "AccountDeletionRequiresRecentLogin";
  }
}

async function reauthenticateEmailUser(user: User, password: string): Promise<void> {
  const email = user.email?.trim();
  if (!email) {
    throw new Error("This account has no email address. Sign out, sign in again, then retry deletion.");
  }
  const credential = EmailAuthProvider.credential(email, password);
  await reauthenticateWithCredential(user, credential);
}

/** Permanently deletes the signed-in Firebase account and local BrandOps session data. */
export async function deleteBrandOpsAccount(recentPassword?: string): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) throw new Error("Firebase is not configured.");

  const user = firebase.auth.currentUser;
  if (!user) throw new Error("You must be signed in to delete your account.");

  if (recentPassword?.trim()) {
    await reauthenticateEmailUser(user, recentPassword.trim());
  }

  try {
    await deleteDoc(doc(firebase.db, "users", user.uid)).catch(() => {
      // Non-fatal — auth deletion is the source of truth for account removal.
    });
    await deleteUser(user);
    await resetOnboardingSession();
    await clearPendingWorkspaceSwitch();
  } catch (err: unknown) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "auth/requires-recent-login") {
      throw new AccountDeletionRequiresRecentLogin();
    }
    throw err;
  }
}

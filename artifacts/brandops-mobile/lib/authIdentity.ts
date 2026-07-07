import {
  fetchSignInMethodsForEmail,
  signInWithCredential,
  type Auth,
  type AuthCredential,
  type UserCredential,
} from "firebase/auth";

export function normalizeAccountEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function formatAuthProviderLabel(providerId: string): string {
  if (providerId === "password") return "email and password";
  if (providerId === "google.com") return "Google";
  if (providerId === "apple.com") return "Apple";
  return providerId;
}

export async function assertEmailAvailableForPasswordSignUp(auth: Auth, email: string): Promise<void> {
  const methods = await fetchSignInMethodsForEmail(auth, email.trim());
  if (methods.length === 0) return;

  const labels = methods.map(formatAuthProviderLabel).join(" or ");
  throw new Error(`An account already exists for this email. Sign in with ${labels} instead.`);
}

export async function signInWithCredentialGuarded(
  auth: Auth,
  credential: AuthCredential
): Promise<UserCredential> {
  try {
    return await signInWithCredential(auth, credential);
  } catch (err: unknown) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "auth/account-exists-with-different-credential") {
      throw new Error(
        "This email is already registered with a different sign-in method. Use your original sign-in method for this email."
      );
    }
    if (code === "auth/email-already-in-use") {
      throw new Error("An account already exists for this email. Sign in instead of creating a new account.");
    }
    throw err;
  }
}

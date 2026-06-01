import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { setOnboarded, getOnboarded, clearOnboarded, type OnboardingData } from "@/lib/onboarding";
import { fsGetUserProfile, fsSetUserProfile } from "@/lib/firestore";

const BASE = import.meta.env.BASE_URL;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  onboarded: boolean | null;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  markOnboarded: (data: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboardedState] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setOnboardedState(null);
        setLoading(false);
        return;
      }

      // Fast path: localStorage / cookie hit
      const local = getOnboarded();
      if (local) {
        setOnboardedState(true);
        setLoading(false);
        // Backfill Firestore + server in background
        fsSetUserProfile(firebaseUser.uid, local).catch(() => {});
        fetch(`${BASE}api/users/${firebaseUser.uid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(local),
        }).catch(() => {});
        return;
      }

      // Slow path: check Firestore + API in parallel — source of truth for "has this user onboarded?"
      setLoading(true);
      try {
        // Run Firestore read and API check in parallel so neither blocks the other
        const [fsProfile, apiRes] = await Promise.allSettled([
          fsGetUserProfile(firebaseUser.uid),
          fetch(`${BASE}api/users/${firebaseUser.uid}`),
        ]);

        // Check Firestore first
        if (fsProfile.status === "fulfilled" && fsProfile.value) {
          const profile = fsProfile.value;
          // Doc exists → user is known, treat as onboarded regardless of field value
          if (profile.onboardingData) {
            setOnboarded(profile.onboardingData as OnboardingData);
          }
          setOnboardedState(true);
          setLoading(false);
          return;
        }

        // Firestore miss or failure → try API result
        if (apiRes.status === "fulfilled" && apiRes.value.ok) {
          const status = await apiRes.value.json() as { onboarded: boolean; onboardingData?: unknown };
          if (status.onboarded) {
            // User exists in DB — they've been through onboarding before
            if (status.onboardingData) {
              setOnboarded(status.onboardingData as OnboardingData);
            }
            setOnboardedState(true);
            setLoading(false);
            return;
          }
        }

        // Neither source has a record → genuinely new user
        setOnboardedState(false);
      } catch {
        setOnboardedState(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const markOnboarded = useCallback(async (data: Record<string, unknown>) => {
    setOnboarded(data as OnboardingData);
    setOnboardedState(true);
    if (user) {
      // Write to Firestore (primary) and PostgreSQL (backup) in parallel
      await Promise.allSettled([
        fsSetUserProfile(user.uid, data),
        fetch(`${BASE}api/users/${user.uid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      ]);
    }
  }, [user]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    setUser({ ...cred.user, displayName });
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    clearOnboarded();
    setOnboardedState(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, onboarded, signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword, logout, markOnboarded }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

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
import { setOnboarded, getOnboarded, clearOnboarded } from "@/lib/onboarding";

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

async function fetchOnboardingStatus(uid: string): Promise<{ onboarded: boolean; onboardingData?: Record<string, unknown> }> {
  try {
    const res = await fetch(`${BASE}api/users/${uid}`);
    if (!res.ok) return { onboarded: false };
    return await res.json();
  } catch {
    return { onboarded: false };
  }
}

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
      // Fast path: check local storage / cookie
      const local = getOnboarded();
      if (local) {
        setOnboardedState(true);
        setLoading(false);
        // Backfill server in background (fire-and-forget)
        fetch(`${BASE}api/users/${firebaseUser.uid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(local),
        }).catch(() => {});
        return;
      }
      // Slow path: check server
      setLoading(true);
      const status = await fetchOnboardingStatus(firebaseUser.uid);
      if (status.onboarded && status.onboardingData) {
        // Restore into local storage / cookie from server record
        setOnboarded(status.onboardingData as Parameters<typeof setOnboarded>[0]);
        setOnboardedState(true);
      } else {
        setOnboardedState(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const markOnboarded = useCallback(async (data: Record<string, unknown>) => {
    setOnboarded(data as Parameters<typeof setOnboarded>[0]);
    setOnboardedState(true);
    if (user) {
      try {
        await fetch(`${BASE}api/users/${user.uid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch { /* non-fatal */ }
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

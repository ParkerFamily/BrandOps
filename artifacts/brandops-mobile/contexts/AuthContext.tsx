import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser, UserRole } from "@/lib/types";
import { getFirebase } from "@/lib/firebase";
import { isFirebaseConfigured } from "@/lib/env";
import { hydrateSessionFromFirestore, syncUserProfileToFirestore } from "@/lib/userProfile";
import { clearPendingWorkspaceSwitch, enableCreatorWorkspace, readWorkspacesSetup } from "@/lib/workspaceSetup";
import { resolveSessionRole } from "@/lib/roleExperience";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

const ROLE_KEY = "brandops:userRole:v2";

type AuthContextType = {
  user: AppUser | null;
  /** Firebase session — true after sign-in even while role hydrates. */
  isAuthenticated: boolean;
  /** Firebase Auth uid — available before role/workspace hydrates. */
  authUid: string | null;
  /** Firebase Auth email — available before role hydrates. */
  authEmail: string | null;
  loading: boolean;
  role: UserRole | null;
  setRole: (role: UserRole) => Promise<void>;
  clearRole: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signUpWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  usingFirebase: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

function requireFirebase() {
  const bundle = getFirebase();
  if (!bundle) {
    throw new Error("Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to .env and restart.");
  }
  return bundle;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const usingFirebase = isFirebaseConfigured();
  const firebase = usingFirebase ? getFirebase() : null;

  const [loading, setLoading] = useState(true);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);

  useEffect(() => {
    let unsub = () => {};

    (async () => {
      const storedRole = (await AsyncStorage.getItem(ROLE_KEY)) as UserRole | null;
      setRoleState(storedRole);

      if (!firebase) {
        setLoading(false);
        return;
      }

      unsub = onAuthStateChanged(firebase.auth, (u) => {
        setFbUser(u);
        if (u) {
          void (async () => {
            const session = await hydrateSessionFromFirestore(u.uid);
            let setup = await readWorkspacesSetup();
            if (session.role === "creator" && !setup.creator) {
              setup = await enableCreatorWorkspace(true);
            }
            const cached = (await AsyncStorage.getItem(ROLE_KEY)) as UserRole | null;
            const resolved = resolveSessionRole(session.role, cached, setup);
            if (resolved) {
              await setRole(resolved);
            }
          })();
        } else {
          setRoleState(null);
        }
        setLoading(false);
      });
    })();

    return () => unsub();
  }, [firebase]);

  const user: AppUser | null = useMemo(() => {
    if (!firebase || !fbUser || !role) return null;
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      role,
    };
  }, [firebase, fbUser, role]);

  const setRole = async (r: UserRole) => {
    await AsyncStorage.setItem(ROLE_KEY, r);
    setRoleState(r);
  };

  const clearRole = async () => {
    await AsyncStorage.removeItem(ROLE_KEY);
    setRoleState(null);
  };

  const hydrateAfterSignIn = async (authUser: User, mode: "signin" | "signup") => {
    if (mode === "signin") {
      const session = await hydrateSessionFromFirestore(authUser.uid);
      let setup = await readWorkspacesSetup();
      if (session.role === "creator" && !setup.creator) {
        setup = await enableCreatorWorkspace(true);
      }
      const cached = (await AsyncStorage.getItem(ROLE_KEY)) as UserRole | null;
      const resolved = resolveSessionRole(session.role, cached, setup);
      if (resolved) {
        await setRole(resolved);
      }
    }

    const resolvedRole = (await AsyncStorage.getItem(ROLE_KEY)) as UserRole | null;
    if (resolvedRole) {
      try {
        await syncUserProfileToFirestore({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          role: resolvedRole,
        });
      } catch (error) {
        console.warn("[BrandOps] Firestore profile sync failed:", error);
      }
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const { auth } = requireFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    setFbUser(cred.user);
    await hydrateAfterSignIn(cred.user, "signup");
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { auth } = requireFirebase();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setFbUser(cred.user);
    await hydrateAfterSignIn(cred.user, "signin");
  };

  const signInWithGoogle = async (idToken: string) => {
    const { auth } = requireFirebase();
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    setFbUser(cred.user);
    await hydrateAfterSignIn(cred.user, "signin");
  };

  const signUpWithGoogle = async (idToken: string) => {
    const { auth } = requireFirebase();
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    setFbUser(cred.user);
    await hydrateAfterSignIn(cred.user, "signup");
  };

  const logout = async () => {
    if (!firebase) return;
    await signOut(firebase.auth);
    setFbUser(null);
    await clearRole();
    await clearPendingWorkspaceSwitch();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(fbUser),
        authUid: fbUser?.uid ?? null,
        authEmail: fbUser?.email ?? null,
        loading,
        role,
        setRole,
        clearRole,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signUpWithGoogle,
        logout,
        usingFirebase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

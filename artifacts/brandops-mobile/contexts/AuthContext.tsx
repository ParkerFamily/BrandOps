import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppUser, UserRole } from "@/lib/types";
import { getFirebase } from "@/lib/firebase";
import { isFirebaseConfigured } from "@/lib/env";
import { hydrateSessionFromFirestore, syncUserProfileToFirestore } from "@/lib/userProfile";
import {
  clearPendingWorkspaceSwitch,
  enableCreatorWorkspace,
  readWorkspacesSetup,
  writeWorkspacesSetup,
} from "@/lib/workspaceSetup";
import { resolveSessionRole } from "@/lib/roleExperience";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import type { AppleAuthCredentials } from "@/lib/appleSignIn";
import {
  assertEmailAvailableForPasswordSignUp,
  signInWithCredentialGuarded,
} from "@/lib/authIdentity";
import { deleteBrandOpsAccount } from "@/lib/deleteAccount";

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
  /** True once Firestore has a provisioned role for this account. */
  profileComplete: boolean;
  role: UserRole | null;
  setRole: (role: UserRole) => Promise<void>;
  clearRole: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signUpWithGoogle: (idToken: string) => Promise<void>;
  signInWithApple: (credentials: AppleAuthCredentials) => Promise<void>;
  signUpWithApple: (credentials: AppleAuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (recentPassword?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [sessionHydrating, setSessionHydrating] = useState(false);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const lastUidRef = useRef<string | null>(null);

  const setRole = async (r: UserRole) => {
    await AsyncStorage.setItem(ROLE_KEY, r);
    setRoleState(r);
  };

  const clearRole = async () => {
    await AsyncStorage.removeItem(ROLE_KEY);
    setRoleState(null);
  };

  const resolveRoleForUser = async (uid: string, hydrated?: Awaited<ReturnType<typeof hydrateSessionFromFirestore>>): Promise<UserRole | null> => {
    const session = hydrated ?? (await hydrateSessionFromFirestore(uid));
    let setup = await readWorkspacesSetup();
    if (session.role === "creator" && !setup.creator) {
      setup = await enableCreatorWorkspace(true);
    } else if (session.role === "brand" || session.role === "agency" || session.role === "creator_manager") {
      setup = {
        ...setup,
        brand: session.role === "brand" || session.role === "agency" ? true : setup.brand,
        primary: session.role === "creator_manager" ? setup.primary : "brand",
      };
      await writeWorkspacesSetup(setup);
    }
    const cached = (await AsyncStorage.getItem(ROLE_KEY)) as UserRole | null;
    let resolved = resolveSessionRole(session.role, cached, setup);
    if (!resolved && setup.brand) resolved = "brand";
    if (!resolved && setup.creator) resolved = "creator";
    return resolved;
  };

  const applyFirebaseSession = async (authUser: User) => {
    if (lastUidRef.current && lastUidRef.current !== authUser.uid) {
      await clearRole();
    }
    lastUidRef.current = authUser.uid;

    setSessionHydrating(true);
    try {
      const session = await hydrateSessionFromFirestore(authUser.uid);
      setProfileComplete(Boolean(session.role));
      const resolved = await resolveRoleForUser(authUser.uid, session);
      if (resolved) {
        await setRole(resolved);
      }
    } finally {
      setSessionHydrating(false);
    }
  };

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
          void applyFirebaseSession(u).finally(() => setLoading(false));
        } else {
          lastUidRef.current = null;
          setRoleState(null);
          setProfileComplete(false);
          setSessionHydrating(false);
          setLoading(false);
        }
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
      photoURL: fbUser.photoURL,
      role,
    };
  }, [firebase, fbUser, role]);

  const hydrateAfterSignIn = async (authUser: User, mode: "signin" | "signup") => {
    if (mode === "signin") {
      await applyFirebaseSession(authUser);
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
    await assertEmailAvailableForPasswordSignUp(auth, email);
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
    const cred = await signInWithCredentialGuarded(auth, credential);
    setFbUser(cred.user);
    await hydrateAfterSignIn(cred.user, "signin");
  };

  const signUpWithGoogle = async (idToken: string) => {
    const { auth } = requireFirebase();
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredentialGuarded(auth, credential);
    setFbUser(cred.user);
    await hydrateAfterSignIn(cred.user, "signup");
  };

  const signInWithAppleCredential = async (
    credentials: AppleAuthCredentials,
    mode: "signin" | "signup"
  ) => {
    const { auth } = requireFirebase();
    const provider = new OAuthProvider("apple.com");
    const credential = provider.credential({
      idToken: credentials.identityToken,
      rawNonce: credentials.rawNonce,
    });
    const cred = await signInWithCredentialGuarded(auth, credential);

    const displayName = credentials.fullName?.trim();
    if (displayName && !cred.user.displayName) {
      await updateProfile(cred.user, { displayName });
    }

    setFbUser(cred.user);
    await hydrateAfterSignIn(cred.user, mode);
  };

  const signInWithApple = async (credentials: AppleAuthCredentials) => {
    await signInWithAppleCredential(credentials, "signin");
  };

  const signUpWithApple = async (credentials: AppleAuthCredentials) => {
    await signInWithAppleCredential(credentials, "signup");
  };

  const refreshProfile = async () => {
    if (!fbUser) return;
    await applyFirebaseSession(fbUser);
  };

  const deleteAccount = async (recentPassword?: string) => {
    await deleteBrandOpsAccount(recentPassword);
    setFbUser(null);
    setProfileComplete(false);
    await clearRole();
  };

  const logout = async () => {
    if (!firebase) return;
    await signOut(firebase.auth);
    setFbUser(null);
    setProfileComplete(false);
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
        loading: loading || (Boolean(fbUser) && sessionHydrating),
        profileComplete,
        role,
        setRole,
        clearRole,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signUpWithGoogle,
        signInWithApple,
        signUpWithApple,
        logout,
        deleteAccount,
        refreshProfile,
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

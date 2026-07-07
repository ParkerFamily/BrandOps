import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { env, isFirebaseConfigured } from "@/lib/env";

type FirebaseBundle = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
};

let cached: FirebaseBundle | null = null;

function createAuth(app: FirebaseApp): Auth {
  // Must initialize with AsyncStorage persistence first — getAuth() alone does not
  // persist sessions on React Native, so reloads look like a sign-out.
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export function getFirebase(): FirebaseBundle | null {
  if (!isFirebaseConfigured()) return null;
  if (cached) return cached;

  const firebaseConfig = {
    apiKey: env.firebase.apiKey!,
    authDomain: env.firebase.authDomain!,
    projectId: env.firebase.projectId!,
    storageBucket: env.firebase.storageBucket!,
    messagingSenderId: env.firebase.messagingSenderId!,
    appId: env.firebase.appId!,
  };

  const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  cached = { app, auth: createAuth(app), db: getFirestore(app), storage: getStorage(app) };
  return cached;
}

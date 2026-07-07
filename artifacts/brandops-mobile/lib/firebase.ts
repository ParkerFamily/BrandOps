import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
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
  if (Platform.OS === "web") {
    return getAuth(app);
  }

  try {
    const { getReactNativePersistence, initializeAuth: initAuth } = require("firebase/auth") as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
      initializeAuth: typeof initializeAuth;
    };

    return initAuth(app, {
      // @ts-expect-error getReactNativePersistence is provided by Metro's RN firebase/auth bundle.
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    try {
      return getAuth(app);
    } catch {
      return initializeAuth(app);
    }
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

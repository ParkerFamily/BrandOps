import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKptUdVeucJZyWTNChL6cd9Kn0VwE4fRs",
  authDomain: "rareswap-ec574.firebaseapp.com",
  projectId: "rareswap-ec574",
  storageBucket: "rareswap-ec574.firebasestorage.app",
  messagingSenderId: "1041255855912",
  appId: "1:1041255855912:web:eb9444452933fd40c0021d",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

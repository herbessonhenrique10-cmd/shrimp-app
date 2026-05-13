import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import {
  Auth,
  browserLocalPersistence,
  getAuth,
  // @ts-expect-error - getReactNativePersistence is exported from firebase/auth but not in types in v12
  getReactNativePersistence,
  initializeAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyD_3NaN1bTw4ft6MG0IiVk5RyOUEoW3LUA",
  authDomain: "gesto-camarao.firebaseapp.com",
  projectId: "gesto-camarao",
  storageBucket: "gesto-camarao.firebasestorage.app",
  messagingSenderId: "253590269432",
  appId: "1:253590269432:web:e444827abc3a3c50c3ba0d",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let _auth: Auth;
if (Platform.OS === "web") {
  _auth = getAuth(app);
  // Explicitly use localStorage persistence for Electron/web compatibility
  setPersistence(_auth, browserLocalPersistence).catch(() => {});
} else {
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    _auth = getAuth(app);
  }
}

export const auth = _auth;
export const db = getFirestore(app);
export default app;

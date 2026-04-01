import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, 
  // @ts-ignore
  getReactNativePersistence 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSy...",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "vibers-vibers.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "vibers-vibers",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "vibers-vibers.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

const app = initializeApp(firebaseConfig);

const auth = Platform.OS === "web" 
  ? getAuth(app) 
  : initializeAuth(app, {
      // @ts-ignore
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });

const db = getFirestore(app);

export { auth, db };
export default app;

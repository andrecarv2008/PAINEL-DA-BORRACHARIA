import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseAppletConfig from "../firebase-applet-config.json";

// Robust health check helper to sanitize and filter environment variables
function cleanEnvValue(value: string | undefined): string | null {
  if (!value) return null;
  const clean = value.trim().replace(/^['"]|['"]$/g, "");
  if (
    clean === "" ||
    clean.includes("...") ||
    clean.includes("SEU_") ||           // Portuguese placeholder prefix eg. SEU_APP_ID
    clean.includes("YOUR_") ||          // English placeholder prefix
    clean.toLowerCase().includes("placeholder") ||
    clean.toLowerCase().includes("todo")
  ) {
    return null;
  }
  return clean;
}

// Check if we should fall back to the fully working auto-provisioned applet config
const rawApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const cleanApiKey = cleanEnvValue(rawApiKey);
const useAppletConfig = !cleanApiKey || !cleanApiKey.startsWith("AIza") || cleanApiKey.length < 20;

// Dynamic configuration prioritizing Environment Variables (for production deployment like Vercel)
// with a clean, validated fallback to the local AI Studio applet config.
export const firebaseConfig = {
  apiKey: useAppletConfig ? firebaseAppletConfig.apiKey : cleanApiKey!,
  authDomain: useAppletConfig 
    ? firebaseAppletConfig.authDomain 
    : (cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) || firebaseAppletConfig.authDomain),
  projectId: useAppletConfig 
    ? firebaseAppletConfig.projectId 
    : (cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || firebaseAppletConfig.projectId),
  storageBucket: useAppletConfig 
    ? firebaseAppletConfig.storageBucket 
    : (cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || firebaseAppletConfig.storageBucket),
  messagingSenderId: useAppletConfig 
    ? firebaseAppletConfig.messagingSenderId 
    : (cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || firebaseAppletConfig.messagingSenderId),
  appId: useAppletConfig 
    ? firebaseAppletConfig.appId 
    : (cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) || firebaseAppletConfig.appId),
  measurementId: useAppletConfig 
    ? (firebaseAppletConfig.measurementId || "") 
    : (cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) || firebaseAppletConfig.measurementId || ""),
};

// Firestore Database ID dynamic choice
const firestoreDatabaseId = useAppletConfig 
  ? firebaseAppletConfig.firestoreDatabaseId 
  : (cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID) || firebaseAppletConfig.firestoreDatabaseId);

// Initialize app securely
const app = initializeApp(firebaseConfig);

// Initialize DB and Auth
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);

// Provider Config
export const googleProvider = new GoogleAuthProvider();

// Error diagnostic helper as specified in the Firebase Skill guide
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Exception Diagnosed: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Function to validate Firestore connection on boot as requested by instructions
export async function testConnection(): Promise<boolean> {
  const { doc, getDocFromServer } = await import("firebase/firestore");
  
  // Try up to 3 times to allow the SDK network core to initialize and establish connection
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await getDocFromServer(doc(db, "test", "connection"));
      return true;
    } catch (error) {
      // If we receive a credential/permission error, it means we reached the server
      // and the server responded, confirming we are online and successfully connected.
      if (
        error instanceof Error &&
        (error.message.includes("permission") ||
          (error as any).code === "permission-denied" ||
          (error as any).code === "unauthenticated")
      ) {
        return true;
      }

      // If it is another error and we have retries left, wait briefly and retry
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // Final attempt failure logging
      if (error instanceof Error && error.message.includes("the client is offline")) {
        console.error("Please check your Firebase configuration: Client reported as offline.");
      } else {
        console.warn("Firestore connection validation handled a warning on boot:", error);
      }
    }
  }
  return false;
}

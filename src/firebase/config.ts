import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  Firestore, 
  doc, 
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const getInitialApiKey = (): string => {
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 15) {
    return envKey.trim();
  }
  try {
    const localKey = localStorage.getItem('codexa_firebase_api_key');
    if (localKey && localKey.trim().length > 15) {
      return localKey.trim();
    }
  } catch (e) {
    // localStorage not accessible
  }
  return "AIzaSyCfP8PY9G0u8-TkZu7XKHS_2lEQIzY9i98";
};

export const currentApiKey = getInitialApiKey();
export const isFirebaseConfigured = Boolean(currentApiKey && currentApiKey.length > 15);

export const firebaseConfig = {
  apiKey: currentApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "codexa-d0a6e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "codexa-d0a6e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "codexa-d0a6e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "888111826361",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:888111826361:web:84db6bc0d1b21c7c48a268",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    
    // Initialize Firestore with auto-detect long polling and multi-tab persistent cache for rock-solid stability
    try {
      db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (fsErr) {
      // Fallback to standard getFirestore if already initialized
      db = getFirestore(app);
    }

    storage = getStorage(app);
  } catch (error) {
    console.warn("Firebase initialization warning:", error);
  }
}

export { app, auth, db, storage };

export function saveFirebaseApiKey(key: string): boolean {
  if (!key || key.trim().length < 15) return false;
  try {
    localStorage.setItem('codexa_firebase_api_key', key.trim());
    window.location.reload();
    return true;
  } catch (e) {
    console.error("Failed to save API key to localStorage:", e);
    return false;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function validateFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'system', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore operates in offline/local-cache mode when backend is unreachable.");
    }
    return false;
  }
}

// NovaVid AI Studio — Official Firebase SDK Integration
// Project: novavid-ecfc8
// Brand: LODHI TECHX

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  Firestore,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  FirebaseStorage,
} from "firebase/storage";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForInitializationPlaceholder",
  authDomain: "novavid-ecfc8.firebaseapp.com",
  projectId: "novavid-ecfc8",
  storageBucket: "novavid-ecfc8.firebasestorage.app",
  messagingSenderId: "566848341353",
  appId: "1:566848341353:web:7b3ec023671650659729f8",
  measurementId: "G-W8W71EES1N",
};

// 1. Prevent duplicate initialization
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Export core initialized services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// 3. Conditional browser-only analytics initialization
let analyticsInstance: Analytics | null = null;
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  if (typeof window !== "undefined") {
    try {
      const supported = await isSupported();
      if (supported) {
        analyticsInstance = getAnalytics(app);
        return analyticsInstance;
      }
    } catch {
      // Analytics unsupported in current environment (e.g. desktop webview / test runner)
    }
  }
  return null;
}

// 4. Firebase Authentication Helpers
export async function registerWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// 5. Cloud Firestore Data Models & Helpers
export interface UserProfileDocument {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  tenantId: string | null;
  role: "creator" | "agency" | "admin" | "owner";
  createdAt: string;
  updatedAt: string;
}

export interface CloudProjectDocument {
  id: string;
  userId: string;
  name: string;
  topic: string;
  language: string;
  durationFormat: string;
  status: "draft" | "queued" | "completed";
  createdAt: string;
  updatedAt: string;
}

export async function saveUserProfile(user: User, role: UserProfileDocument["role"] = "creator"): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const now = new Date().toISOString();
  const profile: UserProfileDocument = {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    tenantId: null,
    role,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(userRef, profile, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfileDocument | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfileDocument;
  }
  return null;
}

export async function saveCloudProject(project: CloudProjectDocument): Promise<void> {
  const projRef = doc(db, "cloud_projects", project.id);
  await setDoc(projRef, project, { merge: true });
}

export async function listUserCloudProjects(userId: string): Promise<CloudProjectDocument[]> {
  const q = query(collection(db, "cloud_projects"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as CloudProjectDocument);
}

// 6. Firebase Storage Helpers
export async function uploadUserAsset(userId: string, filename: string, fileData: Blob | Uint8Array): Promise<string> {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const assetRef = ref(storage, `users/${userId}/assets/${Date.now()}_${safeFilename}`);
  const snapshot = await uploadBytes(assetRef, fileData);
  return await getDownloadURL(snapshot.ref);
}

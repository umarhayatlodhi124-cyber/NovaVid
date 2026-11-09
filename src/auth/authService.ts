// NovaVid AI Studio — Firebase Authentication Service
// Brand: LODHI TECHX
// Target Project: novavid-ecfc8

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { isTauriEnvironment } from "../lib/platformStorage";
import type { UserProfile, UserRole, SubscriptionPlan } from "./AuthContext";

// Google OAuth2 Web Client ID for desktop loopback sign-in
const GOOGLE_WEB_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string) ||
  "566848341353-auto.apps.googleusercontent.com";

export const PERMANENT_OWNER_EMAILS = [
  "umarhayatlodhi124@gmail.com",
  "umarhayatlodhi25@gmail.com",
];

export function isPermanentOwner(email?: string | null): boolean {
  if (!email) return false;
  return PERMANENT_OWNER_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Syncs user profile document in Firestore: users/{uid}
 */
export async function syncUserProfile(user: User, customName?: string): Promise<UserProfile> {
  const isOwner = isPermanentOwner(user.email);
  const userRef = doc(db, "users", user.uid);
  const now = new Date().toISOString();

  let existingData: Partial<UserProfile> = {};
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      existingData = snap.data() as Partial<UserProfile>;
    }
  } catch (err) {
    console.warn("Could not fetch remote profile; building default:", err);
  }

  const role: UserRole = isOwner ? "owner" : (existingData.role || "creator");
  const plan: SubscriptionPlan = isOwner ? "enterprise" : (existingData.plan || "free");
  const accountStatus = existingData.accountStatus || "active";

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || "",
    displayName: customName || user.displayName || existingData.displayName || (user.email ? user.email.split("@")[0] : "Creator"),
    emailVerified: user.emailVerified || isOwner, // Owner emails are permanently verified
    role,
    plan,
    isOwner,
    accountStatus,
    createdAt: existingData.createdAt || now,
    updatedAt: now,
    lastLoginAt: now,
  };

  try {
    await setDoc(userRef, profile, { merge: true });
  } catch (err) {
    console.warn("Could not save profile document in Cloud Firestore:", err);
  }

  return profile;
}

export async function loginWithEmailAuth(email: string, pass: string): Promise<{ user: User; profile: UserProfile }> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const profile = await syncUserProfile(cred.user);
  return { user: cred.user, profile };
}

export async function registerWithEmailAuth(
  email: string,
  pass: string,
  displayName?: string
): Promise<{ user: User; profile: UserProfile }> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  // Send email verification
  try {
    await sendEmailVerification(cred.user);
  } catch (err) {
    console.warn("Failed to send verification email automatically:", err);
  }
  const profile = await syncUserProfile(cred.user, displayName);
  return { user: cred.user, profile };
}

export async function loginWithGoogleAuth(): Promise<{ user: User; profile: UserProfile }> {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  provider.setCustomParameters({ prompt: "select_account" });

  if (isTauriEnvironment()) {
    // Desktop: use system-browser OAuth2 loopback (port 8912) instead of WebView2 popup.
    // WebView2 is flagged as disallowed_useragent by Google so signInWithPopup always fails.
    // Calls the Rust 'google_oauth_loopback' Tauri command which:
    //   1. Opens system Chrome/Edge with Google OAuth URL
    //   2. Listens on http://127.0.0.1:8912/auth/callback
    //   3. Returns { id_token } after code exchange
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<{
      id_token: string;
      access_token: string;
      email: string | null;
      display_name: string | null;
    }>('google_oauth_loopback', { googleClientId: GOOGLE_WEB_CLIENT_ID });
    // Exchange Google id_token for Firebase credential
    const credential = GoogleAuthProvider.credential(result.id_token);
    const cred = await signInWithCredential(auth, credential);
    const profile = await syncUserProfile(cred.user);
    return { user: cred.user, profile };
  }

  // Standard browser — signInWithPopup works normally
  const cred = await signInWithPopup(auth, provider);
  const profile = await syncUserProfile(cred.user);
  return { user: cred.user, profile };
}

export async function logoutAuth(): Promise<void> {
  await signOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function sendVerification(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.error("Failed to fetch user profile:", err);
  }
  return null;
}

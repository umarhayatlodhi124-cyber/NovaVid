// NovaVid AI Studio — Firebase Authentication Service
// Brand: LODHI TECHX
// Target Project: novavid-ecfc8

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
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
    // Tauri desktop WebView cannot host OAuth popups — the WebView2 runtime
    // blocks cross-origin popup windows required by Firebase's signInWithPopup.
    // Throw a clear, actionable message so the UI can guide the user.
    throw Object.assign(
      new Error(
        "Google Sign-In is not available in the desktop app. Please sign in with your Email & Password above. " +
        "To use Google Sign-In, open https://novavid-ecfc8.web.app in your browser."
      ),
      { code: "auth/operation-not-supported-in-this-environment" }
    );
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

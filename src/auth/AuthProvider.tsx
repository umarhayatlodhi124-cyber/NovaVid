// NovaVid AI Studio — AuthProvider Implementation
// Brand: LODHI TECHX
// Target Project: novavid-ecfc8

import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  AuthContext,
  AuthState,
  AuthView,
  UserProfile,
} from "./AuthContext";
import {
  loginWithEmailAuth,
  registerWithEmailAuth,
  loginWithGoogleAuth,
  logoutAuth,
  sendPasswordReset,
  sendVerification,
  syncUserProfile,
  isPermanentOwner,
} from "./authService";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authState, setAuthState] = useState<AuthState>("INITIALIZING");
  const [authView, setAuthView] = useState<AuthView>("login");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setAuthState("SIGNED_OUT");
        return;
      }

      try {
        const userProfile = await syncUserProfile(currentUser);
        setProfile(userProfile);

        if (userProfile.accountStatus === "disabled" || userProfile.accountStatus === "suspended") {
          setAuthState("ACCOUNT_DISABLED");
          return;
        }

        const isOwner = isPermanentOwner(currentUser.email);
        if (currentUser.emailVerified || isOwner) {
          setAuthState("SIGNED_IN");
        } else {
          setAuthState("EMAIL_UNVERIFIED");
          setAuthView("verify_email");
        }
      } catch (err: any) {
        console.error("Auth state transition error:", err);
        setError(err?.message || "Failed to sync user profile.");
        setAuthState("AUTH_ERROR");
      }
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      const loginPromise = loginWithEmailAuth(email, pass);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Login timed out. Please check your internet connection and try again.")), 12000)
      );
      const res = await Promise.race([loginPromise, timeoutPromise]);
      setUser(res.user);
      setProfile(res.profile);
      const isOwner = isPermanentOwner(res.user.email);
      if (res.user.emailVerified || isOwner) {
        setAuthState("SIGNED_IN");
      } else {
        setAuthState("EMAIL_UNVERIFIED");
        setAuthView("verify_email");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      let msg = err?.message || "Login failed.";
      const lower = (msg + " " + (err?.code || "")).toLowerCase();
      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/user-not-found" ||
        lower.includes("invalid_login_credentials") ||
        lower.includes("invalid-credential") ||
        lower.includes("wrong-password")
      ) {
        msg = "❌ Invalid email or password. If you originally signed in with Google, click 'Forgot password?' below to set your account password.";
      } else if (err?.code === "auth/too-many-requests" || lower.includes("too-many-requests")) {
        msg = "Access temporarily blocked due to multiple failed attempts. Try again later or reset password.";
      } else if (err?.code === "auth/internal-error" || lower.includes("internal-error")) {
        msg = "❌ Invalid email or password. Please verify and try again.";
      } else if (err?.code === "auth/argument-error" || lower.includes("argument-error") || err?.code === "auth/invalid-email") {
        msg = "Please enter a valid email address and password.";
      } else if (err?.code === "auth/network-request-failed" || lower.includes("network")) {
        msg = "Network connection failed. Please check your internet connection.";
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (email: string, pass: string, displayName?: string) => {
    setError(null);
    try {
      const res = await registerWithEmailAuth(email, pass, displayName);
      setUser(res.user);
      setProfile(res.profile);
      const isOwner = isPermanentOwner(res.user.email);
      if (res.user.emailVerified || isOwner) {
        setAuthState("SIGNED_IN");
      } else {
        setAuthState("EMAIL_UNVERIFIED");
        setAuthView("verify_email");
      }
    } catch (err: any) {
      console.error("Registration failed:", err);
      let msg = err?.message || "Registration failed.";
      if (err?.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Please sign in instead.";
      } else if (err?.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const res = await loginWithGoogleAuth();
      setUser(res.user);
      setProfile(res.profile);
      setAuthState("SIGNED_IN");
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      let msg = err?.message || "Google sign in failed.";
      if (err?.code === "auth/popup-closed-by-user") {
        msg = "Sign in window was closed. Please try again.";
      } else if (err?.code === "auth/popup-blocked") {
        msg = "Sign in popup was blocked. Please allow popups or use email/password sign in.";
      } else if (
        err?.code === "auth/operation-not-supported-in-this-environment" ||
        err?.code === "auth/argument-error" ||
        (msg && msg.includes("not available in the desktop app"))
      ) {
        msg =
          "Google Sign-In is not supported in the desktop app. Please sign in with your Email & Password above. " +
          "To use Google Sign-In, visit https://novavid-ecfc8.web.app in your browser.";
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await logoutAuth();
      setUser(null);
      setProfile(null);
      setAuthState("SIGNED_OUT");
      setAuthView("login");
    } catch (err: any) {
      console.error("Logout failed:", err);
      setError(err?.message || "Logout failed.");
    }
  };

  const handlePasswordReset = async (email: string) => {
    setError(null);
    try {
      await sendPasswordReset(email);
    } catch (err: any) {
      console.error("Password reset failed:", err);
      const msg = err?.message || "Failed to send password reset email.";
      setError(msg);
      throw new Error(msg);
    }
  };

  const handleVerificationEmail = async () => {
    if (!user) return;
    setError(null);
    try {
      await sendVerification(user);
    } catch (err: any) {
      console.error("Verification email failed:", err);
      const msg = err?.message || "Failed to send email verification.";
      setError(msg);
      throw new Error(msg);
    }
  };

  const reloadUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    const updated = auth.currentUser;
    setUser(updated);
    const isOwner = isPermanentOwner(updated.email);
    if (updated.emailVerified || isOwner) {
      setAuthState("SIGNED_IN");
      const userProfile = await syncUserProfile(updated);
      setProfile(userProfile);
    }
  };

  const isOwner = Boolean(profile?.isOwner || isPermanentOwner(user?.email));

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authState,
        authView,
        setAuthView,
        error,
        clearError,
        isOwner,
        login,
        register,
        loginWithGoogle,
        logout,
        sendPasswordReset: handlePasswordReset,
        sendVerificationEmail: handleVerificationEmail,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

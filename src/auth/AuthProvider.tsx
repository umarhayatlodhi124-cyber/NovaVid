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
      const res = await loginWithEmailAuth(email, pass);
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
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
        msg = "Invalid email or password. Please verify and try again.";
      } else if (err?.code === "auth/user-not-found") {
        msg = "No account found with this email. Please create an account.";
      } else if (err?.code === "auth/too-many-requests") {
        msg = "Access temporarily blocked due to multiple failed attempts. Try again later or reset password.";
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
      const msg = err?.message || "Google sign in failed.";
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

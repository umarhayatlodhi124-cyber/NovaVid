// NovaVid AI Studio — Unified Authentication Context
// Brand: LODHI TECHX
// Target Project: novavid-ecfc8

import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type AuthState =
  | "INITIALIZING"
  | "SIGNED_OUT"
  | "EMAIL_UNVERIFIED"
  | "SIGNED_IN"
  | "SESSION_EXPIRED"
  | "ACCOUNT_DISABLED"
  | "AUTH_ERROR";

export type AuthView = "login" | "register" | "forgot_password" | "verify_email";

export type UserRole = "owner" | "admin" | "creator" | "viewer";
export type SubscriptionPlan = "free" | "creator_pro" | "enterprise";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  role: UserRole;
  plan: SubscriptionPlan;
  isOwner: boolean;
  accountStatus: "active" | "pending_verification" | "suspended" | "disabled";
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authState: AuthState;
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  error: string | null;
  clearError: () => void;
  isOwner: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

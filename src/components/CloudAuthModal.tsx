import React, { useState } from "react";
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logoutFirebase,
} from "../lib/firebase";
import { WebFirestoreProjectStorage } from "../lib/platformStorage";
import type { User } from "firebase/auth";

interface CloudAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthSuccess: () => void;
}

export const CloudAuthModal: React.FC<CloudAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncingGuest, setSyncingGuest] = useState(false);

  if (!isOpen) return null;

  const guestCount = WebFirestoreProjectStorage.getGuestProjectsCount();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (tab === "signin") {
        await loginWithEmail(email.trim(), password);
        setSuccessMsg("Signed in successfully to NovaVid Cloud!");
      } else {
        await registerWithEmail(email.trim(), password);
        setSuccessMsg("Account created and signed in to NovaVid Cloud!");
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err?.message || "Authentication failed.";
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
        msg = "Invalid email or password. Please verify and try again.";
      } else if (err?.code === "auth/user-not-found") {
        msg = "No account found with this email. Click 'Create Account' to register.";
      } else if (err?.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Switch to 'Sign In'.";
      } else if (err?.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMsg("Signed in with Google successfully!");
      onAuthSuccess();
    } catch (err: any) {
      setError(err?.message || "Google sign in was canceled or failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await logoutFirebase();
      setSuccessMsg("Signed out from NovaVid Cloud.");
      onAuthSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to sign out.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGuestProjects = async () => {
    if (!currentUser) return;
    setError(null);
    setSyncingGuest(true);
    try {
      const count = await WebFirestoreProjectStorage.syncGuestProjectsToCloud();
      setSuccessMsg(`Successfully uploaded ${count} local project(s) to your Cloud Firestore account!`);
      onAuthSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to sync guest projects.");
    } finally {
      setSyncingGuest(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#111827",
          border: "1px solid #374151",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "480px",
          color: "#f3f4f6",
          padding: "24px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#60a5fa" }}>
              NovaVid Cloud Workspace
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#9ca3af" }}>
              LODHI TECHX — Cloud Firestore Sync (novavid-ecfc8)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              fontSize: "1.5rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              borderRadius: "6px",
              padding: "10px 14px",
              marginBottom: "16px",
              color: "#fca5a5",
              fontSize: "0.875rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              borderRadius: "6px",
              padding: "10px 14px",
              marginBottom: "16px",
              color: "#6ee7b7",
              fontSize: "0.875rem",
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        {currentUser ? (
          <div>
            <div
              style={{
                backgroundColor: "#1f2937",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    backgroundColor: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                  }}
                >
                  {currentUser.email ? currentUser.email[0].toUpperCase() : "U"}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {currentUser.email || "Authenticated User"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>●</span> Cloud Synced & Active
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "0.8rem", color: "#9ca3af", borderTop: "1px solid #374151", paddingTop: "8px" }}>
                <div><strong>UID:</strong> <code>{currentUser.uid}</code></div>
                <div><strong>Backend:</strong> Cloud Firestore (<code>novavid-ecfc8</code>)</div>
              </div>
            </div>

            {guestCount > 0 && (
              <div
                style={{
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid #f59e0b",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "#fbbf24", marginBottom: "8px" }}>
                  Found <strong>{guestCount}</strong> local project(s) on this browser from your guest session.
                </div>
                <button
                  onClick={handleSyncGuestProjects}
                  disabled={syncingGuest}
                  style={{
                    backgroundColor: "#d97706",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {syncingGuest ? "Syncing to Cloud..." : "☁️ Upload Local Projects to Cloud"}
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleSignOut}
                disabled={loading}
                style={{
                  flex: 1,
                  backgroundColor: "#374151",
                  color: "#f3f4f6",
                  border: "1px solid #4b5563",
                  borderRadius: "6px",
                  padding: "10px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sign Out
              </button>
              <button
                onClick={() => {
                  onAuthSuccess();
                  onClose();
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #374151",
                marginBottom: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  setError(null);
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === "signin" ? "2px solid #3b82f6" : "2px solid transparent",
                  color: tab === "signin" ? "#60a5fa" : "#9ca3af",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setError(null);
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === "register" ? "2px solid #3b82f6" : "2px solid transparent",
                  color: tab === "register" ? "#60a5fa" : "#9ca3af",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#d1d5db", marginBottom: "4px" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@lodhitechx.com"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "9px 12px",
                    color: "#fff",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#d1d5db", marginBottom: "4px" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "9px 12px",
                    color: "#fff",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: "6px",
                }}
              >
                {loading ? "Processing..." : tab === "signin" ? "Sign In to Cloud" : "Create Account & Sync"}
              </button>
            </form>

            <div style={{ position: "relative", textAlign: "center", margin: "20px 0" }}>
              <div style={{ height: "1px", backgroundColor: "#374151" }} />
              <span
                style={{
                  position: "absolute",
                  top: "-10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#111827",
                  padding: "0 10px",
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                }}
              >
                OR INSTANT ONE-CLICK
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                color: "#e5e7eb",
                borderRadius: "6px",
                padding: "9px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span>🌐</span> Sign in with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

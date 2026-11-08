// NovaVid AI Studio — Email Verification Page
// Brand: LODHI TECHX

import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export const EmailVerificationPage: React.FC = () => {
  const { user, sendVerificationEmail, reloadUser, logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setMessage(null);
    try {
      await sendVerificationEmail();
      setMessage("Verification email has been re-sent to your address.");
    } catch (err: any) {
      setMessage(err?.message || "Failed to resend email.");
    } finally {
      setResending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setMessage(null);
    try {
      await reloadUser();
    } catch (err: any) {
      setMessage(err?.message || "Could not check status. Please reload.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0b1120",
        padding: "24px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "16px",
          padding: "36px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          color: "#f3f4f6",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            margin: "0 auto 16px",
            borderRadius: "50%",
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            border: "1px solid #3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.8rem",
          }}
        >
          ✉️
        </div>

        <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: "0 0 8px" }}>
          Verify Your Email
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: "0.88rem", color: "#9ca3af", lineHeight: 1.5 }}>
          A verification link was sent to <strong>{user?.email}</strong>. Please confirm your email address to unlock your private NovaVid workspace.
        </p>

        {message && (
          <div
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              border: "1px solid #3b82f6",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "20px",
              fontSize: "0.85rem",
              color: "#93c5fd",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "11px",
              fontSize: "0.92rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {checking ? "Checking Status..." : "✓ I Have Verified My Email"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            style={{
              backgroundColor: "#1f2937",
              color: "#d1d5db",
              border: "1px solid #374151",
              borderRadius: "8px",
              padding: "10px",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {resending ? "Sending..." : "Resend Verification Email"}
          </button>

          <button
            type="button"
            onClick={logout}
            style={{
              background: "transparent",
              color: "#9ca3af",
              border: "none",
              padding: "8px",
              fontSize: "0.85rem",
              cursor: "pointer",
              marginTop: "8px",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

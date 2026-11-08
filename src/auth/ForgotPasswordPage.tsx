// NovaVid AI Studio — Forgot Password Recovery Page
// Brand: LODHI TECHX

import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordReset, setAuthView } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
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
          maxWidth: "420px",
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "16px",
          padding: "36px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          color: "#f3f4f6",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: "0 0 6px" }}>
            Reset Password
          </h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#9ca3af" }}>
            Enter your email to receive recovery instructions from <strong style={{ color: "#60a5fa" }}>LODHI TECHX</strong>
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "20px",
              fontSize: "0.85rem",
              color: "#fca5a5",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div>
            <div
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid #10b981",
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "24px",
                fontSize: "0.88rem",
                color: "#6ee7b7",
                lineHeight: 1.5,
              }}
            >
              ✓ Password reset link has been dispatched to <strong>{email}</strong>. Check your inbox and follow the link to reset your password.
            </div>
            <button
              type="button"
              onClick={() => setAuthView("login")}
              style={{
                width: "100%",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#d1d5db", marginBottom: "6px" }}>
                Account Email Address
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
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "11px",
                fontSize: "0.92rem",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending Email..." : "Send Password Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => setAuthView("login")}
              style={{
                background: "transparent",
                border: "none",
                color: "#9ca3af",
                fontSize: "0.85rem",
                cursor: "pointer",
                marginTop: "4px",
              }}
            >
              ← Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

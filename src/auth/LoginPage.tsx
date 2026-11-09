// NovaVid AI Studio — Customer & Owner Login Page
// Brand: LODHI TECHX

import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, setAuthView, error, clearError } = useAuth();
  const [email, setEmail] = useState("you@lodhitechx.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!email.trim()) {
      setLocalError("Please enter your email address.");
      return;
    }
    if (!password) {
      setLocalError("Please enter your password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setLocalError(err?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = () => {
    setEmail("you@lodhitechx.com");
    setPassword("TestPassword123!");
    setLocalError(null);
    clearError();
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    clearError();
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setLocalError(err?.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0b1120",
        backgroundImage: "radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 60%)",
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
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 16px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.5)",
            }}
          >
            ⚡
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            NovaVid AI Studio
          </h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#9ca3af" }}>
            Commercial AI Video Production Suite by <strong style={{ color: "#60a5fa" }}>LODHI TECHX</strong>
          </p>
        </div>

        {displayError && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "20px",
              fontSize: "0.85rem",
              color: "#fca5a5",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚠️</span>
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#d1d5db", marginBottom: "6px" }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lodhitechx.com"
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#ffffff",
                fontSize: "0.9rem",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#d1d5db" }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setAuthView("forgot_password")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#60a5fa",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            </div>
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
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#ffffff",
                fontSize: "0.9rem",
                outline: "none",
                transition: "border-color 0.2s",
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
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)",
              transition: "background-color 0.2s",
              marginTop: "4px",
            }}
          >
            {loading ? "Authenticating..." : "Sign In to Workspace"}
          </button>

          <button
            type="button"
            onClick={handleAutoFill}
            style={{
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px dashed rgba(59, 130, 246, 0.4)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#93c5fd",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            🔑 One-Click Fill: you@lodhitechx.com
          </button>
        </form>

        <div style={{ position: "relative", textAlign: "center", margin: "24px 0" }}>
          <div style={{ height: "1px", backgroundColor: "#1f2937" }} />
          <span
            style={{
              position: "absolute",
              top: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#111827",
              padding: "0 12px",
              fontSize: "0.75rem",
              color: "#6b7280",
              fontWeight: 600,
            }}
          >
            OR CONTINUE WITH
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: "100%",
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            color: "#f3f4f6",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <span>🌐</span> Sign in with Google
        </button>

        <div style={{ textAlign: "center", fontSize: "0.85rem", color: "#9ca3af" }}>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => setAuthView("register")}
            style={{
              background: "transparent",
              border: "none",
              color: "#3b82f6",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
};

// NovaVid AI Studio — Customer Registration Page
// Brand: LODHI TECHX

import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export const RegisterPage: React.FC = () => {
  const { register, setAuthView, error, clearError } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName);
    } catch (err: any) {
      setLocalError(err?.message || "Registration failed.");
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
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: "0 0 6px" }}>
            Create NovaVid Account
          </h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#9ca3af" }}>
            Get your private cloud video workspace by <strong style={{ color: "#60a5fa" }}>LODHI TECHX</strong>
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#d1d5db", marginBottom: "6px" }}>
              Full Name or Creator Alias
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Umar Hayat"
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                padding: "9px 12px",
                color: "#ffffff",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#d1d5db", marginBottom: "6px" }}>
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
                borderRadius: "8px",
                padding: "9px 12px",
                color: "#ffffff",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#d1d5db", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                padding: "9px 12px",
                color: "#ffffff",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#d1d5db", marginBottom: "6px" }}>
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                padding: "9px 12px",
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
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)",
              marginTop: "8px",
            }}
          >
            {loading ? "Creating Account..." : "Create Account & Start Studio"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "0.85rem", color: "#9ca3af" }}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => setAuthView("login")}
            style={{
              background: "transparent",
              border: "none",
              color: "#3b82f6",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

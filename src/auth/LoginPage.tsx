// NovaVid AI Studio — Next-Gen Cyberpunk / Modern AI SaaS Login Page
// Brand: LODHI TECHX | Founder: Umar Hayat
// Target Project: novavid-ecfc8 | Version: 2.2.0

import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, setAuthView, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        backgroundColor: "#050813",
        backgroundImage: `
          radial-gradient(ellipse at 50% -10%, rgba(59, 130, 246, 0.35) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 90%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
          radial-gradient(ellipse at 10% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)
        `,
        padding: "24px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Cyber Grid Accent */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      {/* Main Holographic Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "rgba(11, 17, 33, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "20px",
          padding: "38px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px -5px rgba(37, 99, 235, 0.25)",
          color: "#f3f4f6",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Top Cyber Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              backgroundColor: "rgba(30, 58, 138, 0.4)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#93c5fd",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                boxShadow: "0 0 8px #22c55e",
              }}
            />
            LODHI TECHX · v2.2.0
          </div>

          <span
            style={{
              fontSize: "0.72rem",
              color: "#64748b",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            STUDIO CORE
          </span>
        </div>

        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              margin: "0 auto 14px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.9rem",
              boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.6), 0 0 20px rgba(124, 58, 237, 0.4)",
            }}
          >
            ⚡
          </div>
          <h1
            style={{
              fontSize: "1.65rem",
              fontWeight: 800,
              margin: "0 0 6px",
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #ffffff 40%, #93c5fd 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            NovaVid AI Studio
          </h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
            Commercial Autonomous AI Video Suite by <strong style={{ color: "#60a5fa" }}>LODHI TECHX</strong>
          </p>
        </div>

        {/* Feature Capability Chips */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              padding: "3px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(51, 65, 85, 0.6)",
              color: "#94a3b8",
            }}
          >
            🎬 4K FFmpeg Engine
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              padding: "3px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(51, 65, 85, 0.6)",
              color: "#94a3b8",
            }}
          >
            🧠 Gemini 3.8 Neural
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              padding: "3px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(51, 65, 85, 0.6)",
              color: "#94a3b8",
            }}
          >
            🎙️ Urdu Voice Cloner
          </span>
        </div>

        {/* Error Notification Banner */}
        {displayError && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.6)",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "20px",
              fontSize: "0.84rem",
              color: "#fca5a5",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              lineHeight: 1.45,
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>⚠️</span>
            <div style={{ flex: 1 }}>{displayError}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: "6px",
                letterSpacing: "0.02em",
              }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontSize: "0.95rem",
                  pointerEvents: "none",
                }}
              >
                ✉️
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@lodhitechx.com"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(51, 65, 85, 0.8)",
                  borderRadius: "10px",
                  padding: "11px 14px 11px 38px",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", letterSpacing: "0.02em" }}>
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
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  transition: "color 0.2s",
                }}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontSize: "0.95rem",
                  pointerEvents: "none",
                }}
              >
                🔒
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(51, 65, 85, 0.8)",
                  borderRadius: "10px",
                  padding: "11px 40px 11px 38px",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  padding: "2px",
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: "#2563eb",
              backgroundImage: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 60%, #4f46e5 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "12px",
              fontSize: "0.95rem",
              fontWeight: 700,
              letterSpacing: "0.02em",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 20px -2px rgba(37, 99, 235, 0.5), 0 0 15px rgba(79, 70, 229, 0.3)",
              transition: "all 0.2s ease",
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {loading ? (
              <>
                <span>⚡</span> Authenticating...
              </>
            ) : (
              <>🚀 Sign In to Workspace</>
            )}
          </button>
        </form>

        <div style={{ position: "relative", textAlign: "center", margin: "24px 0 18px" }}>
          <div style={{ height: "1px", backgroundColor: "rgba(51, 65, 85, 0.6)" }} />
          <span
            style={{
              position: "absolute",
              top: "-9px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "rgba(11, 17, 33, 0.95)",
              padding: "0 12px",
              fontSize: "0.72rem",
              color: "#64748b",
              fontWeight: 700,
              letterSpacing: "0.08em",
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
            backgroundColor: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(71, 85, 105, 0.5)",
            color: "#f1f5f9",
            borderRadius: "10px",
            padding: "11px",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "18px",
            transition: "all 0.2s ease",
          }}
        >
          <span>🌐</span> Sign in with Google (Web App)
        </button>

        {/* Footer Links */}
        <div style={{ textAlign: "center", fontSize: "0.85rem", color: "#94a3b8" }}>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => setAuthView("register")}
            style={{
              background: "transparent",
              border: "none",
              color: "#38bdf8",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              transition: "color 0.2s",
            }}
          >
            Create an Account
          </button>
        </div>

        {/* Dedicated Super Admin Portal link */}
        <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(51, 65, 85, 0.4)", textAlign: "center" }}>
          <a
            href="/#admin"
            style={{
              color: "#64748b",
              fontSize: "0.74rem",
              textDecoration: "none",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              transition: "color 0.2s",
            }}
          >
            🛡️ Super Admin Portal
          </a>
        </div>
      </div>
    </div>
  );
};

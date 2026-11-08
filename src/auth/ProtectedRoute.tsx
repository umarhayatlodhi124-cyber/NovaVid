// NovaVid AI Studio — Protected Route Gate
// Brand: LODHI TECHX

import React from "react";
import { useAuth } from "./AuthContext";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { EmailVerificationPage } from "./EmailVerificationPage";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState, authView, logout } = useAuth();

  if (authState === "INITIALIZING") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b1120",
          color: "#f3f4f6",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
            marginBottom: "20px",
            boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5)",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        >
          ⚡
        </div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 6px" }}>
          NovaVid AI Studio
        </h2>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#60a5fa" }}>
          Initializing Secure Session &amp; Tenant Workspace...
        </p>
      </div>
    );
  }

  if (authState === "ACCOUNT_DISABLED") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b1120",
          padding: "24px",
          color: "#f3f4f6",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "440px",
            backgroundColor: "#111827",
            border: "1px solid #ef4444",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🚫</div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f87171", margin: "0 0 10px" }}>
            Account Suspended
          </h2>
          <p style={{ fontSize: "0.88rem", color: "#9ca3af", lineHeight: 1.5, margin: "0 0 20px" }}>
            Your NovaVid account has been restricted by LODHI TECHX administrative policy. Please contact support to resolve this issue.
          </p>
          <button
            onClick={logout}
            style={{
              backgroundColor: "#374151",
              color: "#f3f4f6",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (authState === "EMAIL_UNVERIFIED") {
    return <EmailVerificationPage />;
  }

  if (authState === "SIGNED_OUT" || authState === "AUTH_ERROR") {
    switch (authView) {
      case "register":
        return <RegisterPage />;
      case "forgot_password":
        return <ForgotPasswordPage />;
      case "verify_email":
        return <EmailVerificationPage />;
      case "login":
      default:
        return <LoginPage />;
    }
  }

  // SIGNED_IN
  return <>{children}</>;
};

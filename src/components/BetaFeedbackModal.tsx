import { useState, useEffect } from "react";
import {
  BetaFeedbackRepository,
  CreatorFeedback,
  FeedbackCategory,
  perform8GbRamHealthCheck,
  BetaHealthCheckResult,
} from "../lib/betaTesting";

interface BetaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId?: string | null;
}

export function BetaFeedbackModal({ isOpen, onClose, currentProjectId }: BetaFeedbackModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [healthCheck, setHealthCheck] = useState<BetaHealthCheckResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const hc = perform8GbRamHealthCheck();
      setHealthCheck(hc);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter your name or creator handle.");
      return;
    }
    if (!message.trim()) {
      setErrorMessage("Please provide feedback or bug description.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const feedbackItem: CreatorFeedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      creatorName: name.trim(),
      creatorEmail: email.trim() || undefined,
      category,
      rating,
      message: message.trim(),
      systemDiagnostics: {
        os: "Windows 10/11 x64",
        ramUsageMb: healthCheck?.estimatedMemoryMb || 120,
        is8GbRamCompliant: healthCheck?.is8GbRamCompliant ?? true,
        concurrencyLimit: healthCheck?.maxParallelWorkers || 2,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Tauri 2 Desktop",
        activeProjectId: currentProjectId || undefined,
      },
      status: "new",
      createdAt: new Date().toISOString(),
    };

    try {
      await BetaFeedbackRepository.saveFeedback(feedbackItem);
      setSuccessMessage("Thank you! Your feedback and diagnostics have been logged to the local repository.");
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(`Failed to save feedback: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "520px",
          width: "100%",
          border: "1px solid #475569",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>💬</span>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
              Creator Private Beta Feedback
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* 8 GB RAM Hardware Badge */}
        {healthCheck && (
          <div
            style={{
              background: "#0f172a",
              borderRadius: "6px",
              padding: "10px 14px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.8rem",
            }}
          >
            <div>
              <span style={{ color: "#94a3b8" }}>Hardware Target: </span>
              <strong style={{ color: "#38bdf8" }}>8 GB RAM PC (&lt;1.5 GB Budget)</strong>
            </div>
            <span
              style={{
                color: healthCheck.is8GbRamCompliant ? "#34d399" : "#f87171",
                fontWeight: 700,
              }}
            >
              {healthCheck.estimatedMemoryMb} MB / {healthCheck.memoryBudgetMb} MB
            </span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "#064e3b",
              color: "#a7f3d0",
              padding: "10px 14px",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "0.85rem",
            }}
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: "#7f1d1d",
              color: "#fecaca",
              padding: "10px 14px",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "0.85rem",
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Name / Handle *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Tech"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  fontSize: "0.85rem",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  fontSize: "0.85rem",
                }}
              >
                <option value="bug">🐛 Bug Report</option>
                <option value="performance">⚡ Performance & RAM</option>
                <option value="feature_request">💡 Feature Request</option>
                <option value="praise">⭐ Praise / Workflow Win</option>
                <option value="general">💬 General Feedback</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Experience Rating
              </label>
              <div style={{ display: "flex", gap: "4px", paddingTop: "4px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      padding: "0 2px",
                      color: star <= rating ? "#f59e0b" : "#475569",
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
              Message / Reproduction Steps *
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what happened, what worked well, or what needs improvement..."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "4px",
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #475569",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                lineHeight: "1.4",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                background: "#334155",
                color: "#f8fafc",
                border: "none",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                cursor: isSubmitting ? "wait" : "pointer",
                fontSize: "0.85rem",
              }}
            >
              {isSubmitting ? "Logging..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

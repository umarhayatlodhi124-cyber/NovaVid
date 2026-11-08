import { useState, type FormEvent } from "react";
import { PROJECT_LANGUAGES, type Project, type ProjectLanguage } from "../lib/project";
import { createProject } from "../lib/projects";
import type { ResourceMode, SystemResourceMetrics } from "../lib/resourceManager";

interface OneClickVideoCreatorProps {
  onProjectCreated: (project: Project, autoLaunchAgent: boolean) => void;
  resourceMetrics: SystemResourceMetrics | null;
  resourceMode: ResourceMode;
  isUrdu: boolean;
}

export function OneClickVideoCreator({
  onProjectCreated,
  resourceMetrics,
  resourceMode,
  isUrdu,
}: OneClickVideoCreatorProps) {
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<ProjectLanguage>(isUrdu ? "Urdu" : "English");
  const [duration, setDuration] = useState<"shorts" | "standard" | "deep">("shorts");
  const [style, setStyle] = useState("Modern Tech Explainer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill project name if user hasn't explicitly typed one
  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    if (!name || name === topic.slice(0, 40)) {
      const suggested = newTopic.trim().slice(0, 45);
      setName(suggested ? `${suggested}` : "");
    }
  };

  const handleSubmit = async (e: FormEvent, launchAgentImmediately = true) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError(isUrdu ? "برائے مہربانی ویڈیو کا عنوان درج کریں۔" : "Please provide a video topic or concept.");
      return;
    }

    const projectName = name.trim() || topic.trim().slice(0, 45);
    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createProject({
        name: projectName,
        topic: `${topic.trim()} [Format: ${duration}, Style: ${style}]`,
        language,
      });
      onProjectCreated(created, launchAgentImmediately);
    } catch (err: any) {
      setError(err?.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="one-click-creator-card"
      style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderRadius: "16px",
        padding: "2rem",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
        marginBottom: "2rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600, color: "#818cf8", marginBottom: "0.5rem" }}>
            <span>⚡ {isUrdu ? "مرحلہ ۱ — فوری ویڈیو تخلیق" : "One-Topic Autonomous Engine"}</span>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#f8fafc" }}>
            {isUrdu ? "خودکار اے آئی ویڈیو پروڈکشن" : "Create Complete Video from a Single Topic"}
          </h2>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
            {isUrdu
              ? "عنوان درج کریں اور نووا وڈ ریسرچ، اسکرپٹ، وائس اوور، سب ٹائٹلز، ویژولز اور ویڈیو خودکار تیار کرے گا۔"
              : "Enter your topic and NovaVid will automatically research, write the script, record voiceover, build storyboard, sync subtitles, and render the complete video."}
          </p>
        </div>

        {/* 8GB RAM Protection Pill */}
        <div style={{
          background: resourceMode === "low_resource" ? "rgba(16, 185, 129, 0.12)" : "rgba(59, 130, 246, 0.12)",
          border: `1px solid ${resourceMode === "low_resource" ? "rgba(16, 185, 129, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
          borderRadius: "10px",
          padding: "8px 14px",
          fontSize: "0.8rem",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          alignSelf: "flex-start"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: resourceMode === "low_resource" ? "#34d399" : "#60a5fa" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: resourceMode === "low_resource" ? "#10b981" : "#3b82f6" }}></span>
            {resourceMode === "low_resource" ? (isUrdu ? "۸ جی بی ریم محفوظ موڈ فعال" : "8GB RAM Safe Mode Active") : (isUrdu ? "متوازن کارکردگی موڈ" : "Balanced Resource Mode")}
          </div>
          {resourceMetrics && (
            <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
              {isUrdu ? "دستیاب ریم: " : "Available RAM: "}
              <strong>{(resourceMetrics.availablePhysicalRamMb / 1024).toFixed(1)} GB</strong>
              {" "}({resourceMetrics.memoryLoadPercent}% {isUrdu ? "استعمال" : "load"})
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "1rem",
          color: "#fca5a5",
          fontSize: "0.875rem"
        }}>
          {error}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, true)}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
          {/* Topic Field */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.35rem" }}>
              {isUrdu ? "ویڈیو کا مرکزی عنوان یا آئیڈیا *" : "Video Topic or Concept *"}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              placeholder={isUrdu ? "مثال: 2026 میں مصنوعی ذہانت کے حیران کن انقلابات اور فائدے" : "e.g., Top 5 AI Breakthroughs in 2026 & How They Change Work"}
              required
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                background: "rgba(15, 23, 42, 0.6)",
                color: "#f8fafc",
                fontSize: "1rem",
                boxSizing: "border-box",
                outline: "none",
                fontFamily: isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Segoe UI', Tahoma, sans-serif" : "inherit",
              }}
            />
          </div>

          {/* Project Name */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.35rem" }}>
              {isUrdu ? "پروجیکٹ کا نام" : "Project Name (Auto-assigned if blank)"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isUrdu ? "پروجیکٹ کا عنوان" : "Project Title"}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                background: "rgba(15, 23, 42, 0.6)",
                color: "#f8fafc",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Language Selection */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.35rem" }}>
              {isUrdu ? "ویڈیو کی زبان" : "Language"}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as ProjectLanguage)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            >
              {PROJECT_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang === "Urdu" ? "اردو (Urdu)" : lang === "English" ? "English" : lang}
                </option>
              ))}
            </select>
          </div>

          {/* Duration / Format */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.35rem" }}>
              {isUrdu ? "دورانیہ اور فارمیٹ" : "Duration & Format"}
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value as any)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            >
              <option value="shorts">{isUrdu ? "یوٹیوب شارٹس (30 تا 60 سیکنڈ) — 9:16" : "YouTube Shorts (30–60s) — 9:16"}</option>
              <option value="standard">{isUrdu ? "معیاری ویڈیو (3 تا 5 منٹ) — 16:9" : "Standard Explainer (3–5 mins) — 16:9"}</option>
              <option value="deep">{isUrdu ? "تفصیلی ویڈیو (8 تا 12 منٹ) — 16:9" : "Deep Dive Tech (8–12 mins) — 16:9"}</option>
            </select>
          </div>

          {/* Style */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.35rem" }}>
              {isUrdu ? "ویڈیو کا انداز / اسٹائل" : "Visual & Narrative Style"}
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            >
              <option value="Modern Tech Explainer">{isUrdu ? "ماڈرن ٹیکنالوجی وژن (LODHI TECHX)" : "Modern Tech Explainer (LODHI TECHX)"}</option>
              <option value="Cinematic Documentary">{isUrdu ? "سینماٹک دستاویزی فلم" : "Cinematic Documentary"}</option>
              <option value="Fast News">{isUrdu ? "تیز رفتار ٹیکنالوجی نیوز" : "High-Energy Breaking News"}</option>
              <option value="Step-by-Step Tutorial">{isUrdu ? "مرحلہ وار ٹیوشن / رہنمائی" : "Step-by-Step Tutorial"}</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="submit"
            disabled={isSubmitting || !topic.trim()}
            style={{
              flex: "1 1 240px",
              padding: "0.85rem 1.75rem",
              borderRadius: "10px",
              border: "none",
              background: isSubmitting || !topic.trim() ? "rgba(99, 102, 241, 0.3)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: isSubmitting || !topic.trim() ? "not-allowed" : "pointer",
              boxShadow: isSubmitting || !topic.trim() ? "none" : "0 4px 14px rgba(79, 70, 229, 0.4)",
              transition: "all 0.15s ease",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🚀</span>
            <span>
              {isSubmitting
                ? (isUrdu ? "پروجیکٹ بن رہا ہے..." : "Initializing Project...")
                : (isUrdu ? "خودکار اے آئی ویڈیو شروع کریں" : "Create & Launch Autonomous Engine")}
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={isSubmitting || !topic.trim()}
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: "10px",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              background: "rgba(30, 41, 59, 0.6)",
              color: "#cbd5e1",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: isSubmitting || !topic.trim() ? "not-allowed" : "pointer",
            }}
          >
            {isUrdu ? "صرف مسودہ محفوظ کریں" : "Save Project as Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

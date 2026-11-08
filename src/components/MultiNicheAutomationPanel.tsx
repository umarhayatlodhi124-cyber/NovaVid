import { useState, useEffect } from "react";
import {
  NICHE_CATALOG,
  getTenantAutomationConfig,
  saveTenantAutomationConfig,
  generateDailyJobBatch,
  listTenantAutomationJobs,
  updateAutomationJob,
  type TenantAutomationConfig,
  type DailyAutomationJob,
  type NicheDefinition,
} from "../lib/automation";
import { PROJECT_LANGUAGES, type ProjectLanguage } from "../lib/project";
import { useAuth } from "../auth/AuthContext";

interface MultiNicheAutomationPanelProps {
  isUrdu: boolean;
}

export function MultiNicheAutomationPanel({ isUrdu }: MultiNicheAutomationPanelProps) {
  const { user } = useAuth();
  const userId = user?.uid || "guest_tenant";
  const userEmail = user?.email || "";

  const [config, setConfig] = useState<TenantAutomationConfig | null>(null);
  const [jobs, setJobs] = useState<DailyAutomationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"niche" | "schedule" | "topics" | "queue">("niche");
  const [newCustomTopic, setNewCustomTopic] = useState("");
  const [newExcludedTopic, setNewExcludedTopic] = useState("");
  const [executingJobId, setExecutingJobId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const loadedConfig = await getTenantAutomationConfig(userId, userEmail);
        setConfig(loadedConfig);
        const existingJobs = await listTenantAutomationJobs(userId);
        if (existingJobs.length === 0) {
          const freshBatch = generateDailyJobBatch(loadedConfig);
          setJobs(freshBatch);
        } else {
          setJobs(existingJobs);
        }
      } catch (err) {
        console.error("Failed loading automation data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId, userEmail]);

  if (loading || !config) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚡</div>
        <p>{isUrdu ? "خودکار آٹومیشن سیٹنگز لوڈ ہو رہی ہیں..." : "Loading Multi-Niche Daily Automation Engine..."}</p>
      </div>
    );
  }

  const selectedNicheDef = NICHE_CATALOG.find((n) => n.id === config.niche) || NICHE_CATALOG[0];

  const handleSave = async (updatedConfig: TenantAutomationConfig) => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveTenantAutomationConfig(updatedConfig);
      setConfig(updatedConfig);
      // Regenerate daily jobs to match new quota
      const updatedJobs = generateDailyJobBatch(updatedConfig);
      setJobs(updatedJobs);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectNiche = (niche: NicheDefinition) => {
    const updated: TenantAutomationConfig = {
      ...config,
      niche: niche.id,
      subNiche: niche.subNiches[0] || "General",
      language: niche.defaultLanguage,
      voiceId: niche.defaultLanguage === "Urdu" ? "ur-PK-AsadNeural" : "en-US-GuyNeural",
    };
    handleSave(updated);
  };

  const handleAddCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomTopic.trim()) return;
    const updated: TenantAutomationConfig = {
      ...config,
      customTopics: [...(config.customTopics || []), newCustomTopic.trim()],
    };
    setNewCustomTopic("");
    handleSave(updated);
  };

  const handleRemoveCustomTopic = (idx: number) => {
    const nextTopics = [...config.customTopics];
    nextTopics.splice(idx, 1);
    handleSave({ ...config, customTopics: nextTopics });
  };

  const handleAddExcludedTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExcludedTopic.trim()) return;
    const updated: TenantAutomationConfig = {
      ...config,
      excludedTopics: [...(config.excludedTopics || []), newExcludedTopic.trim()],
    };
    setNewExcludedTopic("");
    handleSave(updated);
  };

  const handleRemoveExcludedTopic = (idx: number) => {
    const nextExcluded = [...config.excludedTopics];
    nextExcluded.splice(idx, 1);
    handleSave({ ...config, excludedTopics: nextExcluded });
  };

  const handleRunJobNow = async (job: DailyAutomationJob) => {
    setExecutingJobId(job.id);
    try {
      job.status = "rendering";
      await updateAutomationJob(job);
      setJobs([...jobs]);

      // Simulate full pipeline completion
      setTimeout(async () => {
        job.status = config.approvalMode === "auto_publish" ? "published" : "ready_for_approval";
        job.youtubeVideoId = `vid_auto_${Date.now().toString().slice(-6)}`;
        job.youtubeUrl = `https://youtu.be/${job.youtubeVideoId}`;
        job.completedAt = new Date().toISOString();
        await updateAutomationJob(job);
        setJobs([...jobs]);
        setExecutingJobId(null);
      }, 2500);
    } catch (err) {
      job.status = "failed";
      await updateAutomationJob(job);
      setJobs([...jobs]);
      setExecutingJobId(null);
    }
  };

  const totalDailyTarget = config.dailyShortsTarget + config.dailyLongTarget;

  return (
    <div className="automation-container" style={{ padding: "1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)",
          border: "1px solid rgba(0, 240, 255, 0.3)",
          borderRadius: "16px",
          padding: "1.5rem 2rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem" }}>⚙️</span>
            <h1 style={{ margin: 0, fontSize: "1.6rem", color: "#f8fafc", fontWeight: 700 }}>
              {isUrdu ? "خودکار ملٹی نیش مواد انجن" : "Multi-Tenant Multi-Niche Daily Automation Engine"}
            </h1>
          </div>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
            {isUrdu
              ? `ہر صارف کے لیے الگ نیش، چینل اور شیڈول۔ موجودہ ہدف: روزانہ ${config.dailyShortsTarget} شارٹس اور ${config.dailyLongTarget} تفصیلی ویڈیوز۔`
              : `Universal autonomous video generation for any niche. Current target: ${config.dailyShortsTarget} Shorts + ${config.dailyLongTarget} Long Videos daily.`}
          </p>
        </div>

        {/* Tenant Identity Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid #38bdf8",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "0.82rem",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>👤</span>
            <span>{userEmail || "Tenant User"}</span>
            <span style={{ background: "#0284c7", color: "#fff", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 600 }}>
              {config.channelTitle || "Isolated Workspace"}
            </span>
          </div>

          {saving && (
            <span style={{ color: "#38bdf8", fontSize: "0.85rem" }}>
              ⏳ {isUrdu ? "محفوظ ہو رہا ہے..." : "Saving..."}
            </span>
          )}

          {saveSuccess && (
            <span style={{ color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>
              ✓ {isUrdu ? "سیٹنگز محفوظ ہو گئیں!" : "Saved & Synchronized!"}
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #334155", paddingBottom: "0.5rem" }}>
        {[
          { id: "niche", label: isUrdu ? "نیش اور سب نیش" : "1. Niche & Channel", icon: "🎯" },
          { id: "schedule", label: isUrdu ? "روزانہ کا ہدف اور شیڈول" : "2. Daily Quota & Schedule", icon: "⏰" },
          { id: "topics", label: isUrdu ? "عنوانات اور استثنیٰ" : "3. Topics & Language", icon: "📝" },
          { id: "queue", label: isUrdu ? `روزانہ کی قطار (${totalDailyTarget} ویڈیوز)` : `4. Daily Production Queue (${totalDailyTarget})`, icon: "🚀" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? "rgba(56, 189, 248, 0.2)" : "transparent",
              color: activeTab === tab.id ? "#38bdf8" : "#94a3b8",
              border: activeTab === tab.id ? "1px solid #38bdf8" : "1px solid transparent",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Niche Selection */}
      {activeTab === "niche" && (
        <div>
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#f8fafc" }}>
              {isUrdu ? "اپنا یوٹیوب نیش منتخب کریں" : "Select Your Channel Niche"}
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
              {isUrdu
                ? "نووا وڈ کسی ایک مخصوص موضوع تک محدود نہیں ہے۔ آپ کا منتخب کردہ نیش صرف آپ کے چینل پر لاگو ہوگا اور دیگر صارفین سے الگ رہے گا۔"
                : "NovaVid is not locked to Technology. Choose the niche that fits your channel. Your choice is 100% private and tenant-isolated."}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {NICHE_CATALOG.map((niche) => {
              const isSelected = config.niche === niche.id;
              return (
                <div
                  key={niche.id}
                  onClick={() => handleSelectNiche(niche)}
                  style={{
                    background: isSelected ? "rgba(30, 58, 138, 0.4)" : "rgba(15, 23, 42, 0.7)",
                    border: isSelected ? `2px solid ${niche.color}` : "1px solid #334155",
                    borderRadius: "12px",
                    padding: "1.2rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? `0 0 15px ${niche.color}33` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "1.8rem" }}>{niche.icon}</span>
                    <div>
                      <div style={{ color: isSelected ? niche.color : "#f8fafc", fontWeight: 700, fontSize: "1rem" }}>
                        {isUrdu ? niche.nameUrdu : niche.name}
                      </div>
                      <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{niche.category}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
                    {isUrdu ? "مقبول سب نیش:" : "Sub-niches:"}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                      {niche.subNiches.slice(0, 3).map((sub, sIdx) => (
                        <span key={sIdx} style={{ background: "rgba(255, 255, 255, 0.05)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem" }}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ color: niche.color, fontSize: "0.75rem", fontWeight: 700, textAlign: "right" }}>
                      ✓ {isUrdu ? "منتخب شدہ نیش" : "ACTIVE NICHE"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sub-niche & Channel Connection */}
          <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid #334155", borderRadius: "12px", padding: "1.5rem" }}>
            <h4 style={{ margin: "0 0 1rem 0", color: "#f8fafc" }}>
              {isUrdu ? "سب نیش اور چینل کنکشن" : "Sub-Niche & Channel Mapping"}
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                  {isUrdu ? "مخصوص سب نیش:" : "Specific Sub-Niche:"}
                </label>
                <select
                  value={config.subNiche}
                  onChange={(e) => handleSave({ ...config, subNiche: e.target.value })}
                  style={{
                    width: "100%",
                    background: "#0f172a",
                    border: "1px solid #475569",
                    color: "#f8fafc",
                    padding: "8px 12px",
                    borderRadius: "8px",
                  }}
                >
                  {selectedNicheDef.subNiches.map((sub, i) => (
                    <option key={i} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                  {isUrdu ? "چینل کا نام:" : "Connected YouTube Channel:"}
                </label>
                <input
                  type="text"
                  value={config.channelTitle}
                  onChange={(e) => handleSave({ ...config, channelTitle: e.target.value })}
                  placeholder="e.g. My Cooking Channel"
                  style={{
                    width: "100%",
                    background: "#0f172a",
                    border: "1px solid #475569",
                    color: "#f8fafc",
                    padding: "8px 12px",
                    borderRadius: "8px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Schedule & Daily Quotas */}
      {activeTab === "schedule" && (
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid #334155", borderRadius: "12px", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", color: "#f8fafc" }}>
            {isUrdu ? "روزانہ کا پیداواری ہدف اور خودکار شیڈول" : "Daily Production Target & Publishing Slots"}
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            {isUrdu
              ? "ڈیفالٹ ہدف روزانہ ۳ شارٹس اور ۳ لانگ ویڈیوز ہے۔ آپ اپنی مرضی سے اس تعداد کو تبدیل کر سکتے ہیں۔"
              : "Configurable daily targets. Default target is 3 Shorts and 3 Long videos per day, executing automatically."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
            {/* Shorts Quota */}
            <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "1.2rem", borderRadius: "10px", border: "1px solid #475569" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontWeight: 700, color: "#38bdf8", fontSize: "1.1rem" }}>📱 YouTube Shorts</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc" }}>{config.dailyShortsTarget} / day</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={config.dailyShortsTarget}
                onChange={(e) => handleSave({ ...config, dailyShortsTarget: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
              />
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem" }}>
                Publishing slots: {config.shortsPublishTimes.slice(0, config.dailyShortsTarget).join(" • ") || "None"}
              </div>
            </div>

            {/* Long Videos Quota */}
            <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "1.2rem", borderRadius: "10px", border: "1px solid #475569" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: "1.1rem" }}>🎬 Long-Form Videos</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc" }}>{config.dailyLongTarget} / day</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={config.dailyLongTarget}
                onChange={(e) => handleSave({ ...config, dailyLongTarget: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", accentColor: "#f59e0b", cursor: "pointer" }}
              />
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem" }}>
                Publishing slots: {config.longPublishTimes.slice(0, config.dailyLongTarget).join(" • ") || "None"}
              </div>
            </div>
          </div>

          {/* Timezone & Approval Mode */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                {isUrdu ? "شیڈول ٹائم زون:" : "Publishing Timezone:"}
              </label>
              <select
                value={config.scheduleTimezone}
                onChange={(e) => handleSave({ ...config, scheduleTimezone: e.target.value })}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #475569", color: "#f8fafc", padding: "8px 12px", borderRadius: "8px" }}
              >
                <option value="Asia/Karachi">Asia/Karachi (PKT +05:00)</option>
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                {isUrdu ? "منظوری کا طریقہ کار:" : "Content Approval Mode:"}
              </label>
              <select
                value={config.approvalMode}
                onChange={(e) => handleSave({ ...config, approvalMode: e.target.value as any })}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #475569", color: "#f8fafc", padding: "8px 12px", borderRadius: "8px" }}
              >
                <option value="auto_publish">⚡ Auto-Publish Directly (Fully Autonomous)</option>
                <option value="require_approval">🛡️ Require Creator Review Before Upload</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Topics & Language */}
      {activeTab === "topics" && (
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid #334155", borderRadius: "12px", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", color: "#f8fafc" }}>
            {isUrdu ? "موضوعات، مستثنیٰ مواد اور زبان" : "Custom Topics, Exclusions & Voice"}
          </h3>

          {/* Language & Voice */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                {isUrdu ? "ویڈیو کی زبان:" : "Narration Language:"}
              </label>
              <select
                value={config.language}
                onChange={(e) => handleSave({ ...config, language: e.target.value as ProjectLanguage })}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #475569", color: "#f8fafc", padding: "8px 12px", borderRadius: "8px" }}
              >
                {PROJECT_LANGUAGES.map((lang, idx) => (
                  <option key={idx} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                {isUrdu ? "وائس جنریٹر:" : "Neural Narration Voice:"}
              </label>
              <select
                value={config.voiceId}
                onChange={(e) => handleSave({ ...config, voiceId: e.target.value })}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #475569", color: "#f8fafc", padding: "8px 12px", borderRadius: "8px" }}
              >
                <option value="ur-PK-AsadNeural">ur-PK-AsadNeural (Urdu Male Natural)</option>
                <option value="ur-PK-UzmaNeural">ur-PK-UzmaNeural (Urdu Female Natural)</option>
                <option value="en-US-GuyNeural">en-US-GuyNeural (English Male Professional)</option>
                <option value="en-US-JennyNeural">en-US-JennyNeural (English Female Warm)</option>
                <option value="es-ES-AlvaroNeural">es-ES-AlvaroNeural (Spanish Male)</option>
                <option value="hi-IN-MadhurNeural">hi-IN-MadhurNeural (Hindi Male)</option>
              </select>
            </div>
          </div>

          {/* Custom Topics Pool */}
          <div style={{ marginBottom: "2rem" }}>
            <h4 style={{ color: "#38bdf8", margin: "0 0 0.5rem 0" }}>
              {isUrdu ? "آپ کے ترجیحی عنوانات (Custom Topics):" : "Custom Priority Topics:"}
            </h4>
            <form onSubmit={handleAddCustomTopic} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input
                type="text"
                value={newCustomTopic}
                onChange={(e) => setNewCustomTopic(e.target.value)}
                placeholder="Enter a custom topic or idea..."
                style={{ flex: 1, background: "#0f172a", border: "1px solid #475569", color: "#f8fafc", padding: "8px 12px", borderRadius: "8px" }}
              />
              <button type="submit" style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                + Add Topic
              </button>
            </form>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {(config.customTopics || []).map((t, idx) => (
                <span key={idx} style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid #38bdf8", color: "#38bdf8", padding: "4px 10px", borderRadius: "16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{t}</span>
                  <button onClick={() => handleRemoveCustomTopic(idx)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}>✕</button>
                </span>
              ))}
            </div>
          </div>

          {/* Excluded Topics */}
          <div>
            <h4 style={{ color: "#ef4444", margin: "0 0 0.5rem 0" }}>
              {isUrdu ? "مستثنیٰ عنوانات و الفاظ (Excluded Topics):" : "Excluded Topics & Words to Avoid:"}
            </h4>
            <form onSubmit={handleAddExcludedTopic} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input
                type="text"
                value={newExcludedTopic}
                onChange={(e) => setNewExcludedTopic(e.target.value)}
                placeholder="e.g. Political arguments, Competitor names..."
                style={{ flex: 1, background: "#0f172a", border: "1px solid #475569", color: "#f8fafc", padding: "8px 12px", borderRadius: "8px" }}
              />
              <button type="submit" style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                + Exclude
              </button>
            </form>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {(config.excludedTopics || []).map((t, idx) => (
                <span key={idx} style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5", padding: "4px 10px", borderRadius: "16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🚫 {t}</span>
                  <button onClick={() => handleRemoveExcludedTopic(idx)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}>✕</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Daily Production Queue */}
      {activeTab === "queue" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ margin: "0 0 0.25rem 0", color: "#f8fafc" }}>
                {isUrdu ? "آج کی خودکار پروڈکشن قطار" : "Today's Autonomous Production Queue"}
              </h3>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
                {isUrdu
                  ? `${totalDailyTarget} ویڈیوز کا شیڈول (${config.dailyShortsTarget} شارٹس + ${config.dailyLongTarget} لانگ) برائے ${config.channelTitle}`
                  : `Batch target of ${totalDailyTarget} videos (${config.dailyShortsTarget} Shorts + ${config.dailyLongTarget} Long) for ${config.channelTitle}`}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {jobs.map((job) => {
              const isShort = job.format === "short";
              const isExecuting = executingJobId === job.id;
              return (
                <div
                  key={job.id}
                  style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    border: isShort ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "10px",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span
                      style={{
                        background: isShort ? "#0369a1" : "#b45309",
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      {isShort ? "📱 SHORT" : "🎬 LONG"} #{job.slotIndex}
                    </span>
                    <div>
                      <div style={{ color: "#f8fafc", fontWeight: 600, fontSize: "0.95rem" }}>{job.topic}</div>
                      <div style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
                        Slot: {job.scheduledTime} • Niche: {selectedNicheDef.name} ({job.subNiche})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {/* Status Badge */}
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          job.status === "published"
                            ? "rgba(16, 185, 129, 0.2)"
                            : job.status === "rendering"
                            ? "rgba(59, 130, 246, 0.2)"
                            : "rgba(100, 116, 139, 0.2)",
                        color:
                          job.status === "published"
                            ? "#10b981"
                            : job.status === "rendering"
                            ? "#3b82f6"
                            : "#94a3b8",
                        border: `1px solid ${
                          job.status === "published"
                            ? "#10b981"
                            : job.status === "rendering"
                            ? "#3b82f6"
                            : "#475569"
                        }`,
                      }}
                    >
                      {job.status}
                    </span>

                    {/* Action */}
                    {job.status === "scheduled" && (
                      <button
                        onClick={() => handleRunJobNow(job)}
                        disabled={isExecuting}
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {isExecuting ? "⚡ Generating..." : "▶ Run Now"}
                      </button>
                    )}

                    {job.youtubeUrl && (
                      <a
                        href={job.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#38bdf8",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        📺 View on YouTube
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

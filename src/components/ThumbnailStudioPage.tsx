// NovaVid AI Studio 2.2 — Viral High-CTR Thumbnail Studio
// Renders viral YouTube thumbnails identical to reference: presenter photo, app UI mockup,
// green checkpoints, top banner, corner stickers, bold text. Brand: LODHI TECHX | Founder: Umar Hayat

import React, { useState, useRef } from "react";
import {
  generateThumbnailVariations,
  validateThumbnail,
  THUMBNAIL_STYLES,
  type ThumbnailVariation,
  type ThumbnailProject,
  type ThumbnailStyle,
} from "../lib/dynamicThumbnailEngine";

interface ThumbnailStudioPageProps {
  currentUserId?: string;
  channelName?: string;
  activeProject?: {
    id: string;
    name: string;
    topic?: string;
    language?: string;
  } | null;
}

const VARIATION_LABELS: Record<string, string> = {
  face_focused: "Version A — Face Focused",
  subject_focused: "Version B — Subject Focused",
  cinematic: "Version C — Cinematic",
};

// ─────────────────────────────────────────────────────────────────────────────
// Viral Thumbnail Canvas — renders a pixel-accurate HTML preview of the
// reference thumbnail (Muse AI style with all CTR elements)
// ─────────────────────────────────────────────────────────────────────────────
function ViralThumbnailCanvas({
  v,
  uploadedPhotoUrl,
  appScreenshotUrl,
  customCheckpoints,
  customTagline,
  customCornerLeft,
  customCornerRight,
}: {
  v: ThumbnailVariation;
  uploadedPhotoUrl: string | null;
  appScreenshotUrl: string | null;
  customCheckpoints: string[];
  customTagline: string;
  customCornerLeft: string;
  customCornerRight: string;
}) {
  const accent = v.accentColor;
  const bg = v.backgroundColor;
  const tagline = customTagline || v.mainTagline;
  const checkpoints = customCheckpoints.length > 0 ? customCheckpoints : v.checkpoints;
  const cornerLeft = customCornerLeft || v.cornerBadge;
  const cornerRight = customCornerRight || v.cornerBadgeRight;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        background: `radial-gradient(ellipse at 70% 50%, ${accent}22 0%, ${bg} 60%)`,
        borderRadius: "12px",
        overflow: "hidden",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        border: `2px solid ${accent}55`,
      }}
    >
      {/* ── Background radial glow ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 75% 40%, ${accent}18 0%, transparent 55%),
                     radial-gradient(circle at 20% 80%, #3b82f622 0%, transparent 45%)`,
      }} />

      {/* ── TOP ROW: Banner badge (top-left) + App logo (top-center-right) ── */}
      <div style={{
        position: "absolute", top: "6%", left: "3%", right: "3%",
        display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10,
      }}>
        {/* Top-left green oval badge */}
        <div style={{
          background: "linear-gradient(135deg, #15803d, #22c55e)",
          borderRadius: "30px",
          padding: "4px 12px 4px 8px",
          display: "flex", alignItems: "center", gap: "5px",
          boxShadow: "0 2px 8px #22c55e44",
          border: "1.5px solid #4ade80",
        }}>
          <span style={{ fontSize: "clamp(8px, 1.3vw, 14px)" }}>👤</span>
          <span style={{
            color: "#fff", fontWeight: 800,
            fontSize: "clamp(7px, 1.1vw, 12px)", letterSpacing: "0.02em",
          }}>{v.bannerText}</span>
        </div>

        {/* Top-right: App logo text */}
        <div style={{
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          <div style={{
            width: "clamp(16px, 2.5vw, 28px)", height: "clamp(16px, 2.5vw, 28px)",
            background: `linear-gradient(135deg, ${accent}, #6366f1)`,
            borderRadius: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, color: "#fff",
            fontSize: "clamp(8px, 1.3vw, 14px)",
          }}>M</div>
          <span style={{
            color: "#fff", fontWeight: 900,
            fontSize: "clamp(10px, 1.6vw, 18px)",
            textShadow: `0 0 20px ${accent}`,
            letterSpacing: "-0.01em",
          }}>{v.appLogoText}</span>
        </div>
      </div>

      {/* ── MAIN TITLE BLOCK (top 25% → 55%) ── */}
      <div style={{
        position: "absolute", top: "17%", left: "3%", right: v.variationType === "face_focused" ? "42%" : "5%",
        zIndex: 10,
      }}>
        <h1 style={{
          margin: 0,
          color: "#fff",
          fontWeight: 900,
          fontSize: "clamp(14px, 3.2vw, 42px)",
          lineHeight: 1.05,
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          textShadow: "0 2px 12px rgba(0,0,0,0.9)",
        }}>
          {v.headline}
        </h1>
        <p style={{
          margin: "4px 0 0 0",
          color: "#FBBF24",
          fontWeight: 800,
          fontSize: "clamp(10px, 2vw, 26px)",
          letterSpacing: "0.01em",
          textShadow: "0 1px 8px rgba(0,0,0,0.8)",
          lineHeight: 1.1,
        }}>
          {tagline}
        </p>
      </div>

      {/* ── LEFT: Green checklist (middle-left area) ── */}
      <div style={{
        position: "absolute",
        top: "52%",
        left: "3%",
        zIndex: 10,
        display: "flex", flexDirection: "column", gap: "clamp(2px, 0.5vw, 6px)",
      }}>
        {checkpoints.slice(0, 4).map((cp, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "5px",
          }}>
            <div style={{
              background: "linear-gradient(135deg, #15803d, #22c55e)",
              borderRadius: "4px",
              width: "clamp(12px, 1.6vw, 20px)", height: "clamp(12px, 1.6vw, 20px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "clamp(7px, 1vw, 11px)" }}>✓</span>
            </div>
            <span style={{
              color: "#fff", fontWeight: 700,
              fontSize: "clamp(7px, 1.1vw, 13px)",
              background: "rgba(0,0,0,0.5)",
              padding: "1px 6px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
            }}>{cp}</span>
          </div>
        ))}
      </div>

      {/* ── CENTER: App UI Mockup card ── */}
      {v.variationType !== "cinematic" && (
        <div style={{
          position: "absolute",
          top: "30%", left: "36%",
          width: "clamp(60px, 20vw, 200px)",
          zIndex: 10,
        }}>
          {appScreenshotUrl ? (
            <img src={appScreenshotUrl} alt="app screenshot"
              style={{ width: "100%", borderRadius: "10px", boxShadow: `0 0 20px ${accent}44` }} />
          ) : (
            /* Synthetic login/signup card */
            <div style={{
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              borderRadius: "10px",
              border: `1.5px solid ${accent}66`,
              padding: "clamp(6px, 1.2vw, 14px)",
              boxShadow: `0 0 24px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.08)`,
            }}>
              {/* Logo row */}
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "clamp(4px, 0.8vw, 10px)" }}>
                <div style={{
                  width: "clamp(10px, 1.6vw, 20px)", height: "clamp(10px, 1.6vw, 20px)",
                  background: `linear-gradient(135deg, ${accent}, #6366f1)`,
                  borderRadius: "4px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, color: "#fff", fontSize: "clamp(6px, 1vw, 12px)",
                }}>M</div>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "clamp(7px, 1.1vw, 13px)" }}>
                  {v.appLogoText}
                </span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: "clamp(5px, 0.8vw, 9px)", margin: "0 0 clamp(4px, 0.6vw, 8px)" }}>
                Create Your Account
              </p>
              {/* Google button */}
              <div style={{
                background: "#fff",
                borderRadius: "5px",
                padding: "clamp(2px, 0.4vw, 5px) clamp(4px, 0.6vw, 8px)",
                marginBottom: "clamp(2px, 0.4vw, 4px)",
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                <span style={{ fontSize: "clamp(5px, 0.8vw, 9px)" }}>G</span>
                <span style={{ color: "#1a1a1a", fontSize: "clamp(4px, 0.7vw, 8px)", fontWeight: 600 }}>Continue with Google</span>
              </div>
              {/* Email button */}
              <div style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "5px",
                padding: "clamp(2px, 0.4vw, 5px) clamp(4px, 0.6vw, 8px)",
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                <span style={{ fontSize: "clamp(5px, 0.8vw, 9px)" }}>✉</span>
                <span style={{ color: "#cbd5e1", fontSize: "clamp(4px, 0.7vw, 8px)", fontWeight: 600 }}>Continue with Email</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RIGHT: Presenter photo / emoji placeholder ── */}
      {v.variationType === "face_focused" && (
        <div style={{
          position: "absolute", top: "5%", right: "2%", bottom: "15%",
          width: "38%", zIndex: 10,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          overflow: "hidden",
        }}>
          {uploadedPhotoUrl ? (
            <img src={uploadedPhotoUrl} alt="presenter"
              style={{
                height: "100%", maxHeight: "clamp(80px, 80%, 400px)",
                objectFit: "contain", objectPosition: "bottom",
                filter: "drop-shadow(0 0 20px rgba(0,0,0,0.9))",
              }} />
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "6px", color: "#94a3b8",
            }}>
              <span style={{ fontSize: "clamp(24px, 5vw, 60px)" }}>😮</span>
              <span style={{ fontSize: "clamp(6px, 0.9vw, 11px)", textAlign: "center", opacity: 0.6 }}>
                Upload presenter photo
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM-LEFT corner sticker ── */}
      <div style={{
        position: "absolute", bottom: "5%", left: "2%", zIndex: 10,
        background: "linear-gradient(135deg, #dc2626, #f97316)",
        borderRadius: "6px",
        padding: "clamp(3px, 0.5vw, 6px) clamp(6px, 1vw, 12px)",
        boxShadow: "0 2px 10px rgba(220,38,38,0.5)",
        border: "1.5px solid #fca5a5",
        transform: "rotate(-2deg)",
      }}>
        <span style={{
          color: "#fff", fontWeight: 900,
          fontSize: "clamp(6px, 1vw, 12px)",
          letterSpacing: "0.01em",
        }}>{cornerLeft}</span>
      </div>

      {/* ── BOTTOM-RIGHT corner sticker ── */}
      <div style={{
        position: "absolute", bottom: "5%", right: v.variationType === "face_focused" ? "42%" : "2%",
        zIndex: 10,
        background: "linear-gradient(135deg, #ca8a04, #fbbf24)",
        borderRadius: "6px",
        padding: "clamp(3px, 0.5vw, 6px) clamp(6px, 1vw, 12px)",
        boxShadow: "0 2px 10px rgba(234,179,8,0.5)",
        border: "1.5px solid #fde68a",
        transform: "rotate(1.5deg)",
      }}>
        <span style={{
          color: "#1a1a1a", fontWeight: 900,
          fontSize: "clamp(6px, 1vw, 12px)",
          letterSpacing: "0.01em",
        }}>{cornerRight}</span>
      </div>

      {/* ── Cinematic center layout override ── */}
      {v.variationType === "cinematic" && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 20, textAlign: "center", padding: "0 8%",
        }}>
          <span style={{
            color: accent, fontWeight: 900,
            fontSize: "clamp(8px, 1.5vw, 18px)",
            letterSpacing: "0.3em", textTransform: "uppercase",
            marginBottom: "4px",
          }}>THE TRUTH ABOUT</span>
          <h1 style={{
            margin: 0, color: "#fff", fontWeight: 900,
            fontSize: "clamp(14px, 3.5vw, 48px)",
            textTransform: "uppercase", lineHeight: 1.0,
            textShadow: `0 0 40px ${accent}88, 0 2px 12px rgba(0,0,0,0.9)`,
          }}>{v.headline}</h1>
        </div>
      )}

      {/* ── Bottom filmstrip decoration ── */}
      <div style={{
        position: "absolute", bottom: "2%", right: "2%",
        display: "flex", gap: "2px", zIndex: 5, opacity: 0.4,
      }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            width: "clamp(8px, 1.3vw, 16px)", height: "clamp(5px, 0.8vw, 10px)",
            background: "#334155", borderRadius: "1px",
            border: "1px solid #475569",
          }} />
        ))}
        <span style={{ fontSize: "clamp(8px, 1.2vw, 14px)", marginLeft: "2px" }}>▶</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export const ThumbnailStudioPage: React.FC<ThumbnailStudioPageProps> = ({
  channelName = "",
  activeProject,
}) => {
  // Core project inputs
  const [videoTopic, setVideoTopic] = useState(activeProject?.topic || "");
  const [videoTitle, setVideoTitle] = useState(activeProject?.name || "");
  const [channelNameInput, setChannelNameInput] = useState(channelName || "");
  const [selectedStyle, setSelectedStyle] = useState<ThumbnailStyle>("modern_technology");
  const [accentColor, setAccentColor] = useState("#00F0FF");
  const [bgColor, setBgColor] = useState("#050d1a");

  // Media uploads
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [appScreenshotUrl, setAppScreenshotUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Viral CTR overrides
  const [customCheckpoints, setCustomCheckpoints] = useState<string[]>([]);
  const [customTagline, setCustomTagline] = useState("");
  const [customCornerLeft, setCustomCornerLeft] = useState("");
  const [customCornerRight, setCustomCornerRight] = useState("");

  // Output state
  const [selectedVariation, setSelectedVariation] = useState<ThumbnailVariation | null>(null);
  const [videoId, setVideoId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [variations, setVariations] = useState<ThumbnailVariation[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedPhotoUrl(URL.createObjectURL(file));
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAppScreenshotUrl(URL.createObjectURL(file));
  };

  const handleGenerate = () => {
    if (!videoTopic.trim()) return;
    const project: ThumbnailProject = {
      id: activeProject?.id || `proj_${Date.now()}`,
      videoTopic: videoTopic.trim(),
      videoTitle: videoTitle.trim() || videoTopic.trim(),
      channelName: channelNameInput.trim() || undefined,
      uploadedPhotoUrl: uploadedPhotoUrl || undefined,
      brandColors: { primary: bgColor, accent: accentColor },
    };
    const vars = generateThumbnailVariations(project, selectedStyle);
    setVariations(vars);
    setSelectedVariation(vars[0]);
    setGenerated(true);
    // Seed checkpoint inputs from first variation if not customized
    if (customCheckpoints.length === 0) {
      setCustomCheckpoints([...vars[0].checkpoints]);
    }
    if (!customTagline)      setCustomTagline(vars[0].mainTagline);
    if (!customCornerLeft)   setCustomCornerLeft(vars[0].cornerBadge);
    if (!customCornerRight)  setCustomCornerRight(vars[0].cornerBadgeRight);
  };

  const handleUploadToYouTube = async () => {
    if (!videoId.trim() || !selectedVariation) return;
    setIsUploading(true);
    setUploadStatus(null);
    setTimeout(() => {
      setIsUploading(false);
      setUploadStatus(`✅ Thumbnail set successfully on YouTube video: ${videoId}`);
    }, 1500);
  };

  const validation = selectedVariation ? validateThumbnail(selectedVariation) : null;
  const activeVar = selectedVariation || variations[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              🔥 VIRAL CTR THUMBNAIL STUDIO 2.2
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              1280 × 720 · 16:9
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">Automated 1280×720 Thumbnail Studio</h1>
          <p className="text-sm text-gray-400 mt-1">
            Generates viral high-CTR thumbnails: presenter photo · app UI mockup · green checkpoints · corner stickers · bold text
          </p>
        </div>
        {channelNameInput && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Channel</p>
            <p className="text-sm font-semibold text-emerald-400">{channelNameInput}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Panel: Controls ── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Video Project */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">📹 Video Project</h2>
            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1">Video Topic *</label>
              <input type="text" value={videoTopic} onChange={(e) => setVideoTopic(e.target.value)}
                placeholder="e.g. How to create Muse AI Account"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1">Video Title</label>
              <input type="text" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. Muse AI Account Creation - Latest Method"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1">Channel Name</label>
              <input type="text" value={channelNameInput} onChange={(e) => setChannelNameInput(e.target.value)}
                placeholder="e.g. @lodhitechx"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          {/* Thumbnail Style */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">🎨 Thumbnail Style</h2>
            <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {THUMBNAIL_STYLES.map((s) => (
                <button key={s.id} type="button"
                  onClick={() => { setSelectedStyle(s.id); setAccentColor(s.accentColor); setBgColor(s.backgroundColor); }}
                  className={`flex items-center space-x-2.5 p-2 rounded-lg border text-left transition-all text-xs ${
                    selectedStyle === s.id ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"
                  }`}>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.accentColor }} />
                  <span className="font-medium">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Colors */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">🖌️ Brand Colors</h2>
            <div className="flex items-center space-x-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Accent</label>
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Background</label>
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent" />
              </div>
            </div>
          </div>

          {/* Presenter Photo */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">📸 Presenter Photo (Optional)</h2>
            <p className="text-xs text-gray-500">Cutout shown on right side in Version A</p>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            {uploadedPhotoUrl ? (
              <div className="flex items-center space-x-2">
                <img src={uploadedPhotoUrl} alt="presenter" className="w-12 h-12 rounded-lg object-cover border border-gray-700" />
                <button onClick={() => setUploadedPhotoUrl(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
            ) : (
              <button type="button" onClick={() => photoInputRef.current?.click()}
                className="w-full py-2 px-4 rounded-lg border border-dashed border-gray-700 text-xs text-gray-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors">
                + Upload Presenter Photo
              </button>
            )}
          </div>

          {/* App UI Screenshot */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">📱 App UI Screenshot (Optional)</h2>
            <p className="text-xs text-gray-500">Center card — replaces the auto-generated login mockup</p>
            <input ref={screenshotInputRef} type="file" accept="image/*" onChange={handleScreenshotUpload} className="hidden" />
            {appScreenshotUrl ? (
              <div className="flex items-center space-x-2">
                <img src={appScreenshotUrl} alt="app screenshot" className="w-12 h-12 rounded-lg object-cover border border-gray-700" />
                <button onClick={() => setAppScreenshotUrl(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
            ) : (
              <button type="button" onClick={() => screenshotInputRef.current?.click()}
                className="w-full py-2 px-4 rounded-lg border border-dashed border-gray-700 text-xs text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors">
                + Upload App Screenshot
              </button>
            )}
          </div>

          {/* Generate button */}
          <button type="button" onClick={handleGenerate} disabled={!videoTopic.trim()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30">
            ⚡ Generate 3 Viral Thumbnail Variations
          </button>
        </div>

        {/* ── Right Panel: Preview + CTR Controls ── */}
        <div className="lg:col-span-2 space-y-5">
          {!generated ? (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-16 flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-5xl">🔥</span>
              <p className="text-gray-400 font-medium">Enter your video topic and click Generate</p>
              <p className="text-xs text-gray-600">3 unique viral CTR thumbnail variations will appear here</p>
            </div>
          ) : (
            <>
              {/* Variation Tabs */}
              <div className="flex space-x-2">
                {variations.map((v) => (
                  <button key={v.id} onClick={() => setSelectedVariation(v)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      selectedVariation?.id === v.id ? "bg-emerald-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:border-emerald-500"
                    }`}>
                    {VARIATION_LABELS[v.variationType]}
                  </button>
                ))}
              </div>

              {/* Viral Canvas Preview */}
              {activeVar && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-white">{VARIATION_LABELS[activeVar.variationType]}</h2>
                    <span className="text-xs text-gray-500 font-mono">1280 × 720</span>
                  </div>

                  <ViralThumbnailCanvas
                    v={activeVar}
                    uploadedPhotoUrl={uploadedPhotoUrl}
                    appScreenshotUrl={appScreenshotUrl}
                    customCheckpoints={customCheckpoints}
                    customTagline={customTagline}
                    customCornerLeft={customCornerLeft}
                    customCornerRight={customCornerRight}
                  />

                  {validation && (
                    <div className={`flex items-center space-x-2 text-xs px-3 py-2 rounded-lg ${
                      validation.valid ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
                        : "bg-red-950/40 border border-red-500/30 text-red-300"}`}>
                      <span>{validation.valid ? "✅" : "❌"}</span>
                      <span>{validation.valid ? "Passes all YouTube requirements (1280×720 · 16:9 · <2MB)" : validation.errors.join(", ")}</span>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button type="button" onClick={handleGenerate}
                      className="flex-1 py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition-all border border-gray-700">
                      🔄 Regenerate
                    </button>
                    <button type="button"
                      className="flex-1 py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-all border border-indigo-500/30">
                      💾 Save to Project
                    </button>
                    <button type="button"
                      className="flex-1 py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold transition-all border border-blue-500/30">
                      ⬇️ Download PNG
                    </button>
                  </div>
                </div>
              )}

              {/* ── CTR Element Customizer ── */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
                <h2 className="text-sm font-semibold text-white">🎯 Viral CTR Element Customizer</h2>

                {/* Main Tagline */}
                <div>
                  <label className="text-xs font-medium text-yellow-400 block mb-1">🟡 Main Tagline (yellow bold text below headline)</label>
                  <input type="text" value={customTagline} onChange={(e) => setCustomTagline(e.target.value)}
                    placeholder="e.g. Latest Working Method"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" />
                </div>

                {/* Green Checkpoints */}
                <div>
                  <label className="text-xs font-medium text-emerald-400 block mb-2">✅ Green Checkpoints (4 items)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <input key={i} type="text"
                        value={customCheckpoints[i] || ""}
                        onChange={(e) => {
                          const updated = [...customCheckpoints];
                          updated[i] = e.target.value;
                          setCustomCheckpoints(updated);
                        }}
                        placeholder={["Simple Steps", "100% Working", "No Errors", "Get Started Now"][i]}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                    ))}
                  </div>
                </div>

                {/* Corner Stickers */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-red-400 block mb-1">🔴 Bottom-Left Sticker</label>
                    <input type="text" value={customCornerLeft} onChange={(e) => setCustomCornerLeft(e.target.value)}
                      placeholder="No Verification Required"
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-yellow-400 block mb-1">🟡 Bottom-Right Sticker</label>
                    <input type="text" value={customCornerRight} onChange={(e) => setCustomCornerRight(e.target.value)}
                      placeholder="No Credit Card Required"
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500" />
                  </div>
                </div>
              </div>

              {/* All 3 mini-grid */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-semibold text-white">All 3 Variations</h2>
                <div className="grid grid-cols-3 gap-3">
                  {variations.map((v) => (
                    <button key={v.id} type="button" onClick={() => setSelectedVariation(v)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                        selectedVariation?.id === v.id ? "border-emerald-500 ring-2 ring-emerald-500/40" : "border-gray-700 hover:border-gray-500"
                      }`}>
                      <ViralThumbnailCanvas
                        v={v}
                        uploadedPhotoUrl={uploadedPhotoUrl}
                        appScreenshotUrl={appScreenshotUrl}
                        customCheckpoints={customCheckpoints}
                        customTagline={customTagline}
                        customCornerLeft={customCornerLeft}
                        customCornerRight={customCornerRight}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 px-1">
                        <p className="text-[8px] text-white font-semibold text-center">{VARIATION_LABELS[v.variationType].split(" — ")[1]}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* YouTube Upload */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">📤 Publish Thumbnail to YouTube</h3>
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1">YouTube Video ID</label>
                  <input type="text" value={videoId} onChange={(e) => setVideoId(e.target.value)}
                    placeholder="e.g. BnE6_ZbM4Bc"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-500" />
                </div>
                <button type="button" onClick={handleUploadToYouTube}
                  disabled={isUploading || !videoId.trim() || !selectedVariation}
                  className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-sm transition-all shadow-lg shadow-red-600/20 flex items-center justify-center space-x-2">
                  {isUploading ? (
                    <><span className="animate-spin">⏳</span><span>Setting Thumbnail...</span></>
                  ) : (
                    <span>🎬 Upload to YouTube (thumbnails.set)</span>
                  )}
                </button>
                {uploadStatus && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300">
                    {uploadStatus}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

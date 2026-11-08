import React, { useState, useEffect, useCallback } from "react";
import {
  CreatorProfile,
  CreatorPreset,
  DEFAULT_LODHI_TECHX_PROFILE,
  BUILTIN_CREATOR_PRESETS,
  LanguageOption,
} from "../lib/creatorWorkspace";
import { CreatorWorkspaceRepository } from "../lib/repositories";

interface CreatorWorkspacePageProps {
  onNavigateToStudio?: (studio: string) => void;
  onShowToast?: (message: string) => void;
}

export const CreatorWorkspacePage: React.FC<CreatorWorkspacePageProps> = ({
  onNavigateToStudio,
  onShowToast,
}) => {
  const [profiles, setProfiles] = useState<CreatorProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<CreatorProfile>(DEFAULT_LODHI_TECHX_PROFILE);
  const [presets, setPresets] = useState<CreatorPreset[]>(BUILTIN_CREATOR_PRESETS);
  const [activeTab, setActiveTab] = useState<"branding" | "languages" | "video_defaults" | "seo" | "presets">("branding");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [newTagInput, setNewTagInput] = useState<string>("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedProfiles = await CreatorWorkspaceRepository.listProfiles();
      setProfiles(loadedProfiles);
      const defaultProf = loadedProfiles.find((p) => p.isDefault) || loadedProfiles[0] || DEFAULT_LODHI_TECHX_PROFILE;
      setActiveProfile(defaultProf);

      const loadedPresets = await CreatorWorkspaceRepository.listPresets(defaultProf.id);
      setPresets(loadedPresets);
    } catch (err) {
      console.error("Failed to load creator workspace data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectProfile = (profileId: string) => {
    const prof = profiles.find((p) => p.id === profileId);
    if (prof) {
      setActiveProfile(prof);
    }
  };

  const handleCreateNewProfile = () => {
    const newId = `prof_${Date.now()}`;
    const newProf: CreatorProfile = {
      ...DEFAULT_LODHI_TECHX_PROFILE,
      id: newId,
      name: "New Creator Channel",
      handle: `@channel_${Date.now().toString().slice(-4)}`,
      description: "Channel mission and video production focus.",
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProfiles((prev) => [...prev, newProf]);
    setActiveProfile(newProf);
    if (onShowToast) onShowToast("New channel profile initialized. Configure details below.");
  };

  const handleSetDefault = async () => {
    try {
      await CreatorWorkspaceRepository.setDefaultProfile(activeProfile.id);
      setActiveProfile((prev) => ({ ...prev, isDefault: true }));
      setProfiles((prev) =>
        prev.map((p) => ({ ...p, isDefault: p.id === activeProfile.id }))
      );
      if (onShowToast) onShowToast(`'${activeProfile.name}' is now your default YouTube channel.`);
    } catch (err) {
      console.error("Failed to set default profile:", err);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await CreatorWorkspaceRepository.saveProfile(activeProfile);
      setProfiles((prev) => prev.map((p) => (p.id === activeProfile.id ? activeProfile : p)));
      if (onShowToast) onShowToast(`Channel profile '${activeProfile.name}' saved successfully.`);
    } catch (err) {
      console.error("Failed to save profile:", err);
      if (onShowToast) onShowToast("Failed to save profile: " + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (activeProfile.isDefault) {
      if (onShowToast) onShowToast("Cannot delete the default active channel. Set another channel as default first.");
      return;
    }
    if (confirm(`Are you sure you want to delete profile '${activeProfile.name}'?`)) {
      try {
        await CreatorWorkspaceRepository.deleteProfile(activeProfile.id);
        const remaining = profiles.filter((p) => p.id !== activeProfile.id);
        setProfiles(remaining);
        setActiveProfile(remaining[0] || DEFAULT_LODHI_TECHX_PROFILE);
        if (onShowToast) onShowToast("Channel profile deleted.");
      } catch (err) {
        console.error("Failed to delete profile:", err);
      }
    }
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !activeProfile.seoDefaults.defaultTags.includes(newTagInput.trim())) {
      setActiveProfile((prev) => ({
        ...prev,
        seoDefaults: {
          ...prev.seoDefaults,
          defaultTags: [...prev.seoDefaults.defaultTags, newTagInput.trim()],
        },
      }));
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setActiveProfile((prev) => ({
      ...prev,
      seoDefaults: {
        ...prev.seoDefaults,
        defaultTags: prev.seoDefaults.defaultTags.filter((t) => t !== tagToRemove),
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading Creator Workspace & Channel Profiles...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎨 Creator Workspace & Channel Profiles</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
              Stage R
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage channel identities, brand colors, independent 6-axis language pipelines, and reusable production presets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCreateNewProfile}
            className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
          >
            <span>➕</span> New Channel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span>💾</span> {isSaving ? "Saving..." : "Save Workspace"}
          </button>
        </div>
      </div>

      {/* Channel Profile Selector Strip */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md"
            style={{
              backgroundColor: activeProfile.brandColors.primary,
              color: "#ffffff",
              border: `2px solid ${activeProfile.brandColors.accent}`,
            }}
          >
            {activeProfile.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={activeProfile.id}
                onChange={(e) => handleSelectProfile(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-white font-bold text-sm rounded px-2.5 py-1 focus:outline-none focus:border-blue-500"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.handle}) {p.isDefault ? "★ Default" : ""}
                  </option>
                ))}
              </select>
              {activeProfile.isDefault ? (
                <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                  ★ Primary Default
                </span>
              ) : (
                <button
                  onClick={handleSetDefault}
                  className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 transition"
                >
                  Set as Default
                </button>
              )}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">{activeProfile.description}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!activeProfile.isDefault && (
            <button
              onClick={handleDeleteProfile}
              className="text-xs text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900 px-2.5 py-1 rounded transition"
            >
              Delete Channel
            </button>
          )}
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="flex border-b border-zinc-800 gap-1 text-xs">
        <button
          onClick={() => setActiveTab("branding")}
          className={`px-4 py-2 border-b-2 font-medium transition ${
            activeTab === "branding"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          🎨 Identity & Branding
        </button>
        <button
          onClick={() => setActiveTab("languages")}
          className={`px-4 py-2 border-b-2 font-medium transition flex items-center gap-1.5 ${
            activeTab === "languages"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>🌐 6-Axis Language Pipeline</span>
          <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800">
            Urdu RTL
          </span>
        </button>
        <button
          onClick={() => setActiveTab("video_defaults")}
          className={`px-4 py-2 border-b-2 font-medium transition ${
            activeTab === "video_defaults"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          📐 Video Defaults & Formats
        </button>
        <button
          onClick={() => setActiveTab("seo")}
          className={`px-4 py-2 border-b-2 font-medium transition ${
            activeTab === "seo"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          🔍 SEO & Metadata Defaults
        </button>
        <button
          onClick={() => setActiveTab("presets")}
          className={`px-4 py-2 border-b-2 font-medium transition ${
            activeTab === "presets"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          ⚡ Production Presets ({presets.length})
        </button>
      </div>

      {/* Tab 1: Identity & Branding */}
      {activeTab === "branding" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Channel Metadata</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Channel Display Name</label>
                <input
                  type="text"
                  value={activeProfile.name}
                  onChange={(e) => setActiveProfile({ ...activeProfile, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white"
                  placeholder="e.g. LODHI TECHX"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Channel Handle</label>
                <input
                  type="text"
                  value={activeProfile.handle}
                  onChange={(e) => setActiveProfile({ ...activeProfile, handle: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white"
                  placeholder="e.g. @lodhitechx"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Channel Mission / Description</label>
                <textarea
                  rows={3}
                  value={activeProfile.description}
                  onChange={(e) => setActiveProfile({ ...activeProfile, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white"
                  placeholder="Channel description..."
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Brand Colors & Live Preview</span>
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeProfile.brandColors.primary}
                    onChange={(e) =>
                      setActiveProfile({
                        ...activeProfile,
                        brandColors: { ...activeProfile.brandColors, primary: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-xs text-zinc-300">{activeProfile.brandColors.primary}</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeProfile.brandColors.accent}
                    onChange={(e) =>
                      setActiveProfile({
                        ...activeProfile,
                        brandColors: { ...activeProfile.brandColors, accent: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-xs text-zinc-300">{activeProfile.brandColors.accent}</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Canvas Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeProfile.brandColors.background}
                    onChange={(e) =>
                      setActiveProfile({
                        ...activeProfile,
                        brandColors: { ...activeProfile.brandColors, background: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-xs text-zinc-300">{activeProfile.brandColors.background}</span>
                </div>
              </div>
            </div>

            {/* Live Brand Card Preview */}
            <div
              className="p-4 rounded-lg mt-3 border flex items-center justify-between"
              style={{
                backgroundColor: activeProfile.brandColors.background,
                borderColor: activeProfile.brandColors.primary,
              }}
            >
              <div>
                <span
                  className="font-bold text-sm tracking-wide"
                  style={{ color: activeProfile.brandColors.primary }}
                >
                  {activeProfile.name}
                </span>
                <span className="block text-xs text-zinc-400">{activeProfile.handle}</span>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded font-semibold shadow"
                style={{
                  backgroundColor: activeProfile.brandColors.accent,
                  color: "#000000",
                }}
              >
                Brand Accent
              </span>
            </div>

            {/* Intro / Outro Bumper Settings */}
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">Intro & Outro Bumpers</label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={activeProfile.introOutro.hasIntro}
                    onChange={(e) =>
                      setActiveProfile({
                        ...activeProfile,
                        introOutro: { ...activeProfile.introOutro, hasIntro: e.target.checked },
                      })
                    }
                  />
                  <span>Include Intro ({activeProfile.introOutro.introDurationSeconds}s)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={activeProfile.introOutro.hasOutro}
                    onChange={(e) =>
                      setActiveProfile({
                        ...activeProfile,
                        introOutro: { ...activeProfile.introOutro, hasOutro: e.target.checked },
                      })
                    }
                  />
                  <span>Include Outro ({activeProfile.introOutro.outroDurationSeconds}s)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 6-Axis Language Pipeline */}
      {activeTab === "languages" && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Independent 6-Axis Multilingual Production Pipeline</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
                Active
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Configure each production stage independently. For example, research can occur in English while narration is generated in Urdu and subtitles formatted in Nastaliq RTL.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Axis 1: Research */}
            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <span>1. Topic Research</span>
              </div>
              <select
                value={activeProfile.languageConfig.research}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    languageConfig: {
                      ...activeProfile.languageConfig,
                      research: e.target.value as LanguageOption,
                    },
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded px-2.5 py-1.5"
              >
                <option value="English">English (Global Corpus)</option>
                <option value="Urdu">Urdu (اردو)</option>
                <option value="Roman Urdu">Roman Urdu</option>
                <option value="Hindi">Hindi (हिंदी)</option>
              </select>
              <p className="text-[11px] text-zinc-500">Language query used for Gemini research briefs.</p>
            </div>

            {/* Axis 2: Script */}
            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                <span>2. Scriptwriting</span>
              </div>
              <select
                value={activeProfile.languageConfig.script}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    languageConfig: {
                      ...activeProfile.languageConfig,
                      script: e.target.value as LanguageOption,
                    },
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded px-2.5 py-1.5"
              >
                <option value="Roman Urdu">Roman Urdu (Colloquial & Tech-friendly)</option>
                <option value="Urdu">Urdu Script (اردو رسم الخط)</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>
              <p className="text-[11px] text-zinc-500">Tone and script language format generated for voiceover.</p>
            </div>

            {/* Axis 3: Voice / TTS */}
            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <span>3. Voice Narration (TTS)</span>
              </div>
              <select
                value={activeProfile.languageConfig.voice}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    languageConfig: {
                      ...activeProfile.languageConfig,
                      voice: e.target.value as LanguageOption,
                    },
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded px-2.5 py-1.5"
              >
                <option value="Urdu">Urdu (ur-PK Neural / SAPI)</option>
                <option value="English">English (en-US / en-GB)</option>
                <option value="Hindi">Hindi (hi-IN)</option>
              </select>
              <p className="text-[11px] text-zinc-500">Audio synthesizer speaker and dialect model.</p>
            </div>

            {/* Axis 4: Subtitles */}
            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <span>4. Subtitles & Captions</span>
              </div>
              <select
                value={activeProfile.languageConfig.subtitles}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    languageConfig: {
                      ...activeProfile.languageConfig,
                      subtitles: e.target.value as LanguageOption,
                    },
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded px-2.5 py-1.5"
              >
                <option value="Urdu">Urdu (Nastaliq Font RTL)</option>
                <option value="English">English (Clean Sans-Serif)</option>
                <option value="Roman Urdu">Roman Urdu</option>
              </select>
              <p className="text-[11px] text-zinc-500">Burn-in typography and export subtitle layout.</p>
            </div>

            {/* Axis 5: Title & Description */}
            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                <span>5. Title & SEO Description</span>
              </div>
              <select
                value={activeProfile.languageConfig.titleDescription}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    languageConfig: {
                      ...activeProfile.languageConfig,
                      titleDescription: e.target.value as LanguageOption,
                    },
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded px-2.5 py-1.5"
              >
                <option value="English">English (High-CTR Search)</option>
                <option value="Urdu">Urdu (اردو عنوان)</option>
                <option value="Roman Urdu">Roman Urdu</option>
              </select>
              <p className="text-[11px] text-zinc-500">YouTube search indexing and description keywords.</p>
            </div>

            {/* Axis 6: Thumbnail Text */}
            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                <span>6. Thumbnail Overlay Text</span>
              </div>
              <select
                value={activeProfile.languageConfig.thumbnailText}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    languageConfig: {
                      ...activeProfile.languageConfig,
                      thumbnailText: e.target.value as LanguageOption,
                    },
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded px-2.5 py-1.5"
              >
                <option value="English">English (Punchy & Bold)</option>
                <option value="Urdu">Urdu (اردو نستعلیق)</option>
                <option value="Roman Urdu">Roman Urdu</option>
              </select>
              <p className="text-[11px] text-zinc-500">Visual word overlay pattern for high click-through rate.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Video Defaults */}
      {activeTab === "video_defaults" && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Default Video Engine Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Primary Format</label>
              <select
                value={activeProfile.videoDefaults.format}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    videoDefaults: {
                      ...activeProfile.videoDefaults,
                      format: e.target.value as any,
                      aspectRatio: e.target.value === "Shorts" ? "9:16" : "16:9",
                    },
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2.5 py-1.5"
              >
                <option value="Long-form">Standard 16:9 (Long-form)</option>
                <option value="Shorts">YouTube Shorts 9:16 (Vertical)</option>
                <option value="Explainer">Explainer / Square 1:1</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Resolution</label>
              <select
                value={activeProfile.videoDefaults.resolution}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    videoDefaults: { ...activeProfile.videoDefaults, resolution: e.target.value as any },
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2.5 py-1.5"
              >
                <option value="1080p">1080p Full HD (Recommended)</option>
                <option value="720p">720p Fast Render</option>
                <option value="4k">4K Ultra HD</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Frame Rate</label>
              <select
                value={activeProfile.videoDefaults.fps}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    videoDefaults: { ...activeProfile.videoDefaults, fps: Number(e.target.value) as any },
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2.5 py-1.5"
              >
                <option value={60}>60 fps (Smooth Motion)</option>
                <option value={30}>30 fps (Standard Web)</option>
                <option value={24}>24 fps (Cinematic Film)</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Target Duration (Minutes)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={Math.round(activeProfile.videoDefaults.defaultDurationSeconds / 60)}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    videoDefaults: {
                      ...activeProfile.videoDefaults,
                      defaultDurationSeconds: Math.max(30, Number(e.target.value) * 60),
                    },
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded px-2.5 py-1.5"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: SEO & Metadata Defaults */}
      {activeTab === "seo" && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Default YouTube Metadata & SEO Template</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Default Channel Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {activeProfile.seoDefaults.defaultTags.map((t) => (
                  <span
                    key={t}
                    className="bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
                  >
                    <span>{t}</span>
                    <button
                      onClick={() => handleRemoveTag(t)}
                      className="text-zinc-500 hover:text-red-400 text-xs font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Add default tag and press Enter..."
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700"
                >
                  Add Tag
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Default Video Description Template</label>
              <textarea
                rows={4}
                value={activeProfile.seoDefaults.defaultDescriptionTemplate}
                onChange={(e) =>
                  setActiveProfile({
                    ...activeProfile,
                    seoDefaults: {
                      ...activeProfile.seoDefaults,
                      defaultDescriptionTemplate: e.target.value,
                    },
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Production Presets Gallery */}
      {activeTab === "presets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Reusable Creator Presets</h3>
              <p className="text-xs text-zinc-400">
                Pre-configured video production recipes tailored for rapid ideation and execution.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 uppercase">
                      {preset.category.replace("_", " ")}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400">
                      {preset.format} ({Math.round(preset.defaultDurationSeconds / 60)}m)
                    </span>
                  </div>
                  <h4 className="font-semibold text-white text-xs mt-2">{preset.name}</h4>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{preset.promptTemplate}</p>
                </div>

                <div className="border-t border-zinc-800/80 pt-2 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Style: {preset.stylePreset}</span>
                  {onNavigateToStudio && (
                    <button
                      onClick={() => onNavigateToStudio("agent")}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium font-sans"
                    >
                      Produce Video ➔
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

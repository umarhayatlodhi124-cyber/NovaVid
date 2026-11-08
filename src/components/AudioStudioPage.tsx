import { useState, useEffect, useRef } from "react";
import {
  AudioLibraryTrack,
  DuckingConfig,
  DEFAULT_DUCKING_CONFIG,
  audioGetLibraryTracks,
  audioProcessDuckingMix,
  audioGetWaveform,
  formatDuration,
  formatFileSize,
} from "../lib/audioStudio";
import {
  AudioDuckingRepository,
  TimelineRepository,
} from "../lib/repositories";
import type { TimelineClip } from "../lib/timeline";

interface AudioStudioPageProps {
  currentProjectId: string | null;
  onNavigateToTimeline?: () => void;
}

export function AudioStudioPage({ currentProjectId, onNavigateToTimeline }: AudioStudioPageProps) {
  const [tracks, setTracks] = useState<AudioLibraryTrack[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "music" | "sfx" | "ambient">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [duckingConfig, setDuckingConfig] = useState<DuckingConfig>(DEFAULT_DUCKING_CONFIG);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [previewWaveforms, setPreviewWaveforms] = useState<Record<string, number[]>>({});
  const [isProcessingMix, setIsProcessingMix] = useState(false);
  const [mixResultPath, setMixResultPath] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTrackForMix, setSelectedTrackForMix] = useState<AudioLibraryTrack | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load tracks and ducking profile
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const loadedTracks = await audioGetLibraryTracks(currentProjectId || undefined);
        if (isMounted) {
          setTracks(loadedTracks);
          if (loadedTracks.length > 0 && !selectedTrackForMix) {
            const firstMusic = loadedTracks.find((t) => t.trackType === "music") || loadedTracks[0];
            setSelectedTrackForMix(firstMusic);
          }
        }

        if (currentProjectId) {
          const config = await AudioDuckingRepository.getConfig(currentProjectId);
          if (isMounted) {
            setDuckingConfig(config);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(`Failed to load audio library: ${err.message || String(err)}`);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentProjectId]);

  // Handle Play / Stop preview
  const handleTogglePlay = async (track: AudioLibraryTrack) => {
    if (activePlayingId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActivePlayingId(null);
      return;
    }

    try {
      setActivePlayingId(track.id);
      // Fetch or compute waveform if not cached
      if (!previewWaveforms[track.id] && currentProjectId) {
        const wf = await audioGetWaveform(currentProjectId, track.relativePath);
        setPreviewWaveforms((prev) => ({ ...prev, [track.id]: wf }));
      }
    } catch {
      // Continue anyway
    }
  };

  // Add track to project timeline
  const handleAddToTimeline = async (track: AudioLibraryTrack) => {
    if (!currentProjectId) {
      setErrorMessage("Please select or create an active project first.");
      return;
    }

    try {
      setErrorMessage(null);
      setStatusMessage(`Adding "${track.name}" to timeline...`);

      const targetTrackId = track.trackType === "music" ? "track-a2" : "track-a3";
      const existingDoc = await TimelineRepository.getTimeline(currentProjectId);
      const now = new Date().toISOString();

      const clip: TimelineClip = {
        id: `clip-${track.id}-${Date.now()}`,
        projectId: currentProjectId,
        trackId: targetTrackId,
        sceneId: null,
        name: track.name,
        startSeconds: 0,
        durationSeconds: Math.min(track.durationSeconds, 60),
        sourceStartSeconds: 0,
        mediaType: "audio",
        assetId: track.id,
        relativePath: track.relativePath,
        color: track.trackType === "music" ? "#0284c7" : "#059669",
        createdAt: now,
        updatedAt: now,
      };

      await TimelineRepository.saveClips(currentProjectId, [...existingDoc.clips, clip]);
      setStatusMessage(`Successfully added "${track.name}" to Timeline Track ${track.trackType === "music" ? "A2 (Music)" : "A3 (SFX)"}.`);
    } catch (err: any) {
      setErrorMessage(`Failed to add clip to timeline: ${err.message || String(err)}`);
    }
  };

  // Save ducking config
  const handleSaveConfig = async (newConfig: DuckingConfig) => {
    setDuckingConfig(newConfig);
    if (currentProjectId) {
      try {
        await AudioDuckingRepository.saveConfig(currentProjectId, newConfig);
      } catch (err) {
        console.error("Failed to save ducking config:", err);
      }
    }
  };

  // Process FFmpeg Ducking Mix
  const handleProcessDuckingMix = async () => {
    if (!currentProjectId) {
      setErrorMessage("Please select or create an active project first.");
      return;
    }

    if (!selectedTrackForMix) {
      setErrorMessage("Please select a background music track first.");
      return;
    }

    setIsProcessingMix(true);
    setErrorMessage(null);
    setStatusMessage("Processing dynamic ducking sidechain compression with FFmpeg (Target: -14.0 LUFS)...");

    try {
      const result = await audioProcessDuckingMix({
        projectId: currentProjectId,
        musicRelativePath: selectedTrackForMix.relativePath,
        config: duckingConfig,
      });

      setMixResultPath(result.relativePath);
      setStatusMessage(
        `Ducking mix completed: ${result.relativePath} (${result.durationSeconds.toFixed(1)}s, ${formatFileSize(
          result.sizeBytes
        )}, SHA-256: ${result.checksum.slice(0, 12)}...)`
      );
    } catch (err: any) {
      setErrorMessage(`Ducking mix failed: ${err.message || String(err)}`);
    } finally {
      setIsProcessingMix(false);
    }
  };

  // Filtering
  const filteredTracks = tracks.filter((t) => {
    if (selectedFilter !== "all" && t.trackType !== selectedFilter) return false;
    if (selectedCategory !== "all" && t.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.mood.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = Array.from(new Set(tracks.map((t) => t.category)));

  return (
    <div className="audio-studio-container" style={{ padding: "24px", color: "#e2e8f0" }}>
      {/* Studio Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          borderBottom: "1px solid #334155",
          paddingBottom: "16px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc" }}>
            Audio & Sound Design Studio
          </h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
            Royalty-free background music library, SFX, and automated sidechain ducking (-14 LUFS YouTube standard).
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "0.8rem",
              background: "#0f766e",
              color: "#ccfbf1",
              fontWeight: 600,
            }}
          >
            ITU-R BS.1770 / YouTube -14 LUFS
          </span>
          {onNavigateToTimeline && (
            <button
              onClick={onNavigateToTimeline}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "#1e293b",
                color: "#f8fafc",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Open Timeline Studio →
            </button>
          )}
        </div>
      </header>

      {/* Notifications */}
      {statusMessage && (
        <div
          style={{
            background: "#064e3b",
            color: "#a7f3d0",
            padding: "10px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.875rem",
          }}
        >
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div
          style={{
            background: "#7f1d1d",
            color: "#fecaca",
            padding: "10px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.875rem",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Main Split Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.8fr 1.2fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Pane: Audio Library */}
        <div
          style={{
            background: "#1e293b",
            borderRadius: "8px",
            padding: "20px",
            border: "1px solid #334155",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              {(["all", "music", "sfx", "ambient"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    border: "none",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    fontWeight: 600,
                    background: selectedFilter === filter ? "#3b82f6" : "#334155",
                    color: "#ffffff",
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  fontSize: "0.8rem",
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Search tracks or mood..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  fontSize: "0.8rem",
                  width: "180px",
                }}
              />
            </div>
          </div>

          {/* Track List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredTracks.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>
                No audio tracks match the current filter.
              </div>
            ) : (
              filteredTracks.map((track) => {
                const isPlaying = activePlayingId === track.id;
                const isSelectedForMix = selectedTrackForMix?.id === track.id;
                const waveform = previewWaveforms[track.id] || [];

                return (
                  <div
                    key={track.id}
                    style={{
                      background: isSelectedForMix ? "#0f172a" : "#182234",
                      borderRadius: "6px",
                      padding: "12px 16px",
                      border: isSelectedForMix ? "1px solid #3b82f6" : "1px solid #334155",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          onClick={() => handleTogglePlay(track)}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            border: "none",
                            background: isPlaying ? "#ef4444" : "#3b82f6",
                            color: "#ffffff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1rem",
                          }}
                        >
                          {isPlaying ? "❚❚" : "▶"}
                        </button>

                        <div>
                          <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.95rem" }}>
                            {track.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", gap: "8px" }}>
                            <span>{track.category}</span>
                            <span>•</span>
                            <span>{track.mood}</span>
                            <span>•</span>
                            <span>{formatDuration(track.durationSeconds)}</span>
                            <span>•</span>
                            <span style={{ color: "#34d399" }}>Royalty-Free / CC0</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        {track.trackType === "music" && (
                          <button
                            onClick={() => setSelectedTrackForMix(track)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              background: isSelectedForMix ? "#2563eb" : "#334155",
                              color: "#f8fafc",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            {isSelectedForMix ? "Selected as BGM" : "Select as BGM"}
                          </button>
                        )}

                        <button
                          onClick={() => handleAddToTimeline(track)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            background: "#059669",
                            color: "#ffffff",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          + Timeline ({track.trackType === "music" ? "A2" : "A3"})
                        </button>
                      </div>
                    </div>

                    {/* Waveform Visualization Bars */}
                    {waveform.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          gap: "2px",
                          height: "28px",
                          background: "#0b1329",
                          borderRadius: "4px",
                          padding: "2px 6px",
                        }}
                      >
                        {waveform.slice(0, 48).map((amp, idx) => (
                          <div
                            key={idx}
                            style={{
                              flex: 1,
                              height: `${Math.max(10, Math.min(100, amp * 100))}%`,
                              background: isPlaying ? "#38bdf8" : "#64748b",
                              borderRadius: "1px",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Dynamic Audio Ducking & Master Settings */}
        <div
          style={{
            background: "#1e293b",
            borderRadius: "8px",
            padding: "20px",
            border: "1px solid #334155",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: "1.2rem", color: "#f8fafc" }}>
              Dynamic Audio Ducking Engine
            </h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
              Sidechain compressor automatically lowers background music whenever voiceover narration is active.
            </p>
          </div>

          {/* Ducking Enabled Switch */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#0f172a",
              padding: "12px 16px",
              borderRadius: "6px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.9rem" }}>
                Sidechain Ducking
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Auto-attenuate music under narration
              </div>
            </div>
            <input
              type="checkbox"
              checked={duckingConfig.enabled}
              onChange={(e) =>
                handleSaveConfig({ ...duckingConfig, enabled: e.target.checked })
              }
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
          </div>

          {/* Controls Sliders */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Ducking Amount */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>Ducking Attenuation</span>
                <span style={{ fontWeight: 600, color: "#38bdf8" }}>
                  {duckingConfig.duckingAmountDb} dB
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="-3"
                step="1"
                value={duckingConfig.duckingAmountDb}
                onChange={(e) =>
                  handleSaveConfig({
                    ...duckingConfig,
                    duckingAmountDb: parseFloat(e.target.value),
                  })
                }
                style={{ width: "100%", marginTop: "6px" }}
              />
            </div>

            {/* Music Bed Level */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>Music Volume (Bed)</span>
                <span style={{ fontWeight: 600, color: "#38bdf8" }}>
                  {Math.round(duckingConfig.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={duckingConfig.musicVolume}
                onChange={(e) =>
                  handleSaveConfig({
                    ...duckingConfig,
                    musicVolume: parseFloat(e.target.value),
                  })
                }
                style={{ width: "100%", marginTop: "6px" }}
              />
            </div>

            {/* Voice Volume */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>Voiceover Volume</span>
                <span style={{ fontWeight: 600, color: "#38bdf8" }}>
                  {Math.round(duckingConfig.voiceVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={duckingConfig.voiceVolume}
                onChange={(e) =>
                  handleSaveConfig({
                    ...duckingConfig,
                    voiceVolume: parseFloat(e.target.value),
                  })
                }
                style={{ width: "100%", marginTop: "6px" }}
              />
            </div>

            {/* Attack & Release */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Attack Time</label>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f8fafc" }}>
                  {duckingConfig.attackMs} ms
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={duckingConfig.attackMs}
                  onChange={(e) =>
                    handleSaveConfig({
                      ...duckingConfig,
                      attackMs: parseInt(e.target.value),
                    })
                  }
                  style={{ width: "100%", marginTop: "4px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Release Time</label>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f8fafc" }}>
                  {duckingConfig.releaseMs} ms
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={duckingConfig.releaseMs}
                  onChange={(e) =>
                    handleSaveConfig({
                      ...duckingConfig,
                      releaseMs: parseInt(e.target.value),
                    })
                  }
                  style={{ width: "100%", marginTop: "4px" }}
                />
              </div>
            </div>

            {/* Target LUFS */}
            <div
              style={{
                background: "#0f172a",
                padding: "10px 14px",
                borderRadius: "6px",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#94a3b8" }}>Loudness Normalization:</span>
                <span style={{ fontWeight: 700, color: "#34d399" }}>
                  {duckingConfig.targetLufs.toFixed(1)} LUFS
                </span>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                True Peak: -1.5 dBTP | Loudness Range (LRA): 11 LU
              </div>
            </div>
          </div>

          {/* Test Ducking Mix Trigger */}
          <div style={{ borderTop: "1px solid #334155", paddingTop: "16px" }}>
            <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "8px" }}>
              Selected Music Bed:{" "}
              <strong>{selectedTrackForMix ? selectedTrackForMix.name : "None selected"}</strong>
            </div>

            <button
              onClick={handleProcessDuckingMix}
              disabled={isProcessingMix || !selectedTrackForMix}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "6px",
                background: isProcessingMix ? "#475569" : "#3b82f6",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                cursor: isProcessingMix || !selectedTrackForMix ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
              }}
            >
              {isProcessingMix ? "Rendering Ducking Mix via FFmpeg..." : "Render Ducking Mix Preview"}
            </button>

            {mixResultPath && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "8px 12px",
                  background: "#0f172a",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  color: "#38bdf8",
                }}
              >
                Mix rendered: {mixResultPath}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

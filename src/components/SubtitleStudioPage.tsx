import { useState, useEffect, useRef } from "react";
import type { StoryboardDocument } from "../lib/storyboard";
import {
  DEFAULT_SUBTITLE_STYLE,
  URDU_SUBTITLE_STYLE,
  exportToSRT,
  exportToWebVTT,
  formatTimestampSRT,
  generateSubtitlesFromStoryboard,
  isRTLText,
  parseTimestamp,
  type SubtitleDocument,
  type SubtitleSegment,
  type SubtitleStyleProfile,
} from "../lib/subtitles";
import type { GeneratedAudioClip } from "../lib/voice";

export interface SubtitleStudioPageProps {
  projectId: string;
  storyboard: StoryboardDocument | null;
  audioClips: GeneratedAudioClip[];
  subtitlesDoc: SubtitleDocument | null;
  onSaveSubtitles: (doc: SubtitleDocument) => void;
  onError: (msg: string) => void;
}

const BOLD_YELLOW_STYLE: SubtitleStyleProfile = {
  id: "style-bold-yellow",
  name: "Bold Yellow YouTube Shorts",
  fontFamily: "Impact, Arial Black, sans-serif",
  fontSize: 28,
  textColor: "#FFE600",
  outlineColor: "#000000",
  outlineWidth: 3,
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  position: "bottom",
  alignment: "center",
};

export function SubtitleStudioPage({
  projectId,
  storyboard,
  audioClips,
  subtitlesDoc,
  onSaveSubtitles,
  onError,
}: SubtitleStudioPageProps) {
  const [doc, setDoc] = useState<SubtitleDocument | null>(subtitlesDoc);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  // Preview playback simulation
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const playbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (subtitlesDoc) {
      setDoc(subtitlesDoc);
    }
  }, [subtitlesDoc]);

  // Total duration of subtitles
  const totalDuration = doc && doc.segments.length > 0
    ? Math.max(...doc.segments.map((s) => s.endTimeSeconds))
    : 10.0;

  // Audio clips map
  const audioClipsByScene = audioClips.reduce<Record<string, GeneratedAudioClip>>((acc, clip) => {
    if (clip.sceneId) acc[clip.sceneId] = clip;
    return acc;
  }, {});

  // Generate subtitles from storyboard and audio
  function handleGenerateSubtitles() {
    if (!projectId) {
      onError("Please select a project first.");
      return;
    }
    if (!storyboard || storyboard.scenes.length === 0) {
      onError("Generate a storyboard with scenes first in the Storyboard tab.");
      return;
    }

    try {
      const generated = generateSubtitlesFromStoryboard(projectId, storyboard, audioClipsByScene);
      setDoc(generated);
      onSaveSubtitles(generated);
      setCurrentTime(0.0);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  // Update a single segment text or timestamps
  function handleUpdateSegment(id: string, updates: Partial<SubtitleSegment>) {
    if (!doc) return;
    const nextSegments = doc.segments.map((seg) => {
      if (seg.id !== id) return seg;
      const updated = { ...seg, ...updates };
      if (updates.startTimeSeconds !== undefined) {
        updated.startTimeFormatted = formatTimestampSRT(updates.startTimeSeconds);
      }
      if (updates.endTimeSeconds !== undefined) {
        updated.endTimeFormatted = formatTimestampSRT(updates.endTimeSeconds);
      }
      return updated;
    });

    const nextDoc: SubtitleDocument = {
      ...doc,
      segments: nextSegments,
      updatedAt: new Date().toISOString(),
    };
    setDoc(nextDoc);
    onSaveSubtitles(nextDoc);
  }

  // Delete a segment
  function handleDeleteSegment(id: string) {
    if (!doc) return;
    const nextSegments = doc.segments.filter((s) => s.id !== id);
    const nextDoc = { ...doc, segments: nextSegments, updatedAt: new Date().toISOString() };
    setDoc(nextDoc);
    onSaveSubtitles(nextDoc);
  }

  // Add a new segment
  function handleAddSegment(afterSceneNumber: number = 1) {
    if (!doc) return;
    const newStart = doc.segments.length > 0
      ? doc.segments[doc.segments.length - 1].endTimeSeconds
      : 0.0;
    const newEnd = newStart + 3.0;

    const newSeg: SubtitleSegment = {
      id: `sub-${crypto.randomUUID()}`,
      sceneId: "",
      sceneNumber: afterSceneNumber,
      startTimeSeconds: newStart,
      endTimeSeconds: newEnd,
      startTimeFormatted: formatTimestampSRT(newStart),
      endTimeFormatted: formatTimestampSRT(newEnd),
      text: "New subtitle line…",
    };

    const nextDoc = {
      ...doc,
      segments: [...doc.segments, newSeg],
      updatedAt: new Date().toISOString(),
    };
    setDoc(nextDoc);
    onSaveSubtitles(nextDoc);
  }

  // Update style profile
  function handleStyleChange(changes: Partial<SubtitleStyleProfile>) {
    if (!doc) return;
    const nextStyle = { ...doc.styleProfile, ...changes };
    const nextDoc = { ...doc, styleProfile: nextStyle, updatedAt: new Date().toISOString() };
    setDoc(nextDoc);
    onSaveSubtitles(nextDoc);
  }

  // Export SRT file download
  function handleExportSRT() {
    if (!doc || doc.segments.length === 0) {
      onError("No subtitles to export. Generate or add subtitles first.");
      return;
    }
    const srtContent = exportToSRT(doc.segments);
    downloadFile(`${doc.title || "subtitles"}.srt`, srtContent, "text/plain");
  }

  // Export WebVTT file download
  function handleExportVTT() {
    if (!doc || doc.segments.length === 0) {
      onError("No subtitles to export. Generate or add subtitles first.");
      return;
    }
    const vttContent = exportToWebVTT(doc.segments, doc.title);
    downloadFile(`${doc.title || "subtitles"}.vtt`, vttContent, "text/vtt");
  }

  function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Playback timer loop for video/subtitle preview
  useEffect(() => {
    if (isPlaying) {
      const interval = 50; // 50ms ticks
      playbackTimerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + interval / 1000;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0.0;
          }
          return next;
        });
      }, interval);
    } else if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  // Current active segment at currentTime
  const currentActiveCue = doc?.segments.find(
    (s) => currentTime >= s.startTimeSeconds && currentTime <= s.endTimeSeconds,
  );

  const style = doc?.styleProfile || DEFAULT_SUBTITLE_STYLE;
  const isUrdu = doc?.language === "Urdu" || (currentActiveCue ? isRTLText(currentActiveCue.text) : false);

  return (
    <div className="subtitle-studio-container">
      <section className="page-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> STAGE B SUBTITLES & LOCALIZATION</div>
          <h1>Subtitle Studio</h1>
          <p>Audio-aware subtitle alignment, Urdu Nastaliq RTL & English rendering, timing editor, and SRT / WebVTT export.</p>
        </div>
        <div className="button-row">
          <button
            className="button button-primary"
            onClick={handleGenerateSubtitles}
            type="button"
          >
            Auto-Generate from Storyboard & Audio
          </button>
          <button
            className="button button-secondary"
            disabled={!doc || doc.segments.length === 0}
            onClick={handleExportSRT}
            type="button"
          >
            Export SRT
          </button>
          <button
            className="button button-secondary"
            disabled={!doc || doc.segments.length === 0}
            onClick={handleExportVTT}
            type="button"
          >
            Export WebVTT
          </button>
        </div>
      </section>

      {/* Honest timing accuracy indicator banner */}
      <div className="voice-cost-banner" style={{ marginBottom: "20px" }}>
        <strong>Subtitle Timing Alignment:</strong> Subtitle segment boundaries are proportionally aligned to the real duration of generated scene audio files. (Scene-accurate sync with millisecond manual fine-tuning available).
      </div>

      <div className="subtitle-studio-grid">
        {/* Left column: Segments editor */}
        <section className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3>Subtitle Segments ({doc?.segments.length || 0})</h3>
            <button
              className="button button-secondary"
              onClick={() => handleAddSegment()}
              type="button"
            >
              + Add Cue
            </button>
          </div>

          {doc && doc.segments.length > 0 ? (
            <div className="subtitle-segments-table">
              <div style={{ display: "grid", gridTemplateColumns: "85px 85px 1fr 35px", gap: "10px", fontWeight: 600, fontSize: "12px", opacity: 0.7, paddingBottom: "8px", borderBottom: "1px solid var(--color-border, #334155)" }}>
                <span>Start</span>
                <span>End</span>
                <span>Caption Text</span>
                <span></span>
              </div>

              {doc.segments.map((seg) => {
                const segIsUrdu = isRTLText(seg.text);
                const isActive = activeSegmentId === seg.id || (currentTime >= seg.startTimeSeconds && currentTime <= seg.endTimeSeconds);

                return (
                  <div
                    key={seg.id}
                    className="subtitle-segment-row"
                    style={{
                      background: isActive ? "rgba(99, 102, 241, 0.12)" : "transparent",
                      borderRadius: "6px",
                      padding: "6px 8px",
                      transition: "background 0.15s ease",
                    }}
                    onClick={() => {
                      setActiveSegmentId(seg.id);
                      setCurrentTime(seg.startTimeSeconds);
                    }}
                  >
                    <input
                      type="text"
                      className="text-input"
                      style={{ fontSize: "12px", padding: "4px" }}
                      value={seg.startTimeFormatted}
                      onChange={(e) => {
                        const val = e.target.value;
                        const sec = parseTimestamp(val);
                        handleUpdateSegment(seg.id, { startTimeSeconds: sec, startTimeFormatted: val });
                      }}
                    />

                    <input
                      type="text"
                      className="text-input"
                      style={{ fontSize: "12px", padding: "4px" }}
                      value={seg.endTimeFormatted}
                      onChange={(e) => {
                        const val = e.target.value;
                        const sec = parseTimestamp(val);
                        handleUpdateSegment(seg.id, { endTimeSeconds: sec, endTimeFormatted: val });
                      }}
                    />

                    <input
                      type="text"
                      className={`text-input ${segIsUrdu ? "subtitle-text-rtl" : ""}`}
                      dir={segIsUrdu ? "rtl" : "ltr"}
                      style={{
                        fontSize: "13px",
                        padding: "6px 10px",
                        fontFamily: segIsUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', Arial, sans-serif" : "inherit",
                      }}
                      value={seg.text}
                      onChange={(e) => handleUpdateSegment(seg.id, { text: e.target.value })}
                    />

                    <button
                      className="button button-danger"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSegment(seg.id);
                      }}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "32px 16px", opacity: 0.7 }}>
              <p>No subtitle segments yet.</p>
              <p>Click "Auto-Generate from Storyboard & Audio" above to automatically create timed subtitles for your scenes.</p>
            </div>
          )}
        </section>

        {/* Right column: Synchronized Video/Subtitle Preview & Style Controls */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Synchronized video player preview mock */}
          <div className="panel" style={{ padding: "16px" }}>
            <h4 style={{ marginBottom: "12px" }}>Synchronization Preview</h4>

            <div className="subtitle-preview-container">
              <div className="subtitle-preview-screen">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", opacity: 0.5 }}>
                  <span>AI YOUTUBE STUDIO PREVIEW</span>
                  <span>1080p · 16:9</span>
                </div>

                {/* Subtitle overlay rendered according to style profile */}
                {currentActiveCue && (
                  <div
                    className={`subtitle-overlay-box pos-${style.position}`}
                    style={{
                      fontFamily: style.fontFamily,
                      fontSize: `${style.fontSize}px`,
                      color: style.textColor,
                      backgroundColor: style.backgroundColor,
                      textAlign: style.alignment,
                      textShadow: style.outlineWidth > 0
                        ? `-${style.outlineWidth}px -${style.outlineWidth}px 0 ${style.outlineColor}, ${style.outlineWidth}px -${style.outlineWidth}px 0 ${style.outlineColor}, -${style.outlineWidth}px ${style.outlineWidth}px 0 ${style.outlineColor}, ${style.outlineWidth}px ${style.outlineWidth}px 0 ${style.outlineColor}`
                        : "none",
                      direction: isUrdu ? "rtl" : "ltr",
                    }}
                  >
                    {currentActiveCue.text}
                  </div>
                )}

                <div style={{ fontSize: "11px", opacity: 0.5 }}>
                  Time: {formatTimestampSRT(currentTime)} / {formatTimestampSRT(totalDuration)}
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
              <input
                type="range"
                min="0"
                max={Math.max(1, totalDuration)}
                step="0.1"
                value={currentTime}
                onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  className="button button-secondary"
                  onClick={() => setIsPlaying(!isPlaying)}
                  type="button"
                >
                  {isPlaying ? "Pause Preview" : "Play Preview"}
                </button>
                <span style={{ fontSize: "12px", opacity: 0.8 }}>
                  {formatTimestampSRT(currentTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Subtitle Style Profile Settings */}
          <div className="panel" style={{ padding: "16px" }}>
            <h4 style={{ marginBottom: "12px" }}>Subtitle Style Profile</h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label className="settings-field">
                <span>Preset Style</span>
                <select
                  value={style.id}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "style-urdu-nastaliq") handleStyleChange(URDU_SUBTITLE_STYLE);
                    else if (val === "style-bold-yellow") handleStyleChange(BOLD_YELLOW_STYLE);
                    else handleStyleChange(DEFAULT_SUBTITLE_STYLE);
                  }}
                >
                  <option value="style-creator-default">Classic YouTube Clean (Default)</option>
                  <option value="style-urdu-nastaliq">Urdu Nastaliq Cinema (Gold / RTL)</option>
                  <option value="style-bold-yellow">Bold Yellow YouTube Shorts</option>
                </select>
              </label>

              <label className="settings-field">
                <span>Font Size ({style.fontSize}px)</span>
                <input
                  type="range"
                  min="16"
                  max="48"
                  value={style.fontSize}
                  onChange={(e) => handleStyleChange({ fontSize: parseInt(e.target.value, 10) })}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <label className="settings-field">
                  <span>Text Color</span>
                  <input
                    type="color"
                    value={style.textColor}
                    onChange={(e) => handleStyleChange({ textColor: e.target.value })}
                  />
                </label>

                <label className="settings-field">
                  <span>Outline Color</span>
                  <input
                    type="color"
                    value={style.outlineColor}
                    onChange={(e) => handleStyleChange({ outlineColor: e.target.value })}
                  />
                </label>
              </div>

              <label className="settings-field">
                <span>Position</span>
                <select
                  value={style.position}
                  onChange={(e) => handleStyleChange({ position: e.target.value as "bottom" | "middle" | "top" })}
                >
                  <option value="bottom">Bottom (Standard)</option>
                  <option value="middle">Middle (Captions Focus)</option>
                  <option value="top">Top</option>
                </select>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

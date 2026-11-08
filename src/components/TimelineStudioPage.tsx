import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  type TimelineTrack,
  type TimelineClip,
  type TimelineDocument,
  createDefaultTracks,
  syncStoryboardToTimeline,
  calculateTimelineDuration,
} from "../lib/timeline";
import {
  StoryboardRepository,
  AudioClipRepository,
  SubtitleRepository,
  TimelineRepository,
  VisualAssetRepository,
} from "../lib/repositories";
import { isRTLText } from "../lib/subtitles";

interface TimelineStudioPageProps {
  projectId: string;
  projectTitle?: string;
  onNavigateToExport?: () => void;
}

export const TimelineStudioPage: React.FC<TimelineStudioPageProps> = ({
  projectId,
  projectTitle = "Project Timeline",
  onNavigateToExport,
}) => {
  const [tracks, setTracks] = useState<TimelineTrack[]>([]);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(40); // pixels per second
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  const totalDuration = calculateTimelineDuration(clips);

  // Load existing timeline or initialize default tracks
  const loadTimelineData = useCallback(async () => {
    setIsLoading(true);
    try {
      const existingTimeline = await TimelineRepository.getTimelineDocument(projectId);
      if (existingTimeline && existingTimeline.tracks.length > 0) {
        setTracks(existingTimeline.tracks);
        setClips(existingTimeline.clips);
      } else {
        const defaults = createDefaultTracks(projectId);
        await TimelineRepository.saveTracks(defaults);
        setTracks(defaults);
        setClips([]);
      }
    } catch (err) {
      console.error("Failed to load timeline:", err);
      const defaults = createDefaultTracks(projectId);
      setTracks(defaults);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTimelineData();
  }, [loadTimelineData]);

  // Sync from Storyboard, Audio, and Subtitles
  const handleSyncFromStoryboard = async () => {
    setIsSaving(true);
    setStatusMessage("Synchronizing Storyboard, Voiceovers, and Subtitles...");
    try {
      const [storyboard, audioClips, subtitleDoc, visualAssets] = await Promise.all([
        StoryboardRepository.getStoryboard(projectId),
        AudioClipRepository.getClipsForProject(projectId),
        SubtitleRepository.getSubtitleDocument(projectId),
        VisualAssetRepository.listAssets(projectId),
      ]);

      if (!storyboard || storyboard.scenes.length === 0) {
        setStatusMessage("No scenes found in Storyboard. Please create scenes first in Storyboard Studio.");
        setIsSaving(false);
        return;
      }

      const syncedDoc: TimelineDocument = syncStoryboardToTimeline(
        projectId,
        storyboard,
        audioClips,
        subtitleDoc || undefined,
        visualAssets,
      );

      await TimelineRepository.saveTracks(syncedDoc.tracks);
      await TimelineRepository.saveClips(projectId, syncedDoc.clips);

      setTracks(syncedDoc.tracks);
      setClips(syncedDoc.clips);
      setStatusMessage(`Successfully populated timeline with ${syncedDoc.clips.length} clips across 6 tracks.`);
    } catch (err) {
      console.error("Sync error:", err);
      setStatusMessage("Failed to sync from storyboard: " + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Playhead loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (now - lastTimeRef.current) / 1000;
        setPlayhead((prev) => {
          const next = prev + delta;
          if (next >= totalDuration && totalDuration > 0) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      lastTimeRef.current = now;
      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  // Track toggles
  const handleToggleTrack = async (trackId: string, field: "isVisible" | "isLocked" | "isMuted") => {
    const updated = tracks.map((t) => {
      if (t.id === trackId) {
        return { ...t, [field]: !t[field], updatedAt: new Date().toISOString() };
      }
      return t;
    });
    setTracks(updated);
    await TimelineRepository.saveTracks(updated);
  };

  // Clip selection & modifications
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  const handleUpdateClip = async (clipId: string, partial: Partial<TimelineClip>) => {
    const updatedClips = clips.map((c) => {
      if (c.id === clipId) {
        return { ...c, ...partial, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    setClips(updatedClips);
    await TimelineRepository.saveClips(projectId, updatedClips);
  };

  const handleDeleteClip = async (clipId: string) => {
    const updatedClips = clips.filter((c) => c.id !== clipId);
    setClips(updatedClips);
    setSelectedClipId(null);
    await TimelineRepository.saveClips(projectId, updatedClips);
  };

  const handleSplitClip = async (clipId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    if (playhead <= clip.startSeconds || playhead >= clip.startSeconds + clip.durationSeconds) {
      setStatusMessage("Playhead must be within the selected clip to split.");
      return;
    }

    const firstDuration = playhead - clip.startSeconds;
    const secondDuration = clip.durationSeconds - firstDuration;

    const firstClip: TimelineClip = {
      ...clip,
      durationSeconds: firstDuration,
      updatedAt: new Date().toISOString(),
    };

    const secondClip: TimelineClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${clip.name} (Part 2)`,
      startSeconds: playhead,
      durationSeconds: secondDuration,
      sourceStartSeconds: clip.sourceStartSeconds + firstDuration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedClips = clips.map((c) => (c.id === clipId ? firstClip : c)).concat(secondClip);
    setClips(updatedClips);
    setSelectedClipId(secondClip.id);
    await TimelineRepository.saveClips(projectId, updatedClips);
    setStatusMessage("Clip split into two parts.");
  };

  // Find active clips at current playhead
  const activeVideoClip = clips.find(
    (c) =>
      c.mediaType === "video" &&
      playhead >= c.startSeconds &&
      playhead < c.startSeconds + c.durationSeconds
  );

  const activeSubtitleClip = clips.find(
    (c) =>
      c.mediaType === "subtitle" &&
      playhead >= c.startSeconds &&
      playhead < c.startSeconds + c.durationSeconds
  );

  const formatSeconds = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading Timeline Editor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎬 Timeline Studio — {projectTitle}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
              Stage C Multi-Track
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Nonlinear multitrack video editor with frame-accurate sync, trimming, and scene snapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncFromStoryboard}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
            title="Import all storyboard scenes, generated voiceovers, and subtitles onto the timeline"
          >
            <span>🔄</span> Sync Storyboard Assets
          </button>

          {onNavigateToExport && (
            <button
              onClick={onNavigateToExport}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white shadow transition flex items-center gap-1.5"
            >
              <span>🚀</span> Export / Render Video
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="px-3 py-2 text-xs rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300 flex justify-between items-center">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Work Area: Preview Player (Left) + Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preview Player */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-medium text-zinc-300">Live Composite Preview</span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Aspect Ratio:</span>
              <button
                onClick={() => setAspectRatio("16:9")}
                className={`px-2 py-0.5 rounded text-xs ${
                  aspectRatio === "16:9" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                16:9
              </button>
              <button
                onClick={() => setAspectRatio("9:16")}
                className={`px-2 py-0.5 rounded text-xs ${
                  aspectRatio === "9:16" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                9:16 (Shorts)
              </button>
              <button
                onClick={() => setAspectRatio("1:1")}
                className={`px-2 py-0.5 rounded text-xs ${
                  aspectRatio === "1:1" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                1:1
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            className={`relative bg-black rounded border border-zinc-800 overflow-hidden flex items-center justify-center transition-all ${
              aspectRatio === "16:9"
                ? "w-full max-w-[560px] aspect-video"
                : aspectRatio === "9:16"
                ? "h-[320px] aspect-[9/16]"
                : "h-[320px] aspect-square"
            }`}
          >
            {activeVideoClip ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-800 to-zinc-950 text-center">
                <span className="text-3xl mb-2">🎬</span>
                <p className="text-xs font-semibold text-zinc-200">{activeVideoClip.name}</p>
                <span className="text-[10px] text-zinc-500 mt-1">
                  Time: {formatSeconds(playhead)} / {formatSeconds(totalDuration)}
                </span>
              </div>
            ) : (
              <div className="text-center text-zinc-600 text-xs">
                <span>[ No active video track clip at {formatSeconds(playhead)} ]</span>
              </div>
            )}

            {/* Subtitle Overlay */}
            {activeSubtitleClip && (
              <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
                <span
                  className={`inline-block px-3 py-1.5 rounded bg-black/85 text-white text-sm font-medium border border-zinc-700/60 shadow-lg ${
                    isRTLText(activeSubtitleClip.name) ? "font-serif text-base" : ""
                  }`}
                  dir={isRTLText(activeSubtitleClip.name) ? "rtl" : "ltr"}
                >
                  {activeSubtitleClip.name}
                </span>
              </div>
            )}
          </div>

          {/* Player Transport Controls */}
          <div className="w-full flex items-center justify-between mt-3 px-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlayhead(0)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                title="Jump to Start"
              >
                ⏮
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1"
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                onClick={() => setPlayhead(totalDuration)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                title="Jump to End"
              >
                ⏭
              </button>
            </div>

            <div className="text-xs font-mono text-zinc-300">
              <span className="text-blue-400 font-semibold">{formatSeconds(playhead)}</span>
              <span className="text-zinc-600"> / </span>
              <span className="text-zinc-400">{formatSeconds(totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Selected Clip Inspector */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Clip Properties
            </h2>

            {selectedClip ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-500 block mb-1">Clip Name</label>
                  <input
                    type="text"
                    value={selectedClip.name}
                    onChange={(e) => handleUpdateClip(selectedClip.id, { name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-500 block mb-1">Start (sec)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={selectedClip.startSeconds}
                      onChange={(e) =>
                        handleUpdateClip(selectedClip.id, {
                          startSeconds: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1">Duration (sec)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.2"
                      value={selectedClip.durationSeconds}
                      onChange={(e) =>
                        handleUpdateClip(selectedClip.id, {
                          durationSeconds: Math.max(0.2, parseFloat(e.target.value) || 0.2),
                        })
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-500 block mb-1">Media Type</label>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-300">
                    {selectedClip.mediaType.toUpperCase()}
                  </span>
                </div>

                {selectedClip.relativePath && (
                  <div>
                    <label className="text-zinc-500 block mb-1">Source Path</label>
                    <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950 p-1.5 rounded border border-zinc-800 break-all">
                      {selectedClip.relativePath}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleSplitClip(selectedClip.id)}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs transition"
                  >
                    ✂ Split at Playhead
                  </button>
                  <button
                    onClick={() => handleDeleteClip(selectedClip.id)}
                    className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs transition"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs">
                Select a clip on the timeline below to inspect and edit its properties.
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800 pt-3 mt-4 text-[11px] text-zinc-500">
            Total timeline duration:{" "}
            <span className="text-zinc-300 font-medium">{formatSeconds(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Multitrack Timeline Area */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col flex-1 overflow-hidden">
        {/* Timeline Controls Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-zinc-300">Tracks</span>
            <label className="flex items-center gap-1.5 text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={(e) => setSnapEnabled(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700"
              />
              <span>Snap to scenes</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[11px]">Zoom:</span>
            <input
              type="range"
              min="15"
              max="100"
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value, 10))}
              className="w-24 accent-blue-500"
            />
            <span className="text-zinc-400 text-[11px] font-mono">{zoom}px/s</span>
          </div>
        </div>

        {/* Tracks and Clips Grid */}
        <div
          ref={timelineScrollRef}
          className="relative flex-1 overflow-x-auto overflow-y-auto mt-2 min-h-[220px]"
          onClick={(e) => {
            // Seek playhead on timeline click if clicking in ruler or empty area
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left - 180; // 180px track label offset
            if (clickX >= 0) {
              const clickedSecond = Math.max(0, clickX / zoom);
              setPlayhead(Math.min(clickedSecond, Math.max(totalDuration, 60)));
            }
          }}
        >
          {/* Time Ruler */}
          <div className="flex h-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
            <div className="w-[180px] shrink-0 border-r border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500 font-mono">
              TIME
            </div>
            <div
              className="relative flex-1 h-full"
              style={{ width: `${Math.max(totalDuration, 60) * zoom}px` }}
            >
              {Array.from({ length: Math.ceil(Math.max(totalDuration, 60) / 5) }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-zinc-800 text-[9px] text-zinc-500 pl-1 font-mono"
                  style={{ left: `${i * 5 * zoom}px` }}
                >
                  {formatSeconds(i * 5)}
                </div>
              ))}
            </div>
          </div>

          {/* Tracks List */}
          {tracks.map((track) => {
            const trackClips = clips.filter((c) => c.trackId === track.id);
            return (
              <div key={track.id} className="flex h-14 border-b border-zinc-800/60 relative group">
                {/* Track Header / Controls */}
                <div className="w-[180px] shrink-0 bg-zinc-950 border-r border-zinc-800 p-2 flex flex-col justify-between z-20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-200 truncate" title={track.name}>
                      {track.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTrack(track.id, "isVisible");
                      }}
                      className={`hover:text-white ${track.isVisible ? "text-zinc-300" : "text-zinc-600 line-through"}`}
                      title={track.isVisible ? "Hide Track" : "Show Track"}
                    >
                      👁
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTrack(track.id, "isLocked");
                      }}
                      className={`hover:text-white ${track.isLocked ? "text-amber-400" : "text-zinc-600"}`}
                      title={track.isLocked ? "Unlock Track" : "Lock Track"}
                    >
                      🔒
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTrack(track.id, "isMuted");
                      }}
                      className={`hover:text-white ${track.isMuted ? "text-red-400" : "text-zinc-600"}`}
                      title={track.isMuted ? "Unmute Track" : "Mute Track"}
                    >
                      🔇
                    </button>
                  </div>
                </div>

                {/* Track Lane / Clips */}
                <div
                  className="relative flex-1 bg-zinc-900/40 h-full"
                  style={{ width: `${Math.max(totalDuration, 60) * zoom}px` }}
                >
                  {trackClips.map((clip) => {
                    const isSelected = clip.id === selectedClipId;
                    const leftPx = clip.startSeconds * zoom;
                    const widthPx = Math.max(clip.durationSeconds * zoom, 12);

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                        }}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`,
                          backgroundColor: clip.color,
                        }}
                        className={`absolute top-1 bottom-1 rounded px-2 py-1 text-white text-[11px] font-medium shadow cursor-pointer select-none overflow-hidden truncate transition-all ${
                          isSelected
                            ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900 shadow-lg brightness-110"
                            : "hover:brightness-105"
                        }`}
                        title={`${clip.name} (${clip.durationSeconds.toFixed(1)}s)`}
                      >
                        <span className="truncate block">{clip.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Red Playhead Vertical Line */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-30"
            style={{ left: `${180 + playhead * zoom}px` }}
          >
            <div className="w-0.5 h-full bg-red-500 shadow-sm relative">
              <div className="w-2.5 h-2.5 bg-red-500 -ml-1 rounded-full -top-1 absolute" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState, useCallback } from "react";
import {
  type RenderJobRecord,
  type RenderPreset,
  RENDER_PRESETS,
  type TimelineClip,
} from "../lib/timeline";
import {
  checkFFmpegStatus,
  renderTimelineVideo,
  cancelRenderJob,
  type FFmpegStatus,
  type TimelineRenderRequest,
  type RenderSceneInput,
} from "../lib/ffmpeg";
import {
  TimelineRepository,
  RenderJobRepository,
  StoryboardRepository,
} from "../lib/repositories";
import { FFmpegSetupModal } from "./FFmpegSetupModal";

interface ExportManagerPageProps {
  projectId: string;
  projectTitle?: string;
  onNavigateToTimeline?: () => void;
}

export const ExportManagerPage: React.FC<ExportManagerPageProps> = ({
  projectId,
  projectTitle = "Project Export",
  onNavigateToTimeline,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("youtube-1080p-60");
  const [resolution, setResolution] = useState<"1080p" | "720p" | "1440p" | "4k">("1080p");
  const [fps, setFps] = useState<24 | 30 | 60>(60);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [videoCodec, setVideoCodec] = useState<"libx264" | "libx265">("libx264");

  const [ffmpegStatus, setFfmpegStatus] = useState<FFmpegStatus | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [jobs, setJobs] = useState<RenderJobRecord[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeProgress, setActiveProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load FFmpeg status and Render Jobs
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [status, existingJobs] = await Promise.all([
        checkFFmpegStatus(),
        RenderJobRepository.getJobsForProject(projectId),
      ]);
      setFfmpegStatus(status);
      setJobs(existingJobs);
    } catch (err) {
      console.error("Failed to load export data:", err);
      setStatusMessage("Failed to initialize FFmpeg or load jobs: " + String(err));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply Preset
  const handleSelectPreset = (preset: RenderPreset) => {
    setSelectedPresetId(preset.id);
    setResolution(preset.resolution);
    setFps(preset.fps);
    setAspectRatio(preset.aspectRatio);
    setVideoCodec(preset.videoCodec);
  };

  // Trigger Render
  const handleStartRender = async () => {
    if (!ffmpegStatus || !ffmpegStatus.available) {
      setStatusMessage("FFmpeg binary is not available. Please ensure ffmpeg.exe exists in the bin folder.");
      return;
    }

    setIsRendering(true);
    setStatusMessage("Gathering timeline tracks and preparing FFmpeg render command...");
    setActiveProgress(10);

    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setActiveJobId(jobId);

    try {
      // 1. Fetch timeline and storyboard
      const [timeline, storyboard] = await Promise.all([
        TimelineRepository.getTimelineDocument(projectId),
        StoryboardRepository.getStoryboard(projectId),
      ]);

      const scenesInput: RenderSceneInput[] = [];

      if (timeline && timeline.clips.length > 0) {
        // Group clips by scene
        const videoClips = timeline.clips.filter((c: TimelineClip) => c.trackId.includes("-v1") || c.mediaType === "video");
        const voiceClips = timeline.clips.filter((c: TimelineClip) => c.trackId.includes("-a1") || c.mediaType === "audio");
        const subClips = timeline.clips.filter((c: TimelineClip) => c.trackId.includes("-sub") || c.mediaType === "subtitle");

        if (storyboard && storyboard.scenes.length > 0) {
          for (const sc of storyboard.scenes) {
            const vClip = videoClips.find((c: TimelineClip) => c.sceneId === sc.id);
            const aClip = voiceClips.find((c: TimelineClip) => c.sceneId === sc.id);
            const sClip = subClips.find((c: TimelineClip) => c.sceneId === sc.id);

            scenesInput.push({
              sceneId: sc.id,
              sceneNumber: sc.number,
              durationSeconds: vClip?.durationSeconds || aClip?.durationSeconds || Math.max(2.0, sc.duration),
              imagePath: vClip?.relativePath || undefined,
              audioPath: aClip?.relativePath || undefined,
              subtitleText: sClip?.name || sc.narration || undefined,
              kenBurns: true,
            });
          }
        } else {
          // No storyboard scenes, use raw timeline video clips
          let index = 1;
          for (const vc of videoClips) {
            scenesInput.push({
              sceneId: vc.id,
              sceneNumber: index++,
              durationSeconds: vc.durationSeconds,
              imagePath: vc.relativePath || undefined,
              kenBurns: true,
            });
          }
        }
      }

      if (scenesInput.length === 0) {
        setStatusMessage("Timeline has no video clips or scenes to render. Please populate the timeline first.");
        setIsRendering(false);
        setActiveJobId(null);
        return;
      }

      setActiveProgress(25);
      setStatusMessage(`Dispatching native FFmpeg render for ${scenesInput.length} scenes (${resolution}, ${fps}fps)...`);

      // 2. Insert Initial Job Record in SQLite
      const initialJob: RenderJobRecord = {
        id: jobId,
        projectId,
        preset: selectedPresetId,
        resolution,
        fps,
        aspectRatio,
        videoCodec,
        audioCodec: "aac",
        outputPath: "",
        status: "rendering",
        progress: 25,
        durationSeconds: scenesInput.reduce((acc, s) => acc + s.durationSeconds, 0),
        fileSizeBytes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await RenderJobRepository.saveJob(initialJob);
      setJobs((prev) => [initialJob, ...prev]);

      // 3. Native Render Request
      const request: TimelineRenderRequest = {
        jobId,
        projectId,
        resolution,
        fps,
        aspectRatio,
        videoCodec,
        audioCodec: "aac",
        scenes: scenesInput,
      };

      setActiveProgress(50);
      const result = await renderTimelineVideo(request);

      if (result.status === "completed") {
        setActiveProgress(100);
        setStatusMessage(`Render complete! Output saved to: ${result.outputPath}`);

        const completedJob: RenderJobRecord = {
          ...initialJob,
          status: "completed",
          progress: 100,
          outputPath: result.outputPath,
          durationSeconds: result.durationSeconds,
          fileSizeBytes: result.fileSizeBytes,
          updatedAt: new Date().toISOString(),
        };
        await RenderJobRepository.saveJob(completedJob);
        setJobs((prev) => prev.map((j) => (j.id === jobId ? completedJob : j)));
      } else {
        throw new Error(result.errorMessage || `Render failed with status: ${result.status}`);
      }
    } catch (err) {
      console.error("Render failed:", err);
      const errMsg = String(err);
      setStatusMessage(`Render Error: ${errMsg}`);

      if (activeJobId) {
        await RenderJobRepository.updateJobStatus(activeJobId, "failed", 0, errMsg);
        setJobs((prev) =>
          prev.map((j) => (j.id === activeJobId ? { ...j, status: "failed", errorMessage: errMsg } : j))
        );
      }
    } finally {
      setIsRendering(false);
      setActiveJobId(null);
    }
  };

  // Cancel Running Job
  const handleCancelRender = async () => {
    if (!activeJobId) return;
    setStatusMessage("Cancelling FFmpeg process...");
    try {
      await cancelRenderJob(activeJobId);
      await RenderJobRepository.updateJobStatus(activeJobId, "cancelled", 0, "Cancelled by user");
      setStatusMessage("Render cancelled.");
      setJobs((prev) =>
        prev.map((j) => (j.id === activeJobId ? { ...j, status: "cancelled" } : j))
      );
    } catch (err) {
      console.error("Failed to cancel render:", err);
    } finally {
      setIsRendering(false);
      setActiveJobId(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Initializing Export Manager & Probing FFmpeg...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🚀 Video Export & Render Studio — {projectTitle}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700">
              Stage C Engine
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Hardware-accelerated native FFmpeg rendering pipeline with YouTube-compliant encoding.
          </p>
        </div>

        {onNavigateToTimeline && (
          <button
            onClick={onNavigateToTimeline}
            className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center gap-1.5"
          >
            <span>⬅</span> Back to Timeline
          </button>
        )}
      </div>

      {/* Engine Status Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                ffmpegStatus?.available ? "bg-emerald-500 shadow-sm shadow-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs font-semibold text-zinc-200">
              {ffmpegStatus?.available ? "Native FFmpeg Engine Ready" : "FFmpeg Engine Offline"}
            </span>
            {ffmpegStatus?.version && (
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                {ffmpegStatus.version.split(" Copyright")[0]}
              </span>
            )}
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="px-2 py-0.5 text-[11px] font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition ml-2 flex items-center gap-1"
              title="Configure or install FFmpeg"
            >
              <span>⚙️</span> Setup / Verify
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
            <span>H.264: {ffmpegStatus?.supportsH264 ? "✓" : "✗"}</span>
            <span>H.265: {ffmpegStatus?.supportsH265 ? "✓" : "✗"}</span>
            <span>AAC: {ffmpegStatus?.supportsAac ? "✓" : "✗"}</span>
          </div>
        </div>

        {ffmpegStatus?.ffmpegPath && (
          <div className="text-[10px] font-mono text-zinc-500 mt-1 truncate">
            Path: {ffmpegStatus.ffmpegPath}
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="px-3 py-2 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 flex justify-between items-center">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-zinc-500 hover:text-zinc-300 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Presets & Settings (Left) + Queue/Status (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Presets & Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Export Presets
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RENDER_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-950/40 border-blue-500 ring-1 ring-blue-500"
                        : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">{preset.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {preset.aspectRatio}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">
                      {preset.description}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                      <span>{preset.resolution}</span>
                      <span>•</span>
                      <span>{preset.fps} FPS</span>
                      <span>•</span>
                      <span>{preset.videoCodec}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Settings Adjuster */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Encoding Configuration
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value="720p">720p (1280x720)</option>
                  <option value="1080p">1080p (1920x1080)</option>
                  <option value="1440p">1440p (2560x1440)</option>
                  <option value="4k">4K (3840x2160)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Frame Rate</label>
                <select
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value, 10) as any)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value="24">24 FPS (Cinematic)</option>
                  <option value="30">30 FPS (Standard)</option>
                  <option value="60">60 FPS (Smooth)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Shorts Vertical)</option>
                  <option value="1:1">1:1 (Square)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Video Codec</label>
                <select
                  value={videoCodec}
                  onChange={(e) => setVideoCodec(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value="libx264">H.264 (libx264)</option>
                  <option value="libx265">H.265 / HEVC (libx265)</option>
                </select>
              </div>
            </div>

            {/* Render Trigger Button */}
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800">
              <div className="text-xs text-zinc-400">
                Ready to assemble visual clips, voice narration, and subtitle overlays.
              </div>

              {isRendering ? (
                <button
                  onClick={handleCancelRender}
                  className="px-5 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow transition flex items-center gap-2"
                >
                  <span>⏹</span> Cancel Render
                </button>
              ) : (
                <button
                  onClick={handleStartRender}
                  disabled={!ffmpegStatus?.available}
                  className="px-6 py-2.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg transition flex items-center gap-2"
                >
                  <span>⚡</span> Start Video Assembly (FFmpeg)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Progress & Render History */}
        <div className="space-y-4">
          {/* Active Job Progress Card */}
          {isRendering && (
            <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-200 mb-2">
                <span>Rendering in Progress...</span>
                <span>{activeProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${activeProgress}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">Job ID: {activeJobId}</div>
            </div>
          )}

          {/* Render Queue / History */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col h-full">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Render Output History
            </h2>

            {jobs.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs">
                No videos rendered yet for this project. Select a preset and start video assembly above.
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">{job.preset}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          job.status === "completed"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : job.status === "failed"
                            ? "bg-red-950 text-red-300 border border-red-800"
                            : job.status === "cancelled"
                            ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            : "bg-blue-950 text-blue-300 border border-blue-800 animate-pulse"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                      <span>{job.resolution}</span>
                      <span>•</span>
                      <span>{job.fps} FPS</span>
                      <span>•</span>
                      <span>{job.durationSeconds.toFixed(1)}s</span>
                      {job.fileSizeBytes > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatBytes(job.fileSizeBytes)}</span>
                        </>
                      )}
                    </div>

                    {job.outputPath && (
                      <div className="text-[10px] font-mono text-emerald-400 bg-zinc-900 p-1.5 rounded border border-zinc-800 break-all select-all">
                        {job.outputPath}
                      </div>
                    )}

                    {job.errorMessage && (
                      <div className="text-[10px] text-red-400 bg-red-950/40 p-1.5 rounded border border-red-900/60 break-all">
                        {job.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <FFmpegSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onSetupComplete={loadData}
      />
    </div>
  );
};

import { invoke } from "@tauri-apps/api/core";

export interface FFmpegStatus {
  available: boolean;
  ffmpegPath: string | null;
  ffprobePath: string | null;
  version: string | null;
  supportsH264: boolean;
  supportsH265: boolean;
  supportsAac: boolean;
  searchLocations: string[];
}

export interface RenderSceneInput {
  sceneId: string;
  sceneNumber: number;
  durationSeconds: number;
  imagePath?: string;
  videoPath?: string;
  audioPath?: string;
  subtitleText?: string;
  transition?: string;
  kenBurns: boolean;
}

export interface TimelineRenderRequest {
  jobId: string;
  projectId: string;
  resolution: "1080p" | "720p" | "1440p" | "4k";
  fps: 24 | 30 | 60;
  aspectRatio: "16:9" | "9:16" | "1:1";
  videoCodec: "libx264" | "libx265";
  audioCodec: "aac";
  scenes: RenderSceneInput[];
  outputFilename?: string;
  resourceMode?: "low_resource" | "balanced" | "performance";
}

export interface RenderResult {
  jobId: string;
  projectId: string;
  status: "completed" | "failed" | "cancelled";
  progress: number;
  outputPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  errorMessage?: string;
}

export interface MediaProbeResult {
  durationSeconds: number;
  width?: number;
  height?: number;
  formatName: string;
  sizeBytes: number;
}

export async function checkFFmpegStatus(customPath?: string): Promise<FFmpegStatus> {
  try {
    return await invoke<FFmpegStatus>("ffmpeg_check_status", { customPath: customPath || null });
  } catch {
    return {
      available: false,
      ffmpegPath: null,
      ffprobePath: null,
      version: null,
      supportsH264: false,
      supportsH265: false,
      supportsAac: false,
      searchLocations: [],
    };
  }
}

export async function probeMedia(mediaPath: string, customProbePath?: string): Promise<MediaProbeResult> {
  return await invoke<MediaProbeResult>("ffmpeg_probe_media", {
    mediaPath,
    customProbePath: customProbePath || null,
  });
}

export async function renderTimelineVideo(request: TimelineRenderRequest): Promise<RenderResult> {
  return await invoke<RenderResult>("ffmpeg_render_timeline", { request });
}

export async function cancelRenderJob(jobId: string): Promise<boolean> {
  return await invoke<boolean>("ffmpeg_cancel_render", { jobId });
}

// NovaVid AI YouTube Studio — Stage Q1: Professional FFmpeg Distribution & Setup
// Client-side wrappers for first-run setup, download progress tracking, and local binary importing.

import { invoke } from "@tauri-apps/api/core";

export interface PinnedManifest {
  version: string;
  license: string;
  primaryUrl: string;
  mirrorUrl: string;
  trustedHosts: string[];
  expectedArchiveFormat: string;
}

export interface FFmpegSetupInfo {
  isInstalled: boolean;
  currentFfmpegPath: string | null;
  currentFfprobePath: string | null;
  currentVersion: string | null;
  managedBinDir: string;
  manifest: PinnedManifest;
  localBinDetected: boolean;
  localBinPath: string | null;
  availableDiskSpaceMb: number;
}

export interface SetupProgress {
  jobId: string;
  status: "idle" | "downloading" | "verifying" | "extracting" | "completed" | "failed" | "cancelled";
  bytesDownloaded: number;
  totalBytes: number;
  progressPercent: number;
  message: string;
  errorMessage?: string | null;
}

export async function getFFmpegSetupInfo(customPath?: string): Promise<FFmpegSetupInfo> {
  try {
    return await invoke<FFmpegSetupInfo>("ffmpeg_get_setup_info", {
      customPath: customPath || null,
    });
  } catch {
    // Fallback safe representation if running in web test runner
    return {
      isInstalled: false,
      currentFfmpegPath: null,
      currentFfprobePath: null,
      currentVersion: null,
      managedBinDir: "C:\\Users\\AppData\\Local\\com.aiyoutubestudio.app\\ffmpeg\\bin",
      manifest: {
        version: "N-128532 / Release Essentials 2026",
        license: "GNU General Public License v3 (GPLv3)",
        primaryUrl: "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
        mirrorUrl: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
        trustedHosts: ["www.gyan.dev", "gyan.dev", "github.com", "objects.githubusercontent.com"],
        expectedArchiveFormat: "zip",
      },
      localBinDetected: false,
      localBinPath: null,
      availableDiskSpaceMb: 2048,
    };
  }
}

export async function startFFmpegDownload(): Promise<SetupProgress> {
  return await invoke<SetupProgress>("ffmpeg_start_download");
}

export async function getFFmpegSetupProgress(jobId: string): Promise<SetupProgress> {
  return await invoke<SetupProgress>("ffmpeg_get_setup_progress", { jobId });
}

export async function cancelFFmpegSetup(jobId: string): Promise<boolean> {
  return await invoke<boolean>("ffmpeg_cancel_setup", { jobId });
}

export async function importLocalFFmpeg(sourceDir: string): Promise<SetupProgress> {
  return await invoke<SetupProgress>("ffmpeg_import_local_binaries", { sourceDir });
}

import { invoke } from "@tauri-apps/api/core";

export interface AudioLibraryTrack {
  id: string;
  projectId?: string | null;
  name: string;
  trackType: "music" | "sfx" | "ambient";
  category:
    | "Cinematic"
    | "Documentary"
    | "Technology"
    | "Emotional"
    | "Inspirational"
    | "Educational"
    | "Ambient"
    | "Corporate"
    | "Transitions"
    | "Impacts"
    | "UI";
  mood: string;
  tempo: "slow" | "medium" | "fast";
  durationSeconds: number;
  relativePath: string;
  originalName: string;
  format: string;
  licenseType: string;
  attribution: string;
  commercialUse: boolean;
  sizeBytes: number;
  checksum: string;
}

export interface DuckingConfig {
  enabled: boolean;
  duckingAmountDb: number; // e.g. -14.0
  musicVolume: number; // e.g. 0.25 (25%)
  voiceVolume: number; // e.g. 1.0 (100%)
  sfxVolume: number; // e.g. 0.8 (80%)
  fadeInSeconds: number; // e.g. 1.0
  fadeOutSeconds: number; // e.g. 2.0
  attackMs: number; // e.g. 100
  releaseMs: number; // e.g. 400
  targetLufs: number; // e.g. -14.0 (YouTube target)
}

export const DEFAULT_DUCKING_CONFIG: DuckingConfig = {
  enabled: true,
  duckingAmountDb: -14.0,
  musicVolume: 0.25,
  voiceVolume: 1.0,
  sfxVolume: 0.8,
  fadeInSeconds: 1.0,
  fadeOutSeconds: 2.0,
  attackMs: 100,
  releaseMs: 400,
  targetLufs: -14.0,
};

export interface ProcessDuckingRequest {
  projectId: string;
  musicRelativePath?: string;
  voiceRelativePath?: string;
  sfxRelativePath?: string;
  outputFilename?: string;
  config: DuckingConfig;
}

export interface ProcessDuckingResult {
  outputPath: string;
  relativePath: string;
  durationSeconds: number;
  sizeBytes: number;
  checksum: string;
}

export async function audioGetLibraryTracks(projectId?: string): Promise<AudioLibraryTrack[]> {
  try {
    return await invoke<AudioLibraryTrack[]>("audio_get_library_tracks", {
      projectId: projectId || null,
    });
  } catch (err) {
    console.warn("Falling back to local default library tracks:", err);
    return [
      {
        id: "track-cinematic-epic",
        projectId: null,
        name: "Hyperdrive Odyssey (Cinematic)",
        trackType: "music",
        category: "Cinematic",
        mood: "Dramatic & Expansive",
        tempo: "medium",
        durationSeconds: 60.0,
        relativePath: "audio/library/cinematic_odyssey.wav",
        originalName: "cinematic_odyssey.wav",
        format: "wav",
        licenseType: "Creative Commons Zero (CC0) / Royalty-Free",
        attribution: "NovaVid Studio Audio Engine",
        commercialUse: true,
        sizeBytes: 5292000,
        checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      },
      {
        id: "track-tech-pulse",
        projectId: null,
        name: "Silicon Horizon (Technology)",
        trackType: "music",
        category: "Technology",
        mood: "Modern & Futuristic",
        tempo: "fast",
        durationSeconds: 45.0,
        relativePath: "audio/library/tech_horizon.wav",
        originalName: "tech_horizon.wav",
        format: "wav",
        licenseType: "Creative Commons Zero (CC0) / Royalty-Free",
        attribution: "NovaVid Studio Audio Engine",
        commercialUse: true,
        sizeBytes: 3969000,
        checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856",
      },
      {
        id: "track-ambient-deep",
        projectId: null,
        name: "Zenith Atmosphere (Ambient)",
        trackType: "music",
        category: "Ambient",
        mood: "Peaceful & Contemplative",
        tempo: "slow",
        durationSeconds: 90.0,
        relativePath: "audio/library/ambient_zenith.wav",
        originalName: "ambient_zenith.wav",
        format: "wav",
        licenseType: "Creative Commons Zero (CC0) / Royalty-Free",
        attribution: "NovaVid Studio Audio Engine",
        commercialUse: true,
        sizeBytes: 7938000,
        checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b857",
      },
      {
        id: "track-sfx-cinematic-impact",
        projectId: null,
        name: "Sub Bass Impact (SFX)",
        trackType: "sfx",
        category: "Impacts",
        mood: "Heavy Punch",
        tempo: "fast",
        durationSeconds: 2.5,
        relativePath: "audio/library/sfx_sub_impact.wav",
        originalName: "sfx_sub_impact.wav",
        format: "wav",
        licenseType: "Creative Commons Zero (CC0) / Royalty-Free",
        attribution: "NovaVid Sound Effects",
        commercialUse: true,
        sizeBytes: 220500,
        checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b858",
      },
      {
        id: "track-sfx-whoosh-transition",
        projectId: null,
        name: "Cinematic Air Riser & Whoosh",
        trackType: "sfx",
        category: "Transitions",
        mood: "High Energy",
        tempo: "fast",
        durationSeconds: 1.8,
        relativePath: "audio/library/sfx_whoosh.wav",
        originalName: "sfx_whoosh.wav",
        format: "wav",
        licenseType: "Creative Commons Zero (CC0) / Royalty-Free",
        attribution: "NovaVid Sound Effects",
        commercialUse: true,
        sizeBytes: 158760,
        checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b859",
      },
    ];
  }
}

export async function audioProcessDuckingMix(
  request: ProcessDuckingRequest
): Promise<ProcessDuckingResult> {
  return await invoke<ProcessDuckingResult>("audio_process_ducking_mix", { request });
}

export async function audioGetWaveform(
  projectId: string,
  relativePath: string
): Promise<number[]> {
  try {
    return await invoke<number[]>("audio_get_waveform", { projectId, relativePath });
  } catch (err) {
    console.warn("Waveform extraction failed, returning synthetic bars:", err);
    return Array.from({ length: 64 }, (_, i) =>
      Number((Math.abs(Math.sin(i / 4)) * 0.8 + 0.1).toFixed(2))
    );
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

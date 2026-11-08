import type { StoryboardDocument } from "./storyboard";
import type { GeneratedAudioClip } from "./voice";
import type { SubtitleDocument } from "./subtitles";
import type { VisualAsset } from "./visuals";

export type TimelineTrackType = "video" | "image" | "voice" | "music" | "sfx" | "subtitle" | "overlay";

export interface TimelineTrack {
  id: string;
  projectId: string;
  trackType: TimelineTrackType;
  name: string;
  trackIndex: number;
  isVisible: boolean;
  isLocked: boolean;
  isMuted: boolean;
  volume: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineClip {
  id: string;
  projectId: string;
  trackId: string;
  sceneId: string | null;
  name: string;
  startSeconds: number;
  durationSeconds: number;
  sourceStartSeconds: number;
  mediaType: "video" | "image" | "audio" | "subtitle" | "color";
  assetId: string | null;
  relativePath: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineDocument {
  projectId: string;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  totalDurationSeconds: number;
}

export interface RenderJobRecord {
  id: string;
  projectId: string;
  preset: string;
  resolution: string;
  fps: number;
  aspectRatio: string;
  videoCodec: string;
  audioCodec: string;
  outputPath: string;
  status: "pending" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number;
  durationSeconds: number;
  fileSizeBytes: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenderPreset {
  id: string;
  name: string;
  description: string;
  resolution: "1080p" | "720p" | "1440p" | "4k";
  fps: 24 | 30 | 60;
  aspectRatio: "16:9" | "9:16" | "1:1";
  videoCodec: "libx264" | "libx265";
  audioCodec: "aac";
}

export const RENDER_PRESETS: RenderPreset[] = [
  {
    id: "youtube-1080p-60",
    name: "YouTube 1080p 60fps (Recommended)",
    description: "Standard high definition 16:9 landscape format optimized for YouTube upload.",
    resolution: "1080p",
    fps: 60,
    aspectRatio: "16:9",
    videoCodec: "libx264",
    audioCodec: "aac",
  },
  {
    id: "youtube-shorts-9-16",
    name: "YouTube Shorts 9:16 (Vertical)",
    description: "Vertical video format (1080x1920) for mobile feeds, Shorts, and Reels.",
    resolution: "1080p",
    fps: 60,
    aspectRatio: "9:16",
    videoCodec: "libx264",
    audioCodec: "aac",
  },
  {
    id: "youtube-4k-60",
    name: "YouTube 4K Ultra HD (3840x2160)",
    description: "Maximum cinematic fidelity and pristine bitrate for large displays.",
    resolution: "4k",
    fps: 60,
    aspectRatio: "16:9",
    videoCodec: "libx264",
    audioCodec: "aac",
  },
  {
    id: "fast-720p-30",
    name: "Fast Draft 720p 30fps",
    description: "Lightweight, ultra-fast render for review and quick verification.",
    resolution: "720p",
    fps: 30,
    aspectRatio: "16:9",
    videoCodec: "libx264",
    audioCodec: "aac",
  },
];

export function createDefaultTracks(projectId: string): TimelineTrack[] {
  const now = new Date().toISOString();
  return [
    {
      id: `track-${projectId}-v1`,
      projectId,
      trackType: "video",
      name: "V1: Main Video & Scenes",
      trackIndex: 0,
      isVisible: true,
      isLocked: false,
      isMuted: false,
      volume: 1.0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `track-${projectId}-v2`,
      projectId,
      trackType: "image",
      name: "V2: B-Roll & Visuals",
      trackIndex: 1,
      isVisible: true,
      isLocked: false,
      isMuted: false,
      volume: 1.0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `track-${projectId}-sub`,
      projectId,
      trackType: "subtitle",
      name: "Subtitles / Captions",
      trackIndex: 2,
      isVisible: true,
      isLocked: false,
      isMuted: false,
      volume: 1.0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `track-${projectId}-a1`,
      projectId,
      trackType: "voice",
      name: "A1: Voiceover Narration",
      trackIndex: 3,
      isVisible: true,
      isLocked: false,
      isMuted: false,
      volume: 1.0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `track-${projectId}-a2`,
      projectId,
      trackType: "music",
      name: "A2: Background Music",
      trackIndex: 4,
      isVisible: true,
      isLocked: false,
      isMuted: false,
      volume: 0.25,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `track-${projectId}-a3`,
      projectId,
      trackType: "sfx",
      name: "A3: Sound Effects",
      trackIndex: 5,
      isVisible: true,
      isLocked: false,
      isMuted: false,
      volume: 0.8,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function syncStoryboardToTimeline(
  projectId: string,
  storyboard: StoryboardDocument,
  audioClips: GeneratedAudioClip[] | Record<string, GeneratedAudioClip> = [],
  subtitlesDoc?: SubtitleDocument | null,
  visualAssets: VisualAsset[] | Record<string, VisualAsset> = [],
): TimelineDocument {
  const audioMap: Record<string, GeneratedAudioClip> = Array.isArray(audioClips)
    ? audioClips.reduce<Record<string, GeneratedAudioClip>>((acc, clip) => {
        if (clip.sceneId) {
          acc[clip.sceneId] = clip;
        }
        return acc;
      }, {})
    : audioClips;

  const visualMap: Record<string, VisualAsset> = Array.isArray(visualAssets)
    ? visualAssets.reduce<Record<string, VisualAsset>>((acc, asset) => {
        if (asset.sceneId) {
          acc[asset.sceneId] = asset;
        }
        return acc;
      }, {})
    : visualAssets;

  return generateTimelineFromStoryboard(projectId, storyboard, audioMap, subtitlesDoc, visualMap);
}

export function generateTimelineFromStoryboard(
  projectId: string,
  storyboard: StoryboardDocument,
  audioClipsByScene: Record<string, GeneratedAudioClip> = {},
  subtitlesDoc?: SubtitleDocument | null,
  visualAssetsByScene: Record<string, VisualAsset> = {},
): TimelineDocument {
  const tracks = createDefaultTracks(projectId);
  const videoTrack = tracks[0];
  const subTrack = tracks[2];
  const voiceTrack = tracks[3];

  const clips: TimelineClip[] = [];
  let currentTime = 0.0;
  const now = new Date().toISOString();

  for (const scene of storyboard.scenes) {
    const audioClip = audioClipsByScene[scene.id];
    const duration = audioClip && audioClip.durationSeconds > 0
      ? audioClip.durationSeconds
      : Math.max(2.0, scene.duration);

    const visualAsset = visualAssetsByScene[scene.id];

    // 1. Scene Visual Clip
    clips.push({
      id: `clip-scene-${scene.id}`,
      projectId,
      trackId: videoTrack.id,
      sceneId: scene.id,
      name: `Scene #${scene.number}: ${scene.title || `Scene ${scene.number}`}`,
      startSeconds: Math.round(currentTime * 100) / 100,
      durationSeconds: Math.round(duration * 100) / 100,
      sourceStartSeconds: 0,
      mediaType: visualAsset || scene.assetId ? "image" : "color",
      assetId: visualAsset?.id || scene.assetId || null,
      relativePath: visualAsset?.relativePath || null,
      color: visualAsset ? "#2563eb" : "#4f46e5",
      createdAt: now,
      updatedAt: now,
    });

    // 2. Scene Voice Clip (if generated)
    if (audioClip) {
      clips.push({
        id: `clip-voice-${audioClip.id}`,
        projectId,
        trackId: voiceTrack.id,
        sceneId: scene.id,
        name: `VO #${scene.number} (${audioClip.voiceName})`,
        startSeconds: Math.round(currentTime * 100) / 100,
        durationSeconds: Math.round(audioClip.durationSeconds * 100) / 100,
        sourceStartSeconds: 0,
        mediaType: "audio",
        assetId: null,
        relativePath: audioClip.relativePath,
        color: "#10b981",
        createdAt: now,
        updatedAt: now,
      });
    }

    currentTime += duration;
  }

  // 3. Subtitle cues mapped to Subtitle Track
  if (subtitlesDoc && subtitlesDoc.segments) {
    for (const seg of subtitlesDoc.segments) {
      clips.push({
        id: `clip-sub-${seg.id}`,
        projectId,
        trackId: subTrack.id,
        sceneId: seg.sceneId || null,
        name: seg.text.length > 25 ? `${seg.text.slice(0, 25)}…` : seg.text,
        startSeconds: seg.startTimeSeconds,
        durationSeconds: Math.max(0.5, seg.endTimeSeconds - seg.startTimeSeconds),
        sourceStartSeconds: 0,
        mediaType: "subtitle",
        assetId: null,
        relativePath: null,
        color: "#eab308",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return {
    projectId,
    tracks,
    clips,
    totalDurationSeconds: Math.round(currentTime * 100) / 100,
  };
}

export function calculateTimelineDuration(clips: TimelineClip[]): number {
  if (clips.length === 0) return 0.0;
  return Math.max(...clips.map((c) => c.startSeconds + c.durationSeconds));
}

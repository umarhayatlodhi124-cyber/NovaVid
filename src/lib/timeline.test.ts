import { describe, expect, it } from "vitest";
import {
  createDefaultTracks,
  syncStoryboardToTimeline,
  calculateTimelineDuration,
  RENDER_PRESETS,
  type TimelineClip,
} from "./timeline";
import type { StoryboardDocument } from "./storyboard";
import type { GeneratedAudioClip } from "./voice";
import { type SubtitleDocument, DEFAULT_SUBTITLE_STYLE } from "./subtitles";

describe("Timeline Management & Storyboard Sync", () => {
  const projectId = "proj-test-123";

  it("creates the 6 standard multitrack layers", () => {
    const tracks = createDefaultTracks(projectId);
    expect(tracks.length).toBe(6);

    const types = tracks.map((t) => t.trackType);
    expect(types).toContain("video");
    expect(types).toContain("image");
    expect(types).toContain("subtitle");
    expect(types).toContain("voice");
    expect(types).toContain("music");
    expect(types).toContain("sfx");

    expect(tracks[0].trackIndex).toBe(0);
    expect(tracks[0].isVisible).toBe(true);
    expect(tracks[0].isLocked).toBe(false);
  });

  it("synchronizes storyboard scenes, audio clips, and subtitles into aligned timeline clips", () => {
    const storyboard: StoryboardDocument = {
      id: "sb-1",
      title: "Test Production",
      format: "Long-form",
      scenes: [
        {
          id: "scene-1",
          number: 1,
          title: "Intro",
          narration: "Welcome to this episode.",
          visualDescription: "Futuristic city skyline",
          visualPrompt: "Futuristic city skyline at dusk",
          cameraMotion: "pan-right",
          transition: "fade",
          audioSuggestion: "ambient synth",
          assetId: "asset-1",
          duration: 4.5,
          status: "pending",
        },
        {
          id: "scene-2",
          number: 2,
          title: "Main Concept",
          narration: "Here is the core breakthrough.",
          visualDescription: "Diagram of AI pipeline",
          visualPrompt: "Modern diagram of AI architecture",
          cameraMotion: "zoom-in",
          transition: "crossfade",
          audioSuggestion: "electronic pulse",
          assetId: null,
          duration: 6.0,
          status: "pending",
        },
      ],
      versions: [],
      currentVersionId: "v1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      styleProfileId: null,
    };

    const audioClips: GeneratedAudioClip[] = [
      {
        id: "clip-1",
        projectId,
        sceneId: "scene-1",
        originalName: "voice_1_abc.wav",
        relativePath: "audio/voice_1_abc.wav",
        absolutePath: "C:/app_data/projects/p1/audio/voice_1_abc.wav",
        voiceName: "en-US-Puck",
        provider: "gemini",
        durationSeconds: 4.2,
        sizeBytes: 201600,
        checksum: "abc1234",
        status: "draft",
        waveform: [0.1, 0.5, 0.8],
        createdAt: new Date().toISOString(),
      },
    ];

    const subtitleDoc: SubtitleDocument = {
      id: "sub-doc-1",
      projectId,
      title: "Test Subtitles",
      language: "English",
      styleProfile: DEFAULT_SUBTITLE_STYLE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      segments: [
        {
          id: "sub-1",
          sceneId: "scene-1",
          sceneNumber: 1,
          startTimeSeconds: 0.0,
          endTimeSeconds: 4.2,
          startTimeFormatted: "00:00:00,000",
          endTimeFormatted: "00:00:04,200",
          text: "Welcome to this episode.",
        },
      ],
    };

    const timelineDoc = syncStoryboardToTimeline(projectId, storyboard, audioClips, subtitleDoc);

    expect(timelineDoc.projectId).toBe(projectId);
    expect(timelineDoc.tracks.length).toBe(6);
    expect(timelineDoc.clips.length).toBeGreaterThan(0);

    // Check video clips
    const v1Track = timelineDoc.tracks.find((t) => t.trackType === "video");
    const videoClips = timelineDoc.clips.filter((c) => c.trackId === v1Track?.id);
    expect(videoClips.length).toBe(2);

    expect(videoClips[0].sceneId).toBe("scene-1");
    expect(videoClips[0].startSeconds).toBe(0.0);
    // Since audio duration is 4.2s, scene 1 took 4.2s
    expect(videoClips[0].durationSeconds).toBe(4.2);

    // Scene 2 starts immediately after Scene 1
    expect(videoClips[1].sceneId).toBe("scene-2");
    expect(videoClips[1].startSeconds).toBeCloseTo(4.2);
    expect(videoClips[1].durationSeconds).toBe(6.0);

    // Check audio clip
    const a1Track = timelineDoc.tracks.find((t) => t.trackType === "voice");
    const audioTimelineClips = timelineDoc.clips.filter((c) => c.trackId === a1Track?.id);
    expect(audioTimelineClips.length).toBe(1);
    expect(audioTimelineClips[0].relativePath).toBe("audio/voice_1_abc.wav");

    // Check subtitle clip
    const subTrack = timelineDoc.tracks.find((t) => t.trackType === "subtitle");
    const subTimelineClips = timelineDoc.clips.filter((c) => c.trackId === subTrack?.id);
    expect(subTimelineClips.length).toBe(1);
    expect(subTimelineClips[0].name).toBe("Welcome to this episode.");

    // Check total duration
    expect(timelineDoc.totalDurationSeconds).toBeCloseTo(10.2);
  });

  it("calculates total duration correctly across all tracks", () => {
    const clips: TimelineClip[] = [
      {
        id: "c1",
        projectId: "p1",
        trackId: "t1",
        sceneId: null,
        name: "Clip 1",
        startSeconds: 0,
        durationSeconds: 15.5,
        sourceStartSeconds: 0,
        mediaType: "video",
        assetId: null,
        relativePath: null,
        color: "#3b82f6",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "c2",
        projectId: "p1",
        trackId: "t2",
        sceneId: null,
        name: "Music",
        startSeconds: 10,
        durationSeconds: 30.0,
        sourceStartSeconds: 0,
        mediaType: "audio",
        assetId: null,
        relativePath: null,
        color: "#10b981",
        createdAt: "",
        updatedAt: "",
      },
    ];

    const total = calculateTimelineDuration(clips);
    expect(total).toBe(40.0); // 10 + 30
  });

  it("verifies render presets have valid video/audio parameters", () => {
    expect(RENDER_PRESETS.length).toBeGreaterThanOrEqual(4);

    const standard1080p = RENDER_PRESETS.find((p) => p.id === "youtube-1080p-60");
    expect(standard1080p).toBeDefined();
    expect(standard1080p?.aspectRatio).toBe("16:9");
    expect(standard1080p?.fps).toBe(60);
    expect(standard1080p?.resolution).toBe("1080p");
    expect(standard1080p?.videoCodec).toBe("libx264");

    const shortsPreset = RENDER_PRESETS.find((p) => p.id === "youtube-shorts-9-16");
    expect(shortsPreset).toBeDefined();
    expect(shortsPreset?.aspectRatio).toBe("9:16");
    expect(shortsPreset?.resolution).toBe("1080p");

    const quad4k = RENDER_PRESETS.find((p) => p.id === "youtube-4k-60");
    expect(quad4k).toBeDefined();
    expect(quad4k?.resolution).toBe("4k");
  });
});

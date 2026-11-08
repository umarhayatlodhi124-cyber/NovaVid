import { describe, expect, it } from "vitest";
import {
  formatTimestampSRT,
  formatTimestampVTT,
  parseTimestamp,
  chunkNarrationText,
  isRTLText,
  getLanguageDirection,
  exportToSRT,
  exportToWebVTT,
  parseSRT,
  parseWebVTT,
  generateSubtitlesFromStoryboard,
} from "./subtitles";
import type { StoryboardDocument } from "./storyboard";
import type { GeneratedAudioClip } from "./voice";

describe("subtitle studio module", () => {
  it("formats timestamps into valid SRT and WebVTT formats", () => {
    const srt = formatTimestampSRT(65.42);
    expect(srt).toBe("00:01:05,420");

    const vtt = formatTimestampVTT(65.42);
    expect(vtt).toBe("00:01:05.420");

    expect(parseTimestamp(srt)).toBeCloseTo(65.42, 2);
    expect(parseTimestamp(vtt)).toBeCloseTo(65.42, 2);
  });

  it("detects RTL text for Urdu and LTR for English/Roman Urdu", () => {
    const urduSample = "یہ ایک یوٹیوب ویڈیو کی اردو آڈیو ہے";
    const englishSample = "This is a YouTube video in English";
    const romanUrduSample = "Yeh ek YouTube video ki audio hai";

    expect(isRTLText(urduSample)).toBe(true);
    expect(isRTLText(englishSample)).toBe(false);
    expect(isRTLText(romanUrduSample)).toBe(false);

    expect(getLanguageDirection("Urdu", urduSample)).toBe("rtl");
    expect(getLanguageDirection("English", englishSample)).toBe("ltr");
    expect(getLanguageDirection("Roman Urdu", romanUrduSample)).toBe("ltr");
  });

  it("chunks long narration sentences into subtitle-sized segments", () => {
    const longNarration = "Artificial intelligence is changing video production at an unprecedented speed. Creators can now write scripts and generate audio in seconds.";
    const chunks = chunkNarrationText(longNarration);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const c of chunks) {
      expect(c.length).toBeGreaterThan(0);
    }
  });

  it("exports subtitle segments to SRT and parses back cleanly", () => {
    const segments = [
      {
        id: "s1",
        sceneId: "scene-1",
        sceneNumber: 1,
        startTimeSeconds: 0.0,
        endTimeSeconds: 3.5,
        startTimeFormatted: "00:00:00,000",
        endTimeFormatted: "00:00:03,500",
        text: "Welcome to this episode.",
      },
      {
        id: "s2",
        sceneId: "scene-1",
        sceneNumber: 1,
        startTimeSeconds: 3.5,
        endTimeSeconds: 7.2,
        startTimeFormatted: "00:00:03,500",
        endTimeFormatted: "00:00:07,200",
        text: "Today we explore AI workflows.",
      },
    ];

    const srt = exportToSRT(segments);
    expect(srt).toContain("1\n00:00:00,000 --> 00:00:03,500\nWelcome to this episode.");
    expect(srt).toContain("2\n00:00:03,500 --> 00:00:07,200\nToday we explore AI workflows.");

    const parsed = parseSRT(srt);
    expect(parsed.length).toBe(2);
    expect(parsed[0].text).toBe("Welcome to this episode.");
    expect(parsed[0].startTimeSeconds).toBe(0.0);
    expect(parsed[0].endTimeSeconds).toBe(3.5);
    expect(parsed[1].text).toBe("Today we explore AI workflows.");
  });

  it("exports subtitle segments to WebVTT with valid header", () => {
    const segments = [
      {
        id: "s1",
        sceneId: "scene-1",
        sceneNumber: 1,
        startTimeSeconds: 1.0,
        endTimeSeconds: 4.0,
        startTimeFormatted: "00:00:01.000",
        endTimeFormatted: "00:00:04.000",
        text: "WebVTT caption test.",
      },
    ];

    const vtt = exportToWebVTT(segments, "My Video");
    expect(vtt.startsWith("WEBVTT - My Video")).toBe(true);
    expect(vtt).toContain("00:00:01.000 --> 00:00:04.000\nWebVTT caption test.");

    const parsed = parseWebVTT(vtt);
    expect(parsed.length).toBe(1);
    expect(parsed[0].text).toBe("WebVTT caption test.");
  });

  it("generates honest subtitle document using real audio duration when available", () => {
    const mockStoryboard: StoryboardDocument = {
      id: "sb-1",
      title: "Test AI Storyboard",
      format: "Long-form",
      scenes: [
        {
          id: "sc-1",
          number: 1,
          title: "Introduction",
          narration: "Welcome to AI YouTube Studio. Discover the future of creation.",
          duration: 5,
          visualDescription: "Futuristic digital studio workspace",
          visualPrompt: "Futuristic digital studio workspace",
          cameraMotion: "Static",
          transition: "cut",
          audioSuggestion: "Soft chime",
          assetId: null,
          status: "pending",
        },
      ],
      versions: [],
      currentVersionId: "v-1",
      styleProfileId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockAudioClip: GeneratedAudioClip = {
      id: "clip-1",
      projectId: "proj-10",
      sceneId: "sc-1",
      originalName: "audio_sc_1.wav",
      relativePath: "projects/proj-10/audio/audio_sc_1.wav",
      absolutePath: "C:/data/projects/proj-10/audio/audio_sc_1.wav",
      provider: "native",
      voiceName: "David",
      durationSeconds: 4.85,
      sizeBytes: 155200,
      checksum: "a1b2c3d4",
      waveform: [0.1, 0.4, 0.8, 0.2],
      status: "approved",
      createdAt: new Date().toISOString(),
    };

    const subDoc = generateSubtitlesFromStoryboard(
      "proj-10",
      mockStoryboard,
      { "sc-1": mockAudioClip },
    );

    expect(subDoc.projectId).toBe("proj-10");
    expect(subDoc.segments.length).toBeGreaterThan(0);
    // End time of last segment should equal the real audio duration
    const lastSeg = subDoc.segments[subDoc.segments.length - 1];
    expect(lastSeg.endTimeSeconds).toBeCloseTo(4.85, 2);
  });
});

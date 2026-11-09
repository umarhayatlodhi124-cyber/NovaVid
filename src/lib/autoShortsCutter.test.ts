import { describe, it, expect } from "vitest";
import { detectViralMoments, buildFFmpegCropFilter } from "./autoShortsCutter";

describe("Auto Shorts Cutter Engine", () => {
  it("generates 3 high-impact viral moments when script sentences are empty", () => {
    const moments = detectViralMoments([], 3);
    expect(moments).toHaveLength(3);
    moments.forEach((m) => {
      expect(m.viralScore).toBeGreaterThanOrEqual(70);
      expect(m.durationSeconds).toBeLessThanOrEqual(60);
      expect(m.suggestedHashtags.length).toBeGreaterThan(0);
    });
  });

  it("extracts viral chunks from script sentences and calculates viral score", () => {
    const sampleSentences = [
      { text: "Here is the biggest secret to making money with AI tools in 2025.", startTime: 10, duration: 8 },
      { text: "Most beginners make a huge mistake and lose all their time.", startTime: 18, duration: 10 },
      { text: "You must never ignore this free productivity hack.", startTime: 28, duration: 10 },
      { text: "Follow this exact formula to start winning right away.", startTime: 38, duration: 10 },
    ];

    const moments = detectViralMoments(sampleSentences, 2);
    expect(moments.length).toBeGreaterThan(0);
    expect(moments[0].viralScore).toBeGreaterThanOrEqual(80);
  });

  it("builds correct 9:16 vertical crop filter for FFmpeg", () => {
    const filter = buildFFmpegCropFilter("9:16");
    expect(filter).toContain("crop=ih*(9/16)");
    expect(filter).toContain("scale=1080:1920");
  });
});


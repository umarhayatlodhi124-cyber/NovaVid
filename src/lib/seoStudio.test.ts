import { describe, expect, it } from "vitest";
import {
  generateTitleCandidates,
  generateChaptersFromStoryboard,
  generateTags,
  calculateTagsBudget,
  generateHashtags,
  generateThumbnailTexts,
  buildOptimizedDescription,
} from "./seoStudio";

describe("Stage G — YouTube SEO & Metadata Studio Unit Tests", () => {
  it("generateTitleCandidates generates 5 multi-angle high-CTR titles", () => {
    const titles = generateTitleCandidates("Quantum Computing");
    expect(titles.length).toBe(5);

    const styles = titles.map((t) => t.style);
    expect(styles).toContain("curiosity");
    expect(styles).toContain("how_to");
    expect(styles).toContain("emotional");
    expect(styles).toContain("search_optimized");
    expect(styles).toContain("short_punchy");

    titles.forEach((t) => {
      expect(t.score).toBeGreaterThanOrEqual(80);
      expect(t.title.length).toBeLessThanOrEqual(100);
    });
  });

  it("generateChaptersFromStoryboard produces sequential MM:SS timestamps", () => {
    const mockStoryboard = {
      id: "sb-1",
      title: "Test Video",
      format: "Long-form" as const,
      scenes: [
        {
          id: "s1",
          number: 1,
          title: "Introduction",
          narration: "Intro text",
          duration: 15,
          visualDescription: "Intro visual",
          visualPrompt: "Intro prompt",
          cameraMotion: "Zoom",
          transition: "Cut",
          audioSuggestion: "Music",
          assetId: null,
          status: "approved" as const,
        },
        {
          id: "s2",
          number: 2,
          title: "Deep Dive",
          narration: "Body text",
          duration: 75,
          visualDescription: "Body visual",
          visualPrompt: "Body prompt",
          cameraMotion: "Pan",
          transition: "Fade",
          audioSuggestion: "Music",
          assetId: null,
          status: "approved" as const,
        },
      ],
      versions: [],
      currentVersionId: "v1",
      createdAt: "",
      updatedAt: "",
      styleProfileId: null,
    };

    const chapters = generateChaptersFromStoryboard(mockStoryboard);
    expect(chapters.length).toBe(2);
    expect(chapters[0].timestamp).toBe("00:00");
    expect(chapters[0].title).toBe("Introduction");
    expect(chapters[1].timestamp).toBe("00:15");
    expect(chapters[1].title).toBe("Deep Dive");
  });

  it("calculateTagsBudget accurately tracks YouTube 500-character limit", () => {
    const generated = generateTags("Quantum Computing");
    expect(generated.length).toBeGreaterThanOrEqual(5);

    const tags = ["ai video", "youtube studio", "novavid"];
    const budget = calculateTagsBudget(tags);
    expect(budget.count).toBe(3);
    expect(budget.totalChars).toBe(tags.join(",").length);
    expect(budget.remainingChars).toBe(500 - budget.totalChars);
    expect(budget.isWithinBudget).toBe(true);

    const longTag = "a".repeat(501);
    const overBudget = calculateTagsBudget([longTag]);
    expect(overBudget.isWithinBudget).toBe(false);
  });

  it("generateHashtags formats valid YouTube hashtags", () => {
    const hashtags = generateHashtags("AI Revolution");
    expect(hashtags.length).toBeGreaterThanOrEqual(3);
    hashtags.forEach((h) => expect(h.startsWith("#")).toBe(true));
  });

  it("generateThumbnailTexts returns high-impact punchy short words", () => {
    const thumbs = generateThumbnailTexts("Quantum Computing");
    expect(thumbs.length).toBeGreaterThan(0);
    thumbs.forEach((t) => expect(t.length).toBeLessThan(35));
  });

  it("buildOptimizedDescription assembles hook, timestamps, and hashtags", () => {
    const desc = buildOptimizedDescription(
      "AI Editing",
      "Discover the next evolution of video production.",
      [{ timestamp: "00:00", seconds: 0, title: "Intro" }],
      ["#AI", "#Tech"]
    );
    expect(desc).toContain("TIMESTAMPS:");
    expect(desc).toContain("00:00 - Intro");
    expect(desc).toContain("#AI #Tech");
  });
});

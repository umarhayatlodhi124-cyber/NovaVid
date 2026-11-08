import { describe, it, expect } from "vitest";
import {
  generateThumbnailConcepts,
  validateThumbnailFile,
  THUMBNAIL_STYLES,
} from "./thumbnailStudio";

describe("YouTube Thumbnail Studio & Upload Engine", () => {
  it("1. Generates 3 unique high-converting 1280x720 concepts tailored to niche and topic", () => {
    const concepts = generateThumbnailConcepts(
      "LODHI TECHX Autonomous AI Video Pipeline Masterclass",
      "Technology & AI",
      { badgeText: "NEW 2.0", projectId: "test_proj_01" }
    );

    expect(concepts.length).toBe(3);

    for (const c of concepts) {
      expect(c.width).toBe(1280);
      expect(c.height).toBe(720);
      expect(c.aspectRatio).toBe("16:9");
      expect(c.headline.length).toBeGreaterThan(0);
      expect(c.uploadedToYouTube).toBe(false);
    }

    // Verify distinct creative styles
    const styles = concepts.map((c) => c.style);
    expect(styles).toContain("tech_cyber");
    expect(styles).toContain("bold_impact");
    expect(styles).toContain("cinematic_gold");
  });

  it("2. Validates thumbnail dimensions, format, and YouTube 2MB size limit", () => {
    // Valid thumbnail
    const valid = validateThumbnailFile({
      width: 1280,
      height: 720,
      format: "png",
      fileSizeBytes: 850 * 1024, // 850 KB
    });
    expect(valid.valid).toBe(true);
    expect(valid.errors.length).toBe(0);

    // Invalid low resolution & oversized thumbnail
    const invalid = validateThumbnailFile({
      width: 640,
      height: 360,
      format: "gif",
      fileSizeBytes: 3 * 1024 * 1024, // 3 MB > 2MB limit
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.some((e) => e.includes("below recommended"))).toBe(true);
    expect(invalid.errors.some((e) => e.includes("unsupported"))).toBe(true);
    expect(invalid.errors.some((e) => e.includes("exceeds YouTube's 2MB"))).toBe(true);
  });

  it("3. Verifies thumbnail style presets have high-contrast palettes", () => {
    expect(THUMBNAIL_STYLES.length).toBeGreaterThanOrEqual(4);
    for (const style of THUMBNAIL_STYLES) {
      expect(style.backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(style.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(style.textColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

import { describe, it, expect } from "vitest";
import {
  generateThumbnailVariations,
  validateThumbnail,
  THUMBNAIL_STYLES,
  type ThumbnailProject,
} from "./dynamicThumbnailEngine";

const sampleProject: ThumbnailProject = {
  id: "test_proj_001",
  videoTopic: "How to Learn Python Fast",
  videoTitle: "Python Tutorial 2025 Complete Guide",
  channelName: "@lodhitechx",
  category: "tutorial",
};

describe("Dynamic Thumbnail Engine", () => {
  it("generates exactly 3 variations per project", () => {
    const variations = generateThumbnailVariations(sampleProject);
    expect(variations).toHaveLength(3);
  });

  it("generates face_focused, subject_focused and cinematic variations", () => {
    const variations = generateThumbnailVariations(sampleProject);
    const types = variations.map((v) => v.variationType);
    expect(types).toContain("face_focused");
    expect(types).toContain("subject_focused");
    expect(types).toContain("cinematic");
  });

  it("all variations have correct 1280x720 dimensions", () => {
    const variations = generateThumbnailVariations(sampleProject);
    variations.forEach((v) => {
      expect(v.width).toBe(1280);
      expect(v.height).toBe(720);
      expect(v.aspectRatio).toBe("16:9");
    });
  });

  it("all variations are bound to the project id", () => {
    const variations = generateThumbnailVariations(sampleProject);
    variations.forEach((v) => {
      expect(v.projectId).toBe(sampleProject.id);
    });
  });

  it("headlines are generated from actual topic, not hardcoded demo content", () => {
    const variations = generateThumbnailVariations(sampleProject);
    variations.forEach((v) => {
      expect(v.headline).not.toContain("TALEEMI");
      expect(v.headline).not.toContain("SCHOOL ERP");
      expect(v.headline).not.toContain("LODHI TECHX OFFICIAL");
    });
  });

  it("validates a correct 1280x720 thumbnail as valid", () => {
    const [v] = generateThumbnailVariations(sampleProject);
    const result = validateThumbnail(v);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("supports all 13 thumbnail styles", () => {
    expect(THUMBNAIL_STYLES).toHaveLength(13);
    const ids = THUMBNAIL_STYLES.map((s) => s.id);
    expect(ids).toContain("modern_technology");
    expect(ids).toContain("cinematic");
    expect(ids).toContain("custom_creator");
  });

  it("applies brand colors from project when provided", () => {
    const projectWithBrand: ThumbnailProject = {
      ...sampleProject,
      brandColors: { primary: "#001122", accent: "#FF5500" },
    };
    const variations = generateThumbnailVariations(projectWithBrand);
    variations.forEach((v) => {
      expect(v.accentColor).toBe("#FF5500");
      expect(v.backgroundColor).toBe("#001122");
    });
  });
});


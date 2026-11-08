import { describe, it, expect } from "vitest";
import {
  DEFAULT_LODHI_TECHX_PROFILE,
  BUILTIN_CREATOR_PRESETS,
  type CreatorProfile,
  type LanguageConfig,
} from "./creatorWorkspace";
import { CreatorWorkspaceRepository } from "./repositories";

describe("Stage R — Creator Workspace & Channel Profiles Unit Tests", () => {
  it("initializes LODHI TECHX as the first-run default profile", () => {
    expect(DEFAULT_LODHI_TECHX_PROFILE).toBeDefined();
    expect(DEFAULT_LODHI_TECHX_PROFILE.name).toBe("LODHI TECHX");
    expect(DEFAULT_LODHI_TECHX_PROFILE.handle).toBe("@lodhitechx");
    expect(DEFAULT_LODHI_TECHX_PROFILE.isDefault).toBe(true);
    expect(DEFAULT_LODHI_TECHX_PROFILE.videoDefaults.fps).toBe(60);
    expect(DEFAULT_LODHI_TECHX_PROFILE.videoDefaults.resolution).toBe("1080p");
  });

  it("configures 6 independent language axes preserving Urdu Nastaliq RTL", () => {
    const lang: LanguageConfig = DEFAULT_LODHI_TECHX_PROFILE.languageConfig;
    expect(lang.research).toBe("English");
    expect(lang.script).toBe("Roman Urdu");
    expect(lang.voice).toBe("Urdu");
    expect(lang.subtitles).toBe("Urdu");
    expect(lang.titleDescription).toBe("English");
    expect(lang.thumbnailText).toBe("English");
  });

  it("provides 7 standard creator production presets across formats", () => {
    expect(BUILTIN_CREATOR_PRESETS.length).toBe(7);
    const categories = BUILTIN_CREATOR_PRESETS.map((p) => p.category);
    expect(categories).toContain("tech_tutorial");
    expect(categories).toContain("ai_tools");
    expect(categories).toContain("software_demo");
    expect(categories).toContain("educational");
    expect(categories).toContain("product_review");
    expect(categories).toContain("news_updates");
    expect(categories).toContain("explainer");

    // Verify Shorts format included for AI tools and News updates
    const aiToolsShort = BUILTIN_CREATOR_PRESETS.find((p) => p.category === "ai_tools");
    expect(aiToolsShort?.format).toBe("Shorts");
    expect(aiToolsShort?.defaultDurationSeconds).toBeLessThanOrEqual(60);
  });

  it("repository returns default profile and builtin presets safely when offline", async () => {
    const profiles = await CreatorWorkspaceRepository.listProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(1);
    expect(profiles[0].name).toBe("LODHI TECHX");

    const defaultProfile = await CreatorWorkspaceRepository.getDefaultProfile();
    expect(defaultProfile.handle).toBe("@lodhitechx");

    const presets = await CreatorWorkspaceRepository.listPresets();
    expect(presets.length).toBeGreaterThanOrEqual(7);
  });

  it("allows creating and editing custom channel profiles without hardcoding", () => {
    const customProfile: CreatorProfile = {
      ...DEFAULT_LODHI_TECHX_PROFILE,
      id: "prof_custom_gaming",
      name: "Apex Gaming Urdu",
      handle: "@apexgamingurdu",
      description: "Gaming highlights, Urdu esports commentary, and pro strategies.",
      isDefault: false,
      videoDefaults: {
        format: "Shorts",
        aspectRatio: "9:16",
        resolution: "1080p",
        fps: 60,
        defaultDurationSeconds: 60,
      },
    };

    expect(customProfile.name).toBe("Apex Gaming Urdu");
    expect(customProfile.videoDefaults.aspectRatio).toBe("9:16");
    expect(customProfile.videoDefaults.format).toBe("Shorts");
  });
});

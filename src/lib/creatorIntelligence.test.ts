import { describe, it, expect } from "vitest";
import {
  NICHE_PRODUCTION_TEMPLATES,
  generateConsistentCharacterProfile,
  autoScriptToStoryboard,
  autoSyncVoiceAndSubtitles,
  calculateCreatorProductivityMetrics,
} from "./creatorIntelligence";
import { createScriptDocument } from "./scripts";
import type { StoryboardScene } from "./storyboard";
import type { Project } from "./project";

describe("Phase C: Creator Intelligence & Automation Engine Tests", () => {
  it("provides pre-configured niche production templates for 16:9, 9:16 and 1:1", () => {
    expect(NICHE_PRODUCTION_TEMPLATES.length).toBeGreaterThanOrEqual(4);

    const landscapeTemplate = NICHE_PRODUCTION_TEMPLATES.find((t) => t.aspectRatio === "16:9");
    const verticalTemplate = NICHE_PRODUCTION_TEMPLATES.find((t) => t.aspectRatio === "9:16");
    const squareTemplate = NICHE_PRODUCTION_TEMPLATES.find((t) => t.aspectRatio === "1:1");

    expect(landscapeTemplate).toBeDefined();
    expect(verticalTemplate?.name).toContain("Viral Shorts");
    expect(squareTemplate?.aspectRatio).toBe("1:1");
  });

  it("generates an immutable AI character profile with consistent seed and negative prompts", () => {
    const profile1 = generateConsistentCharacterProfile("Umar Hayat", "Chief AI Architect", "Technology");
    const profile2 = generateConsistentCharacterProfile("Umar Hayat", "Chief AI Architect", "Technology");

    expect(profile1.name).toBe("Umar Hayat");
    expect(profile1.visualPromptAnchor).toContain("Umar Hayat");
    expect(profile1.negativePrompt).toContain("deformed face");
    expect(profile1.seed).toBe(profile2.seed);
  });

  it("automatically transforms a structured script into an actionable storyboard with camera motions and transitions", () => {
    const script = createScriptDocument({
      title: "The Future of Autonomous Agents",
      language: "English",
      format: "Long-form",
      content:
        "Artificial intelligence is transforming coding forever. Developers can now build full platforms autonomously. The future is local and decentralized.",
    });

    const character = generateConsistentCharacterProfile("Umar Hayat", "Tech Presenter", "AI");
    const storyboard = autoScriptToStoryboard(script, character);

    expect(storyboard.scenes.length).toBeGreaterThanOrEqual(2);
    expect(storyboard.versions.length).toBeGreaterThanOrEqual(1);

    const firstScene = storyboard.scenes[0];
    expect(firstScene.visualPrompt).toContain(character.visualPromptAnchor);
    expect(firstScene.cameraMotion).toBeDefined();
    expect(firstScene.transition).toBeDefined();
    expect(firstScene.duration).toBeGreaterThan(0);
  });

  it("synchronizes storyboard scenes into word-accurate subtitle segments for dynamic captions", () => {
    const scenes: StoryboardScene[] = [
      {
        id: "sc-1",
        number: 1,
        title: "Hook Scene",
        narration: "Welcome to NovaVid AI Studio 2.0.",
        duration: 3,
        visualDescription: "Studio shot",
        visualPrompt: "Studio shot",
        cameraMotion: "Zoom In",
        transition: "fade",
        audioSuggestion: "Synth",
        assetId: null,
        status: "approved",
      },
    ];

    const subtitleDoc = autoSyncVoiceAndSubtitles(scenes, 2.5);
    expect(subtitleDoc.segments.length).toBeGreaterThan(0);
    expect(subtitleDoc.styleProfile.fontFamily).toBeDefined();
    expect(subtitleDoc.segments[0].endTimeSeconds).toBeGreaterThan(subtitleDoc.segments[0].startTimeSeconds);
  });

  it("calculates accurate creator productivity telemetry and hours saved", () => {
    const mockProjects: Project[] = [
      {
        id: "p1",
        name: "Project 1",
        topic: "AI",
        language: "English",
        status: "completed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "p2",
        name: "Project 2",
        topic: "Tech",
        language: "English",
        status: "completed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const metrics = calculateCreatorProductivityMetrics(mockProjects, 16);
    expect(metrics.totalProjects).toBe(2);
    expect(metrics.totalScenesRendered).toBe(16);
    expect(metrics.totalVideoMinutesProduced).toBeGreaterThan(0);
    expect(metrics.hoursSavedVersusManualEditing).toBeGreaterThan(0);
    expect(metrics.averageQcScorePercent).toBe(98.4);
  });
});

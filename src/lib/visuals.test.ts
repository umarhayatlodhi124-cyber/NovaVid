import { describe, expect, it } from "vitest";
import {
  constructScenePrompt,
  estimateImageCost,
  VISUAL_STYLE_PRESETS,
  MOTION_PRESETS,
  type CharacterProfile,
} from "./visuals";
import type { StoryboardScene } from "./storyboard";

describe("Visual Asset Studio & Consistency Engine (Stage D)", () => {
  const mockScene: StoryboardScene = {
    id: "scene-101",
    number: 1,
    title: "Quantum Lab Breakthrough",
    narration: "Inside the quantum computing facility, Dr. Maya initiates the core alignment.",
    visualDescription: "Futuristic server racks glowing with deep cobalt light",
    visualPrompt: "Futuristic server racks glowing with deep cobalt blue volumetric light",
    cameraMotion: "slow pan-right",
    transition: "crossfade",
    audioSuggestion: "ambient hum",
    assetId: null,
    duration: 5.5,
    status: "pending",
  };

  const mockCharacter: CharacterProfile = {
    id: "char-1",
    projectId: "proj-1",
    name: "Dr. Maya",
    role: "Lead Physicist",
    appearanceAttributes: "32-year-old Asian woman with sleek black bob and observant hazel eyes",
    clothingContinuity: "white high-collar lab uniform with silver magnetic clasps",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("constructs rich prompts combining scene visuals, character continuity, and style modifiers", () => {
    const prompt = constructScenePrompt(mockScene, mockCharacter, "cinematic");

    // 1. Includes visual prompt
    expect(prompt).toContain("Futuristic server racks glowing with deep cobalt blue volumetric light");

    // 2. Infuses character name, role, facial attributes, and clothing
    expect(prompt).toContain("Dr. Maya (Lead Physicist)");
    expect(prompt).toContain("sleek black bob and observant hazel eyes");
    expect(prompt).toContain("wearing white high-collar lab uniform with silver magnetic clasps");

    // 3. Includes camera direction
    expect(prompt).toContain("Camera angle: slow pan-right");

    // 4. Includes cinematic style prompt modifier
    expect(prompt).toContain("shot on Arri Alexa 35mm");
    expect(prompt).toContain("color graded");
  });

  it("handles scenes without characters gracefully", () => {
    const prompt = constructScenePrompt(mockScene, null, "anime");

    expect(prompt).toContain("Futuristic server racks");
    expect(prompt).not.toContain("Dr. Maya");
    expect(prompt).toContain("makoto shinkai aesthetic");
  });

  it("falls back to scene description or title when visualPrompt is empty", () => {
    const fallbackScene: StoryboardScene = {
      ...mockScene,
      visualPrompt: "",
      visualDescription: "Dramatic sunset over Mars colony dome",
    };

    const prompt = constructScenePrompt(fallbackScene, null, "photorealistic");
    expect(prompt).toContain("Dramatic sunset over Mars colony dome");
    expect(prompt).toContain("professional award-winning photography");
  });

  it("estimates generation costs accurately with billing confirmation gates", async () => {
    const geminiEstimate = await estimateImageCost(5, "imagen-3.0-generate-002");
    expect(geminiEstimate.imageCount).toBe(5);
    expect(geminiEstimate.estimatedCost).toBe("$0.15 USD");
    expect(geminiEstimate.requiresBillingConfirmation).toBe(true);

    const localEstimate = await estimateImageCost(10, "local-synthesizer");
    expect(localEstimate.imageCount).toBe(10);
    expect(localEstimate.estimatedCost).toBe("$0.00 USD");
    expect(localEstimate.requiresBillingConfirmation).toBe(false);
  });

  it("provides all 8 required visual style presets with valid prompt modifiers", () => {
    expect(VISUAL_STYLE_PRESETS.length).toBeGreaterThanOrEqual(8);
    const ids = VISUAL_STYLE_PRESETS.map((p) => p.id);
    expect(ids).toContain("cinematic");
    expect(ids).toContain("photorealistic");
    expect(ids).toContain("anime");
    expect(ids).toContain("digital_art");
    expect(ids).toContain("3d_render");
    expect(ids).toContain("vintage");
    expect(ids).toContain("claymation");
    expect(ids).toContain("minimalist");

    for (const preset of VISUAL_STYLE_PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.promptModifier.length).toBeGreaterThan(10);
    }
  });

  it("provides Ken Burns timeline motion presets", () => {
    expect(MOTION_PRESETS.length).toBe(5);
    const ids = MOTION_PRESETS.map((m) => m.id);
    expect(ids).toContain("zoom_in");
    expect(ids).toContain("zoom_out");
    expect(ids).toContain("pan_left");
    expect(ids).toContain("pan_right");
    expect(ids).toContain("static");
  });
});

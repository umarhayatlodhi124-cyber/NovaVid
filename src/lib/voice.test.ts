import { describe, expect, it } from "vitest";
import {
  FALLBACK_VOICES,
  estimateCostForText,
  generateVoiceAudio,
  generateSceneVoiceAudio,
} from "./voice";
import type { StoryboardScene } from "./storyboard";

describe("voice studio module", () => {
  it("provides balanced fallback voices for Gemini and native Windows", () => {
    expect(FALLBACK_VOICES.length).toBeGreaterThanOrEqual(6);
    const geminiVoices = FALLBACK_VOICES.filter((v) => v.provider === "gemini");
    const nativeVoices = FALLBACK_VOICES.filter((v) => v.provider === "native");

    expect(geminiVoices.some((v) => v.id === "Kore")).toBe(true);
    expect(geminiVoices.some((v) => v.id === "Puck")).toBe(true);
    expect(nativeVoices.some((v) => v.id.includes("David"))).toBe(true);
  });

  it("calculates cost estimate with billing requirement for Gemini vs zero cost for Native", async () => {
    const text = "Hello world this is a test narration.";
    const geminiEstimate = await estimateCostForText(text, "gemini");
    expect(geminiEstimate.characterCount).toBe(text.length);
    expect(geminiEstimate.requiresBillingConfirmation).toBe(true);
    expect(geminiEstimate.estimatedCost).toContain("$");

    const nativeEstimate = await estimateCostForText(text, "native");
    expect(nativeEstimate.requiresBillingConfirmation).toBe(false);
    expect(nativeEstimate.estimatedCost).toContain("$0.00");
  });

  it("rejects voice generation if project is missing or text is blank", async () => {
    await expect(
      generateVoiceAudio({
        projectId: "",
        text: "Some script text",
        provider: "native",
        voiceName: "David",
        billingConfirmed: false,
      }),
    ).rejects.toThrow("Select a project");

    await expect(
      generateVoiceAudio({
        projectId: "proj-1",
        text: "   ",
        provider: "native",
        voiceName: "David",
        billingConfirmed: false,
      }),
    ).rejects.toThrow("Enter narration text");
  });

  it("rejects Gemini voice generation if explicit billing is not confirmed", async () => {
    await expect(
      generateVoiceAudio({
        projectId: "proj-1",
        text: "Paid Gemini audio generation text",
        provider: "gemini",
        voiceName: "Kore",
        billingConfirmed: false,
      }),
    ).rejects.toThrow("Explicit billing authorization is required");
  });

  it("fails scene generation gracefully if scene has no narration or title", async () => {
    const emptyScene: StoryboardScene = {
      id: "sc-1",
      number: 1,
      title: "",
      narration: "",
      duration: 5,
      visualDescription: "",
      visualPrompt: "Camera pans over sunset",
      cameraMotion: "Pan",
      transition: "cut",
      audioSuggestion: "Wind rustling",
      assetId: null,
      status: "pending",
    };

    await expect(
      generateSceneVoiceAudio("proj-1", emptyScene, {
        provider: "native",
        voiceName: "David",
        billingConfirmed: true,
      }),
    ).rejects.toThrow("Scene #1 has no narration text");
  });
});

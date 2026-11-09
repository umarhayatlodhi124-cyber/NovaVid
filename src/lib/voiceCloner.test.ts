import { describe, it, expect } from "vitest";
import { synthesizeVoiceProfile, getVoiceTTSConfig } from "./voiceCloner";

describe("Creator Voice Cloner Engine", () => {
  it("synthesizes valid voice profile from 30s sample duration", () => {
    const profile = synthesizeVoiceProfile("Umar Hayat", 30, "ur");
    expect(profile.id).toBeTruthy();
    expect(profile.creatorName).toBe("Umar Hayat");
    expect(profile.status).toBe("ready");
    expect(profile.timbreWarmthScore).toBeGreaterThanOrEqual(70);
    expect(profile.acousticStabilityScore).toBeGreaterThanOrEqual(80);
  });

  it("returns proper TTS configuration parameters", () => {
    const profile = synthesizeVoiceProfile("Umar Hayat", 45, "ur");
    const cfg = getVoiceTTSConfig(profile);
    expect(cfg.voiceModel).toContain("umar_hayat");
    expect(cfg.pitchAdjustment).toBeDefined();
    expect(cfg.rateAdjustment).toBeDefined();
  });
});


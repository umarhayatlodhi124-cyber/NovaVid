import { describe, expect, it } from "vitest";
import { FALLBACK_GEMINI_CATALOG, validateSelectedModel } from "./models";

describe("models catalog and validation", () => {
  it("includes modern recommended Gemini models and excludes deprecated 1.5", () => {
    const ids = FALLBACK_GEMINI_CATALOG.map((m) => m.id);
    expect(ids).toContain("gemini-3.8-flash");
    expect(ids).toContain("gemini-3.5-flash");
    expect(ids).toContain("gemini-3.5-flash-lite");
    expect(ids).toContain("gemini-4-argon");
    expect(ids).not.toContain("gemini-1.5-flash");
    expect(ids).not.toContain("gemini-2.5-flash");
  });

  it("identifies gemini-3.8-flash as recommended and supporting text & tts", () => {
    const model = validateSelectedModel("gemini-3.8-flash");
    expect(model.status).toBe("recommended");
    expect(model.supportsText).toBe(true);
    expect(model.supportsTts).toBe(true);
  });

  it("throws error for disallowed or invalid model IDs", () => {
    expect(() => validateSelectedModel("gemini-1.5-flash")).toThrow("not in the controlled allowlist");
    expect(() => validateSelectedModel("gemini-2.5-flash")).toThrow("not in the controlled allowlist");
    expect(() => validateSelectedModel("gpt-4o-unknown")).toThrow("not in the controlled allowlist");
  });

  it("validates capability requirements correctly", () => {
    expect(() => validateSelectedModel("gemini-3.8-flash-tts", undefined, "text")).toThrow("does not support text generation");
    expect(() => validateSelectedModel("gemini-4-argon", undefined, "tts")).toThrow("does not support voice/TTS generation");
    const valid = validateSelectedModel("gemini-3.8-flash", undefined, "tts");
    expect(valid.supportsTts).toBe(true);
  });
});

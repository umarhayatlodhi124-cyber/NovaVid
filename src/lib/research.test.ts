import { describe, expect, it } from "vitest";
import { DEFAULT_PROVIDER_CONFIG, GeminiProviderAdapter } from "./providers";
import { generateResearchBrief } from "./research";

describe("generateResearchBrief", () => {
  it("creates a structured brief and marks limitations", () => {
    const adapter = new GeminiProviderAdapter({
      ...DEFAULT_PROVIDER_CONFIG,
      credentialConfigured: true,
      enabled: true,
    });

    const brief = generateResearchBrief({
      topic: "AI creator tools",
      language: "English",
      provider: adapter,
    });

    expect(brief.topic).toBe("AI creator tools");
    expect(brief.questions.length).toBeGreaterThan(0);
    expect(brief.verifiedFacts.length).toBeGreaterThanOrEqual(0);
    expect(brief.limitations).toContain("web research");
  });
});

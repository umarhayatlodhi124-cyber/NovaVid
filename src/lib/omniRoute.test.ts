import { describe, it, expect } from "vitest";
import {
  discoverOmniRouteModels,
  resolveOmniRouteModel,
} from "./omniRoute";
import { ClaudeScriptEngine } from "./claudeEngine";

describe("OmniRoute Multi-Provider Gateway & Model Discovery", () => {
  it("discovers verified models and separates free from paid models accurately", async () => {
    const discovery = await discoverOmniRouteModels();
    expect(discovery.success).toBe(true);
    expect(discovery.models.length).toBeGreaterThanOrEqual(5);
    expect(discovery.freeModelsCount).toBeGreaterThan(0);
    expect(discovery.paidModelsCount).toBeGreaterThan(0);
    expect(discovery.claudeModelsCount).toBeGreaterThanOrEqual(2);

    // Verify no paid model is classified as free
    for (const model of discovery.models) {
      if (model.tier === "free") {
        expect(model.pricing.promptCostPerMillion).toBe(0.0);
        expect(model.pricing.completionCostPerMillion).toBe(0.0);
      } else {
        expect(model.pricing.promptCostPerMillion).toBeGreaterThan(0.0);
      }
    }
  });

  it("governs free-tier policy: redirects paid Claude model to free model when freeTierOnly is set", () => {
    const resolution = resolveOmniRouteModel("anthropic/claude-3-5-sonnet-20241022", {
      freeTierOnly: true,
      hasPaidBilling: false,
    });

    expect(resolution.selectedModel.tier).toBe("free");
    expect(resolution.governanceWarning).toBeDefined();
    expect(resolution.governanceWarning).toContain("Enforcing free-tier policy");
  });

  it("permits Claude 3.5 Sonnet when paid billing is authorized", () => {
    const resolution = resolveOmniRouteModel("anthropic/claude-3-5-sonnet-20241022", {
      freeTierOnly: false,
      hasPaidBilling: true,
    });

    expect(resolution.selectedModel.id).toBe("anthropic/claude-3-5-sonnet-20241022");
    expect(resolution.selectedModel.isClaude).toBe(true);
    expect(resolution.governanceWarning).toBeUndefined();
  });
});

describe("ClaudeScriptEngine — Urdu Narrative & Storyboard Generation", () => {
  it("generates a structured Urdu video script with scenes and YouTube SEO metadata", async () => {
    const engine = new ClaudeScriptEngine();
    const result = await engine.generateScript({
      topic: "Taleemi Duniya Pro Software Overview",
      niche: "Education Technology",
      targetDurationSeconds: 60,
      language: "Urdu",
      format: "16:9",
      preferredModel: "anthropic/claude-3-5-sonnet-20241022",
      freeTierOnly: false,
      apiKey: "sk-ant-test-key",
    });

    expect(result.scenes.length).toBe(4);
    expect(result.titleUrdu).toContain("مکمل جائزہ اور عملی رہنمائی");
    expect(result.fullNarrationUrdu.length).toBeGreaterThan(50);
    expect(result.seoMetadata.tags).toContain("LODHI TECHX");
    expect(result.seoMetadata.categoryId).toBe("28");
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
    expect(result.modelUsed).toBe("anthropic/claude-3-5-sonnet-20241022");
  });

  it("gracefully falls back to free eligible model when in free-tier mode", async () => {
    const engine = new ClaudeScriptEngine();
    const result = await engine.generateScript({
      topic: "Daily AI Automation Tips",
      niche: "Technology",
      targetDurationSeconds: 45,
      language: "Urdu",
      format: "9:16",
      preferredModel: "anthropic/claude-3-5-sonnet-20241022",
      freeTierOnly: true, // User selected free tier only
    });

    expect(result.fallbackTriggered).toBe(true);
    expect(result.estimatedCostUsd).toBe(0.0);
    expect(result.providerUsed).toBe("google"); // Fell back to free Gemini
  });
});

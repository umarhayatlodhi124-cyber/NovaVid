import { describe, it, expect } from "vitest";
import {
  MASTER_MODEL_CATALOG,
  PROVIDER_DISPLAY_NAMES,
  routeTaskToModel,
  type AIProviderId,
} from "./aiGateway";

describe("Phase 4: Unified Multi-AI Provider Gateway Unit Tests", () => {
  it("master catalog contains all 10 required providers", () => {
    const requiredProviders: AIProviderId[] = [
      "gemini",
      "claude",
      "openai",
      "openrouter",
      "omniroute",
      "groq",
      "deepseek",
      "mistral",
      "together",
      "fireworks",
    ];

    const catalogProviders = new Set(MASTER_MODEL_CATALOG.map((m) => m.provider));
    for (const p of requiredProviders) {
      expect(catalogProviders.has(p)).toBe(true);
      expect(PROVIDER_DISPLAY_NAMES[p]).toBeDefined();
    }
  });

  it("never selects paid models when freeOnly is true", () => {
    const configured: AIProviderId[] = ["openai", "claude", "gemini", "deepseek"];
    const route = routeTaskToModel("script", {
      freeOnly: true,
      configuredProviders: configured,
    });

    // OpenAI and Claude are paid models; Gemini has free tier
    const primaryModel = MASTER_MODEL_CATALOG.find((m) => m.id === route.primary.model);
    expect(primaryModel?.tier).toBe("free");

    for (const fb of route.fallbacks) {
      const fbModel = MASTER_MODEL_CATALOG.find((m) => m.id === fb.model);
      if (fbModel) {
        expect(fbModel.tier).toBe("free");
      }
    }
  });

  it("prioritizes preferred provider when configured and matches criteria", () => {
    const route = routeTaskToModel("script", {
      freeOnly: false,
      configuredProviders: ["openai", "claude", "gemini"],
      preferredProvider: "claude",
    });

    expect(route.primary.provider).toBe("claude");
  });

  it("selects Urdu-capable models when isUrdu is true", () => {
    const route = routeTaskToModel("urdu_translation", {
      freeOnly: false,
      configuredProviders: ["groq", "gemini", "mistral"],
      isUrdu: true,
    });

    const primaryModel = MASTER_MODEL_CATALOG.find((m) => m.id === route.primary.model);
    expect(primaryModel?.supportsUrdu).toBe(true);
  });

  it("gracefully falls back to safe free Gemini if no providers match", () => {
    const route = routeTaskToModel("script", {
      freeOnly: true,
      configuredProviders: [],
    });

    expect(route.primary.provider).toBe("gemini");
    expect(route.primary.model).toBe("gemini-3.8-flash");
    expect(route.fallbacks.length).toBeGreaterThan(0);
  });
});

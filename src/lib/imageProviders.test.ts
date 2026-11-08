import { describe, expect, it } from "vitest";
import {
  GeminiImageAdapter,
  verifyImageProviderCapability,
  validateImageGenerationConfig,
} from "./imageProviders";

describe("image generation providers", () => {
  it("checks model capability before attempting generation", () => {
    expect(verifyImageProviderCapability("gemini-2.0-flash")).toBe(false);
    expect(verifyImageProviderCapability("imagen-3.0-generate-002")).toBe(true);
  });

  it("rejects unsupported image generation models and handles generation and cancellation", async () => {
    expect(() =>
      validateImageGenerationConfig({
        provider: "gemini",
        model: "gemini-2.0-flash",
        enabled: true,
      }),
    ).toThrow("does not support image generation");

    const disabledAdapter = new GeminiImageAdapter({
      provider: "gemini",
      model: "imagen-3.0-generate-002",
      enabled: false,
    });

    await expect(disabledAdapter.generateImage({ prompt: "test", aspectRatio: "16:9" })).rejects.toThrow(
      "Image generation is not available"
    );

    const activeAdapter = new GeminiImageAdapter({
      provider: "gemini",
      model: "imagen-3.0-generate-002",
      enabled: true,
    });

    const result = await activeAdapter.generateImage({ prompt: "test", aspectRatio: "16:9" });
    expect(result.id).toBeDefined();
    expect(result.status).toBe("completed");
    expect(result.width).toBe(1920);
    expect(activeAdapter.cancelGeneration("job-1")).toBe(false);
  });
});

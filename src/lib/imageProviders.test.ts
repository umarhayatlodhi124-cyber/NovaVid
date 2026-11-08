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

  it("rejects unsupported image generation models and handles cancellation", async () => {
    expect(() =>
      validateImageGenerationConfig({
        provider: "gemini",
        model: "gemini-2.0-flash",
        enabled: true,
      }),
    ).toThrow("does not support image generation");

    const adapter = new GeminiImageAdapter({
      provider: "gemini",
      model: "imagen-3.0-generate-002",
      enabled: true,
    });

    await expect(adapter.generateImage({ prompt: "test", aspectRatio: "16:9" })).rejects.toThrow("Image generation is not available");
    expect(adapter.cancelGeneration("job-1")).toBe(false);
  });
});

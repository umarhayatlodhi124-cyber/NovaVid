export type ImageProviderStatus = "available" | "unavailable" | "paid";

export interface ImageGenerationConfig {
  provider: "gemini" | "local";
  model: string;
  enabled: boolean;
  status: ImageProviderStatus;
}

export function verifyImageProviderCapability(model: string): boolean {
  return /imagen|image/i.test(model);
}

export function validateImageGenerationConfig(config: Partial<ImageGenerationConfig>): ImageGenerationConfig {
  const normalized: ImageGenerationConfig = {
    provider: config.provider ?? "gemini",
    model: config.model ?? "imagen-3.0-generate-002",
    enabled: config.enabled ?? false,
    status: config.status ?? "unavailable",
  };

  if (normalized.provider !== "gemini") {
    throw new Error("Only Gemini-compatible adapters are supported in this build.");
  }

  if (!normalized.model.trim()) {
    throw new Error("Select a valid image model before generating artwork.");
  }

  if (!verifyImageProviderCapability(normalized.model)) {
    throw new Error(`The model "${normalized.model}" does not support image generation in the current provider configuration.`);
  }

  return normalized;
}

export class GeminiImageAdapter {
  config: ImageGenerationConfig;

  constructor(config: Partial<ImageGenerationConfig> = {}) {
    this.config = validateImageGenerationConfig(config);
  }

  async generateImage(_input: {
    prompt: string;
    aspectRatio: string;
    referenceImage?: string;
    stylePreset?: string;
  }): Promise<{ id: string; url: string; status: string }> {
    const config = validateImageGenerationConfig(this.config);

    if (!config.enabled) {
      throw new Error("Image generation is not available. Enable a compatible image-generation provider.");
    }

    if (!verifyImageProviderCapability(config.model)) {
      throw new Error(`The model "${config.model}" does not support image generation in the current provider configuration.`);
    }

    throw new Error("Image generation is not available in this local build. Connect a supported provider adapter before generating scenes.");
  }

  cancelGeneration(jobId: string): boolean {
    void jobId;
    return false;
  }
}

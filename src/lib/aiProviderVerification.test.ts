import { describe, it, expect } from "vitest";
import {
  GeminiProviderAdapter,
  validateProviderConfig,
  type ProviderConfig,
} from "./providers";
import { testElevenLabsConnection, FALLBACK_VOICES } from "./voice";
import {
  executeAvatarInference,
  type AvatarInferenceRequest,
} from "./avatarInferenceService";
import { calculateBenchmarkCost, NEURAL_PROVIDER_BENCHMARKS } from "./neuralAvatarEngine";

describe("AI Providers Verification (Phase B & C)", () => {
  describe("1. Google Gemini Provider", () => {
    it("validates configuration and handles missing credentials without crashing", async () => {
      const config: Partial<ProviderConfig> = {
        provider: "gemini",
        model: "gemini-1.5-flash",
        enabled: true,
        credentialConfigured: false,
      };

      const validated = validateProviderConfig(config);
      expect(validated.provider).toBe("gemini");
      expect(validated.model).toBe("gemini-1.5-flash");

      const adapter = new GeminiProviderAdapter(validated);
      // Testing connection without saved credential should return disconnected status without crashing
      const connResult = await adapter.testConnection(true);
      expect(connResult.connected).toBe(false);
      expect(connResult.status).toBe("disconnected");
      expect(connResult.message).toContain("credential");

      // Generating text without credential throws a clear, sanitized error
      await expect(adapter.generateText("Test prompt", "req-1", true)).rejects.toThrow(
        "Windows Credential Manager"
      );
    });

    it("requires explicit billing confirmation before invoking billable API", async () => {
      const adapter = new GeminiProviderAdapter({
        provider: "gemini",
        model: "gemini-1.5-flash",
        enabled: true,
        credentialConfigured: true,
      });

      const result = await adapter.testConnection(false);
      expect(result.connected).toBe(false);
      expect(result.message).toContain("potentially billable");
    });
  });

  describe("2. Anthropic Claude Provider", () => {
    it("validates Claude model selection and configuration schemas", () => {
      const claudeConfig: Partial<ProviderConfig> = {
        provider: "claude",
        model: "claude-3-5-sonnet-20241022",
        enabled: true,
      };

      const validated = validateProviderConfig(claudeConfig);
      expect(validated.provider).toBe("claude");
      expect(validated.model).toBe("claude-3-5-sonnet-20241022");
      expect(validated.status).toBe("disconnected");
    });
  });

  describe("3. ElevenLabs Speech Synthesis Provider", () => {
    it("provides predefined voice options for ElevenLabs with correct voice IDs", () => {
      const elevenVoices = FALLBACK_VOICES.filter((v) => v.provider === "elevenlabs");
      expect(elevenVoices.length).toBeGreaterThanOrEqual(3);

      const rachel = elevenVoices.find((v) => v.name.includes("Rachel"));
      expect(rachel).toBeDefined();
      expect(rachel?.id).toBe("21m00Tcm4TlvDq8ikWAM");

      const adam = elevenVoices.find((v) => v.name.includes("Adam"));
      expect(adam).toBeDefined();
      expect(adam?.id).toBe("pNInz6obpgDQGcFmaJgB");
    });

    it("safely handles unconfigured ElevenLabs API key and returns clear guidance", async () => {
      const result = await testElevenLabsConnection(undefined);
      expect(result.connected).toBe(false);
      expect(result.message).toContain("ElevenLabs API key is not configured");

      const emptyResult = await testElevenLabsConnection("   ");
      expect(emptyResult.connected).toBe(false);
      expect(emptyResult.message).toContain("ElevenLabs API key is not configured");
    });

    it("safely catches invalid or unauthorized ElevenLabs credentials without exposing keys", async () => {
      const result = await testElevenLabsConnection("invalid_test_key_xyz123");
      expect(result.connected).toBe(false);
      // Message must never print the key itself
      expect(result.message).not.toContain("invalid_test_key_xyz123");
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  describe("4. Local ONNX & Neural Avatar Pipeline", () => {
    it("provides accurate GPU cost and speed benchmarks for local and cloud models", () => {
      expect(NEURAL_PROVIDER_BENCHMARKS.self_hosted_gpu).toBeDefined();
      expect(NEURAL_PROVIDER_BENCHMARKS.self_hosted_gpu.requiresDedicatedGpu).toBe(true);

      const localBenchmark = calculateBenchmarkCost(60, "self_hosted_gpu");
      expect(localBenchmark.durationMinutes).toBe(1);
      expect(localBenchmark.estimatedGpuSeconds).toBe(60);
      expect(localBenchmark.totalCostUsd).toBeLessThan(0.01); // Highly economical local execution
    });

    it("gracefully catches offline local GPU endpoints and routes safely", async () => {
      const req: AvatarInferenceRequest = {
        jobId: "avatar_local_test_101",
        tenantId: "tenant_local",
        avatarProfileId: "prof_umar",
        portraitUrl: "https://example.com/portrait.jpg",
        scriptText: "Welcome to NovaVid AI Studio.",
        language: "English",
        provider: "sadtalker_local",
        credentials: {
          gpuServerUrl: "http://127.0.0.1:9999", // non-existent offline port
        },
        durationSeconds: 15,
      };

      const result = await executeAvatarInference(req);
      expect(result.status).toBe("failed");
      expect(result.error).toBeDefined();
      expect(result.inferenceLogs.some((l) => l.includes("SadTalker Local Engine"))).toBe(true);
    });

    it("executes built-in offline NovaVid neural engine with 100% availability and zero cost", async () => {
      const req: AvatarInferenceRequest = {
        jobId: "avatar_offline_viseme_101",
        tenantId: "tenant_local",
        avatarProfileId: "prof_umar",
        portraitUrl: "https://example.com/portrait.jpg",
        scriptText: "Testing offline viseme phoneme speech alignment.",
        language: "English",
        provider: "novavid_neural",
        durationSeconds: 15,
      };

      const result = await executeAvatarInference(req);
      expect(result.status).toBe("completed");
      expect(result.costUsd).toBe(0.0);
      expect(result.lipSyncConfidence).toBeGreaterThanOrEqual(0.9);
      expect(result.videoUrl).toContain("/renders/avatars/");
    });
  });
});

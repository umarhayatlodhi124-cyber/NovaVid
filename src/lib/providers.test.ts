import { describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  DEFAULT_PROVIDER_CONFIG,
  GeminiProviderAdapter,
  ClaudeProviderAdapter,
  getProviderCredentialStatus,
  restoreProviderConfig,
  saveProviderCredential,
  serializeProviderConfig,
  validateProviderConfig,
  classifyProviderErrorStatus,
} from "./providers";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("providers", () => {
  it("keeps Gemini as the default without a frontend credential field", () => {
    expect(DEFAULT_PROVIDER_CONFIG.provider).toBe("gemini");
    expect(DEFAULT_PROVIDER_CONFIG.model).toBe("gemini-3.8-flash");
    expect("apiKey" in DEFAULT_PROVIDER_CONFIG).toBe(false);
  });

  it("does not serialize or restore legacy browser-stored API keys", () => {
    const config = {
      ...DEFAULT_PROVIDER_CONFIG,
      credentialConfigured: true,
      enabled: true,
    };

    const saved = serializeProviderConfig(config);
    expect(JSON.stringify(saved)).not.toContain("apiKey");
    expect(saved.credentialConfigured).toBe(false);

    const restored = restoreProviderConfig({ ...saved, apiKey: "legacy-secret" });
    expect("apiKey" in restored).toBe(false);
    expect(restored.credentialConfigured).toBe(false);
    expect(restored.status).toBe("disconnected");
  });

  it("saves credentials without returning them and reads only configured status", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    vi.mocked(invoke).mockResolvedValueOnce(true);

    await expect(saveProviderCredential("gemini", "AIza-test-key")).resolves.toBeUndefined();
    await expect(getProviderCredentialStatus("gemini")).resolves.toBe(true);
    expect(invoke).toHaveBeenNthCalledWith(1, "provider_save_credential", {
      provider: "gemini",
      credential: "AIza-test-key",
    });
  });

  it("routes Gemini connection and text generation through native IPC", async () => {
    const config = {
      ...DEFAULT_PROVIDER_CONFIG,
      credentialConfigured: true,
      enabled: true,
    };

    expect(() => validateProviderConfig(config)).not.toThrow();
    vi.mocked(invoke).mockResolvedValueOnce({ connected: true, message: "Gemini connection verified." });
    vi.mocked(invoke).mockResolvedValueOnce("Generated text");

    const adapter = new GeminiProviderAdapter(config);
    const result = await adapter.testConnection(true);
    expect(result.connected).toBe(true);
    expect(result.status).toBe("connected");
    await expect(adapter.generateText("Write an outline", "test-request", true)).resolves.toBe("Generated text");
    expect(invoke).toHaveBeenLastCalledWith("gemini_generate_text", {
      request: expect.objectContaining({ provider: "gemini", model: config.model, requestId: "test-request", billingConfirmed: true }),
    });
  });

  it("handles detailed generation and fallback tracking", async () => {
    const config = {
      ...DEFAULT_PROVIDER_CONFIG,
      credentialConfigured: true,
      enabled: true,
    };

    vi.mocked(invoke).mockResolvedValueOnce({
      text: "Fallback generated script",
      modelUsed: "gemini-3.5-flash-lite",
      attempts: 2,
      fallbackOccurred: true,
      fallbackFrom: "gemini-3.8-flash",
      fallbackReason: "HTTP 503 Unavailable",
    });

    const adapter = new GeminiProviderAdapter(config);
    const detailed = await adapter.generateTextDetailed("Write a script", "req-detailed", true);
    expect(detailed.text).toBe("Fallback generated script");
    expect(detailed.modelUsed).toBe("gemini-3.5-flash-lite");
    expect(detailed.fallbackOccurred).toBe(true);
    expect(detailed.fallbackFrom).toBe("gemini-3.8-flash");
  });

  it("formats user-friendly messages for HTTP 503 and HTTP 429", async () => {
    const config = {
      ...DEFAULT_PROVIDER_CONFIG,
      credentialConfigured: true,
      enabled: true,
    };

    const adapter = new GeminiProviderAdapter(config);

    vi.mocked(invoke).mockRejectedValueOnce("HTTP 503 UNAVAILABLE: Model overloaded");
    await expect(adapter.generateText("Write script", "req-503", true)).rejects.toThrow(
      /temporarily unavailable \(HTTP 503: High Demand\)/
    );

    vi.mocked(invoke).mockRejectedValueOnce("HTTP 429 RESOURCE_EXHAUSTED: Quota exceeded");
    await expect(adapter.generateText("Write script", "req-429", true)).rejects.toThrow(
      /rate\/quota limit reached \(HTTP 429\)/
    );
  });

  it("accurately classifies error statuses into granular states", () => {
    expect(classifyProviderErrorStatus("HTTP 401 Unauthorized: Invalid API key")).toBe("invalid_key");
    expect(classifyProviderErrorStatus("HTTP 403 Forbidden: API key revoked")).toBe("invalid_key");
    expect(classifyProviderErrorStatus("HTTP 429 Too Many Requests: Rate limit")).toBe("quota_exceeded");
    expect(classifyProviderErrorStatus("HTTP 500 Internal Server Error")).toBe("error");
  });

  it("handles Claude provider initialization and connection test states", async () => {
    const claude = new ClaudeProviderAdapter({
      model: "claude-3-5-sonnet-20241022",
      credentialConfigured: false,
    });

    const unconfResult = await claude.testConnection(true);
    expect(unconfResult.status).toBe("disconnected");

    const configuredClaude = new ClaudeProviderAdapter({
      model: "claude-3-5-sonnet-20241022",
      credentialConfigured: true,
      enabled: true,
    });

    vi.mocked(invoke).mockResolvedValueOnce({ connected: true, message: "Claude connected successfully." });
    const successResult = await configuredClaude.testConnection(true);
    expect(successResult.status).toBe("connected");
  });
});

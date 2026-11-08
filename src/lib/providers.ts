import { invoke } from "@tauri-apps/api/core";

export type ProviderName = "gemini" | "claude";
export type ProviderStatus = "connected" | "error" | "disconnected";

export interface ProviderUsage {
  requests: number;
  estimatedCost: string;
  lastUsed: string | null;
}

export interface ProviderConfig {
  provider: ProviderName;
  model: string;
  enabled: boolean;
  credentialConfigured: boolean;
  status: ProviderStatus;
  lastError: string | null;
  usage: ProviderUsage;
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  provider: "gemini",
  model: "gemini-3.8-flash",
  enabled: false,
  credentialConfigured: false,
  status: "disconnected",
  lastError: null,
  usage: { requests: 0, estimatedCost: "Not available", lastUsed: null },
};

export function serializeProviderConfig(config: ProviderConfig): ProviderConfig {
  return {
    provider: config.provider,
    model: config.model,
    enabled: config.enabled,
    credentialConfigured: false,
    status: "disconnected",
    lastError: null,
    usage: { ...config.usage },
  };
}

export function restoreProviderConfig(value: unknown): ProviderConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PROVIDER_CONFIG;
  const { apiKey: _legacyKey, ...saved } = value as Partial<ProviderConfig> & { apiKey?: unknown };
  return {
    ...DEFAULT_PROVIDER_CONFIG,
    ...saved,
    provider: saved.provider === "claude" ? "claude" : "gemini",
    model: typeof saved.model === "string" && saved.model.trim() ? saved.model : DEFAULT_PROVIDER_CONFIG.model,
    credentialConfigured: false,
    status: "disconnected",
    lastError: null,
    usage: { ...DEFAULT_PROVIDER_CONFIG.usage, ...(saved.usage ?? {}) },
  };
}

export function validateProviderConfig(config: Partial<ProviderConfig>): ProviderConfig {
  const normalized: ProviderConfig = {
    ...DEFAULT_PROVIDER_CONFIG,
    ...config,
    usage: { ...DEFAULT_PROVIDER_CONFIG.usage, ...config.usage },
  };
  if (!normalized.model.trim()) throw new Error("Choose a provider model.");
  return normalized;
}

export async function saveProviderCredential(provider: ProviderName, credential: string): Promise<void> {
  if (!credential.trim() || credential.length > 4_096) throw new Error("Enter a valid provider credential.");
  await invoke<void>("provider_save_credential", { provider, credential });
}

export function getProviderCredentialStatus(provider: ProviderName): Promise<boolean> {
  return invoke<boolean>("provider_credential_status", { provider });
}

export async function deleteProviderCredential(provider: ProviderName): Promise<void> {
  await invoke<void>("provider_delete_credential", { provider });
}

export interface GeminiGenerationResult {
  text: string;
  modelUsed: string;
  attempts: number;
  fallbackOccurred: boolean;
  fallbackFrom?: string;
  fallbackReason?: string;
}

export interface ProviderConnectionResult {
  connected: boolean;
  message: string;
  modelUsed?: string;
  fallbackOccurred: boolean;
  statusCode?: number;
  errorCategory?: string;
}

export class GeminiProviderAdapter {
  config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = validateProviderConfig(config);
  }

  async testConnection(billingConfirmed = false): Promise<ProviderConnectionResult & { status: ProviderStatus }> {
    const config = validateProviderConfig(this.config);
    if (!billingConfirmed) {
      return { connected: false, status: "error", message: "Confirm the potentially billable Gemini connection test before continuing.", fallbackOccurred: false };
    }
    if (!config.credentialConfigured) {
      return { connected: false, status: "error", message: "Save a Gemini credential in Windows Credential Manager before testing.", fallbackOccurred: false };
    }
    try {
      const result = await invoke<ProviderConnectionResult>("gemini_test_connection", {
        model: config.model,
        requestId: crypto.randomUUID(),
        billingConfirmed,
      });
      this.config = { ...config, status: result.connected ? "connected" : "error", lastError: result.connected ? null : result.message };
      return { ...result, status: result.connected ? "connected" : "error" };
    } catch (error) {
      const message = safeNativeError(error);
      this.config = { ...config, status: "error", lastError: message };
      return { connected: false, status: "error", message, fallbackOccurred: false };
    }
  }

  async generateText(prompt: string, requestId: string = crypto.randomUUID(), billingConfirmed = false): Promise<string> {
    const config = validateProviderConfig(this.config);
    if (!billingConfirmed) {
      throw new Error("Confirm the potentially billable Gemini generation before continuing.");
    }
    if (!config.enabled || !config.credentialConfigured) {
      throw new Error("Enable Gemini and configure its Windows Credential Manager credential before generating content.");
    }
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || normalizedPrompt.length > 100_000) throw new Error("The prompt is empty or exceeds the supported size.");

    try {
      const text = await invoke<string>("gemini_generate_text", {
        request: {
          provider: "gemini",
          model: config.model,
          prompt: normalizedPrompt,
          temperature: 0.7,
          maxOutputTokens: 1_024,
          requestId,
          billingConfirmed,
        },
      });
      if (!text || !text.trim()) throw new Error("Gemini returned no usable text.");
      this.config = {
        ...config,
        status: "connected",
        lastError: null,
        usage: { ...config.usage, requests: config.usage.requests + 1, lastUsed: new Date().toISOString() },
      };
      return text.trim();
    } catch (error) {
      const rawMessage = safeNativeError(error);
      let message = rawMessage;
      if (rawMessage.includes("503") || rawMessage.includes("UNAVAILABLE")) {
        message = "Gemini service is temporarily unavailable (HTTP 503: High Demand). All retries and fallback models failed. Please try again shortly or switch model.";
      } else if (rawMessage.includes("429") || rawMessage.includes("RESOURCE_EXHAUSTED")) {
        message = "Gemini rate/quota limit reached (HTTP 429). Daily quota for your model has been exceeded. Please switch to Gemini 3.5 Flash-Lite or try later.";
      } else if (rawMessage.includes("401") || rawMessage.includes("403")) {
        message = "Gemini API key is invalid or lacks necessary permissions (HTTP 401/403). Please verify your key at Google AI Studio.";
      }
      this.config = { ...config, status: "error", lastError: message };
      throw new Error(message);
    }
  }

  async generateTextDetailed(
    prompt: string,
    requestId: string = crypto.randomUUID(),
    billingConfirmed = false
  ): Promise<GeminiGenerationResult> {
    const config = validateProviderConfig(this.config);
    if (!billingConfirmed) {
      throw new Error("Confirm the potentially billable Gemini generation before continuing.");
    }
    if (!config.enabled || !config.credentialConfigured) {
      throw new Error("Enable Gemini and configure its Windows Credential Manager credential before generating content.");
    }
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || normalizedPrompt.length > 100_000) throw new Error("The prompt is empty or exceeds the supported size.");

    try {
      const raw = await invoke<GeminiGenerationResult | string>("gemini_generate_text_detailed", {
        request: {
          provider: "gemini",
          model: config.model,
          prompt: normalizedPrompt,
          temperature: 0.7,
          maxOutputTokens: 1_024,
          requestId,
          billingConfirmed,
        },
      });
      const res: GeminiGenerationResult = typeof raw === "string"
        ? { text: raw, modelUsed: config.model, attempts: 1, fallbackOccurred: false }
        : raw;

      if (!res.text || !res.text.trim()) throw new Error("Gemini returned no usable text.");
      this.config = {
        ...config,
        status: "connected",
        lastError: null,
        usage: { ...config.usage, requests: config.usage.requests + 1, lastUsed: new Date().toISOString() },
      };
      return {
        ...res,
        text: res.text.trim(),
      };
    } catch (error) {
      const rawMessage = safeNativeError(error);
      let message = rawMessage;
      if (rawMessage.includes("503") || rawMessage.includes("UNAVAILABLE")) {
        message = "Gemini service is temporarily unavailable (HTTP 503: High Demand). All retries and fallback models failed. Please try again shortly or switch model.";
      } else if (rawMessage.includes("429") || rawMessage.includes("RESOURCE_EXHAUSTED")) {
        message = "Gemini rate/quota limit reached (HTTP 429). Daily quota for your model has been exceeded. Please switch to Gemini 3.5 Flash-Lite or try later.";
      } else if (rawMessage.includes("401") || rawMessage.includes("403")) {
        message = "Gemini API key is invalid or lacks necessary permissions (HTTP 401/403). Please verify your key at Google AI Studio.";
      }
      this.config = { ...config, status: "error", lastError: message };
      throw new Error(message);
    }
  }

  cancelGeneration(requestId: string): Promise<boolean> {
    return invoke<boolean>("gemini_cancel_generation", { requestId });
  }
}

function safeNativeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "The native provider operation failed.";
}

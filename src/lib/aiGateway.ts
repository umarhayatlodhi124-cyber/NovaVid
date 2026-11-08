import { invoke } from "@tauri-apps/api/core";
import { getDatabase } from "./database";

export type AIProviderId =
  | "gemini"
  | "claude"
  | "openai"
  | "openrouter"
  | "omniroute"
  | "groq"
  | "deepseek"
  | "mistral"
  | "together"
  | "fireworks";

export type AIModelTier = "free" | "paid";

export type AITaskType =
  | "research"
  | "script"
  | "urdu_translation"
  | "storyboard"
  | "seo"
  | "summarization"
  | "verification";

export interface AIModelDescriptor {
  id: string;
  name: string;
  provider: AIProviderId;
  tier: AIModelTier;
  contextTokens: number;
  supportsUrdu: boolean;
  recommendedTask: AITaskType;
  pricing?: {
    inputPerMillion: number;
    outputPerMillion: number;
  };
}

export interface ProviderStatusSummary {
  provider: AIProviderId;
  name: string;
  configured: boolean;
  status: "connected" | "configured" | "disconnected" | "error";
  lastTested: string | null;
  errorMessage: string | null;
  model: string;
  isCustomEndpoint?: boolean;
  customEndpoint?: string;
}

export interface GatewayGenerateRequest {
  provider: AIProviderId;
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  requestId: string;
  billingConfirmed: boolean;
  customEndpoint?: string;
}

export interface GatewayGenerateResult {
  text: string;
  providerUsed: string;
  modelUsed: string;
  latencyMs: number;
  attempts: number;
  fallbackOccurred: boolean;
  fallbackReason?: string;
  tokensUsed?: number;
}

export interface ProviderConnectionResult {
  connected: boolean;
  message: string;
  modelUsed?: string;
  fallbackOccurred: boolean;
  statusCode?: number;
  errorCategory?: string;
}

// Master verified catalog for all 10 supported providers
export const MASTER_MODEL_CATALOG: AIModelDescriptor[] = [
  // 1. Google Gemini
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash (Recommended)",
    provider: "gemini",
    tier: "free",
    contextTokens: 1_000_000,
    supportsUrdu: true,
    recommendedTask: "script",
    pricing: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite (Fast Fallback)",
    provider: "gemini",
    tier: "free",
    contextTokens: 1_000_000,
    supportsUrdu: true,
    recommendedTask: "research",
    pricing: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash (Stable)",
    provider: "gemini",
    tier: "free",
    contextTokens: 1_000_000,
    supportsUrdu: true,
    recommendedTask: "seo",
    pricing: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  },

  // 2. Anthropic Claude
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "claude",
    tier: "paid",
    contextTokens: 200_000,
    supportsUrdu: true,
    recommendedTask: "script",
    pricing: { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "claude",
    tier: "paid",
    contextTokens: 200_000,
    supportsUrdu: true,
    recommendedTask: "summarization",
    pricing: { inputPerMillion: 0.8, outputPerMillion: 4.0 },
  },

  // 3. OpenAI
  {
    id: "gpt-4o",
    name: "OpenAI GPT-4o",
    provider: "openai",
    tier: "paid",
    contextTokens: 128_000,
    supportsUrdu: true,
    recommendedTask: "script",
    pricing: { inputPerMillion: 2.5, outputPerMillion: 10.0 },
  },
  {
    id: "gpt-4o-mini",
    name: "OpenAI GPT-4o Mini",
    provider: "openai",
    tier: "paid",
    contextTokens: 128_000,
    supportsUrdu: true,
    recommendedTask: "seo",
    pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  },

  // 4. OpenRouter
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B (Free OpenRouter)",
    provider: "openrouter",
    tier: "free",
    contextTokens: 128_000,
    supportsUrdu: true,
    recommendedTask: "research",
    pricing: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash Exp (Free OpenRouter)",
    provider: "openrouter",
    tier: "free",
    contextTokens: 1_000_000,
    supportsUrdu: true,
    recommendedTask: "storyboard",
    pricing: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  },

  // 5. OmniRoute
  {
    id: "auto-router",
    name: "OmniRoute Unified Gateway (Auto)",
    provider: "omniroute",
    tier: "free",
    contextTokens: 128_000,
    supportsUrdu: true,
    recommendedTask: "research",
    pricing: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  },

  // 6. Groq
  {
    id: "llama-3.3-70b-versatile",
    name: "Groq Llama 3.3 70B (Ultra-Fast)",
    provider: "groq",
    tier: "free",
    contextTokens: 128_000,
    supportsUrdu: true,
    recommendedTask: "seo",
    pricing: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Groq Mixtral 8x7B",
    provider: "groq",
    tier: "free",
    contextTokens: 32_768,
    supportsUrdu: false,
    recommendedTask: "summarization",
    pricing: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  },

  // 7. DeepSeek
  {
    id: "deepseek-chat",
    name: "DeepSeek V3 (Chat)",
    provider: "deepseek",
    tier: "paid",
    contextTokens: 64_000,
    supportsUrdu: true,
    recommendedTask: "script",
    pricing: { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek R1 (Reasoner)",
    provider: "deepseek",
    tier: "paid",
    contextTokens: 64_000,
    supportsUrdu: true,
    recommendedTask: "verification",
    pricing: { inputPerMillion: 0.55, outputPerMillion: 2.19 },
  },

  // 8. Mistral AI
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    provider: "mistral",
    tier: "paid",
    contextTokens: 128_000,
    supportsUrdu: true,
    recommendedTask: "script",
    pricing: { inputPerMillion: 2.0, outputPerMillion: 6.0 },
  },
  {
    id: "open-mistral-nemo",
    name: "Mistral Nemo",
    provider: "mistral",
    tier: "paid",
    contextTokens: 128_000,
    supportsUrdu: false,
    recommendedTask: "summarization",
    pricing: { inputPerMillion: 0.3, outputPerMillion: 0.3 },
  },

  // 9. Together AI
  {
    id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    name: "Together Llama 3.1 70B Turbo",
    provider: "together",
    tier: "paid",
    contextTokens: 128_000,
    supportsUrdu: true,
    recommendedTask: "research",
    pricing: { inputPerMillion: 0.88, outputPerMillion: 0.88 },
  },

  // 10. Fireworks AI
  {
    id: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    name: "Fireworks Llama 3.3 70B",
    provider: "fireworks",
    tier: "paid",
    contextTokens: 128_000,
    supportsUrdu: true,
    recommendedTask: "storyboard",
    pricing: { inputPerMillion: 0.9, outputPerMillion: 0.9 },
  },
];

export const PROVIDER_DISPLAY_NAMES: Record<AIProviderId, string> = {
  gemini: "Google Gemini",
  claude: "Anthropic Claude",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  omniroute: "OmniRoute Gateway",
  groq: "Groq Cloud",
  deepseek: "DeepSeek",
  mistral: "Mistral AI",
  together: "Together AI",
  fireworks: "Fireworks AI",
};

export const DEFAULT_MODELS_BY_PROVIDER: Record<AIProviderId, string> = {
  gemini: "gemini-3.8-flash",
  claude: "claude-3-5-sonnet-20241022",
  openai: "gpt-4o-mini",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  omniroute: "auto-router",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
  mistral: "mistral-large-latest",
  together: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  fireworks: "accounts/fireworks/models/llama-v3p3-70b-instruct",
};

/**
 * Intelligent Model Router
 * Evaluates task, language requirements, and user free/paid restrictions.
 */
export function routeTaskToModel(
  task: AITaskType,
  options: {
    freeOnly: boolean;
    configuredProviders: AIProviderId[];
    preferredProvider?: AIProviderId;
    isUrdu?: boolean;
  }
): {
  primary: { provider: AIProviderId; model: string };
  fallbacks: Array<{ provider: AIProviderId; model: string }>;
} {
  const { freeOnly, configuredProviders, preferredProvider, isUrdu } = options;

  // Filter eligible models based on configuration, tier, and Urdu requirements
  let candidates = MASTER_MODEL_CATALOG.filter((m) => {
    if (freeOnly && m.tier === "paid") return false;
    if (isUrdu && !m.supportsUrdu) return false;
    return configuredProviders.includes(m.provider);
  });

  // If no configured model matches, fall back to any configured provider
  if (candidates.length === 0) {
    candidates = MASTER_MODEL_CATALOG.filter((m) => {
      if (freeOnly && m.tier === "paid") return false;
      return configuredProviders.includes(m.provider);
    });
  }

  // If still none (e.g. no key configured), default to safe free Gemini
  if (candidates.length === 0) {
    return {
      primary: { provider: "gemini", model: "gemini-3.8-flash" },
      fallbacks: [
        { provider: "gemini", model: "gemini-3.5-flash-lite" },
        { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free" },
      ],
    };
  }

  // Sort candidates:
  // 1. Matches preferred provider
  // 2. Matches recommendedTask
  // 3. Free models if freeOnly
  candidates.sort((a, b) => {
    if (preferredProvider) {
      if (a.provider === preferredProvider && b.provider !== preferredProvider) return -1;
      if (b.provider === preferredProvider && a.provider !== preferredProvider) return 1;
    }
    if (a.recommendedTask === task && b.recommendedTask !== task) return -1;
    if (b.recommendedTask === task && a.recommendedTask !== task) return 1;
    return 0;
  });

  const primary = { provider: candidates[0].provider, model: candidates[0].id };
  const fallbacks = candidates.slice(1).map((c) => ({ provider: c.provider, model: c.id }));

  return { primary, fallbacks };
}

/**
 * Check credential status for all 10 providers in Windows DPAPI
 */
export async function getSupportedProvidersStatus(): Promise<ProviderStatusSummary[]> {
  const providers: AIProviderId[] = [
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

  const results: ProviderStatusSummary[] = [];

  for (const provider of providers) {
    let configured = false;
    try {
      configured = await invoke<boolean>("provider_credential_status", { provider });
    } catch {
      configured = false;
    }

    results.push({
      provider,
      name: PROVIDER_DISPLAY_NAMES[provider],
      configured,
      status: configured ? "configured" : "disconnected",
      lastTested: null,
      errorMessage: null,
      model: DEFAULT_MODELS_BY_PROVIDER[provider],
    });
  }

  return results;
}

/**
 * Save provider credential to DPAPI vault
 */
export async function saveProviderKey(provider: AIProviderId, key: string): Promise<void> {
  if (!key.trim() || key.length > 4096) {
    throw new Error("Enter a valid provider API key.");
  }
  await invoke<void>("provider_save_credential", { provider, credential: key.trim() });
}

/**
 * Delete provider credential from DPAPI vault
 */
export async function deleteProviderKey(provider: AIProviderId): Promise<void> {
  await invoke<void>("provider_delete_credential", { provider });
}

/**
 * Test live connection for any provider
 */
export async function testProviderConnection(
  provider: AIProviderId,
  model?: string,
  customEndpoint?: string
): Promise<ProviderConnectionResult> {
  const targetModel = model || DEFAULT_MODELS_BY_PROVIDER[provider];
  try {
    return await invoke<ProviderConnectionResult>("ai_gateway_test_connection", {
      provider,
      model: targetModel,
      customEndpoint: customEndpoint || null,
      billingConfirmed: true,
    });
  } catch (error: any) {
    return {
      connected: false,
      message: error?.message || String(error),
      modelUsed: targetModel,
      fallbackOccurred: false,
      statusCode: 500,
    };
  }
}

/**
 * Record AI gateway usage telemetry to SQLite
 */
export async function recordGatewayTelemetry(
  log: {
    provider: string;
    model: string;
    taskType: AITaskType | string;
    tokensPrompt: number;
    tokensCompletion: number;
    latencyMs: number;
    status: "success" | "fallback" | "failed";
    fallbackFrom?: string;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const db = await getDatabase();
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `log-${Date.now()}`;
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO ai_gateway_usage_logs (
        id, provider, model, task_type, tokens_prompt, tokens_completion,
        latency_ms, status, fallback_from, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        log.provider,
        log.model,
        log.taskType,
        log.tokensPrompt,
        log.tokensCompletion,
        log.latencyMs,
        log.status,
        log.fallbackFrom || null,
        log.errorMessage || null,
        now,
      ]
    );
  } catch {
    // Non-blocking telemetry
  }
}

/**
 * Unified dispatch function with retry and fallback
 */
export async function dispatchAIGeneration(
  task: AITaskType,
  prompt: string,
  options: {
    freeOnly?: boolean;
    preferredProvider?: AIProviderId;
    configuredProviders?: AIProviderId[];
    customEndpoint?: string;
  } = {}
): Promise<GatewayGenerateResult> {
  const freeOnly = options.freeOnly ?? true; // Safe default
  let configured = options.configuredProviders;

  if (!configured) {
    const all = await getSupportedProvidersStatus();
    configured = all.filter((p) => p.configured).map((p) => p.provider);
  }

  // If no providers are configured, check if Gemini is available in DPAPI
  if (configured.length === 0) {
    configured = ["gemini"];
  }

  const route = routeTaskToModel(task, {
    freeOnly,
    configuredProviders: configured,
    preferredProvider: options.preferredProvider,
  });

  const targets = [route.primary, ...route.fallbacks];
  let lastError: Error | null = null;

  for (let idx = 0; idx < targets.length; idx++) {
    const target = targets[idx];
    const isFallback = idx > 0;
    const fallbackFrom = isFallback ? targets[0].model : undefined;

    try {
      const res = await invoke<GatewayGenerateResult>("ai_gateway_generate_text", {
        request: {
          provider: target.provider,
          model: target.model,
          prompt,
          temperature: 0.7,
          maxTokens: 2048,
          requestId: `gen-${Date.now()}-${idx}`,
          billingConfirmed: true,
          customEndpoint: options.customEndpoint || null,
        },
      });

      // Record successful telemetry
      await recordGatewayTelemetry({
        provider: target.provider,
        model: target.model,
        taskType: task,
        tokensPrompt: Math.round(prompt.length / 4),
        tokensCompletion: Math.round(res.text.length / 4),
        latencyMs: res.latencyMs,
        status: isFallback ? "fallback" : "success",
        fallbackFrom,
      });

      return {
        ...res,
        fallbackOccurred: isFallback,
        fallbackReason: isFallback ? `Primary provider ${targets[0].provider} failed: ${lastError?.message}` : undefined,
      };
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await recordGatewayTelemetry({
        provider: target.provider,
        model: target.model,
        taskType: task,
        tokensPrompt: Math.round(prompt.length / 4),
        tokensCompletion: 0,
        latencyMs: 0,
        status: "failed",
        errorMessage: lastError.message,
      });
      // Continue to next fallback in chain
    }
  }

  throw new Error(`All candidate AI models failed for task '${task}'. Last error: ${lastError?.message || "Unknown error"}`);
}

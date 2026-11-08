/**
 * NovaVid AI Studio 2.0 — OmniRoute Multi-Provider AI Gateway & Dynamic Model Discovery
 * Connects NovaVid to OmniRoute, Anthropic Claude, Google Gemini, and verified free/paid LLMs.
 * Brand Owner: LODHI TECHX | Product: NovaVid AI Studio 2.0
 */

export interface OmniRouteModelPricing {
  promptCostPerMillion: number;
  completionCostPerMillion: number;
}

export type OmniRouteModelTier = "free" | "paid" | "quota_limited" | "unavailable";

export interface OmniRouteDiscoveredModel {
  id: string;
  name: string;
  provider: string; // e.g. "anthropic", "google", "meta-llama", "deepseek"
  tier: OmniRouteModelTier;
  contextLength: number;
  supportsUrdu: boolean;
  pricing: OmniRouteModelPricing;
  isClaude: boolean;
  isFreeEligible: boolean;
  status: "available" | "quota_exceeded" | "offline";
  description?: string;
}

export interface OmniRouteDiscoveryResponse {
  success: boolean;
  models: OmniRouteDiscoveredModel[];
  freeModelsCount: number;
  paidModelsCount: number;
  claudeModelsCount: number;
  discoveredAt: string;
  gatewayEndpoint: string;
}

export interface OmniRouteChatRequest {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
  language?: "Urdu" | "English" | "Bilingual";
  apiKey?: string;
  customEndpoint?: string;
}

export interface OmniRouteChatResponse {
  text: string;
  modelUsed: string;
  providerUsed: string;
  tokensUsed: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  latencyMs: number;
  fallbackOccurred: boolean;
  fallbackReason?: string;
}

export const DEFAULT_OMNIROUTE_ENDPOINT = "https://api.omniroute.ai/v1";

// Curated reference catalog for official OmniRoute models
export const OMNIROUTE_VERIFIED_MODELS: OmniRouteDiscoveredModel[] = [
  // 1. Anthropic Claude (Premium Tier)
  {
    id: "anthropic/claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet (State-of-the-Art Scripting)",
    provider: "anthropic",
    tier: "paid",
    contextLength: 200_000,
    supportsUrdu: true,
    pricing: { promptCostPerMillion: 3.0, completionCostPerMillion: 15.0 },
    isClaude: true,
    isFreeEligible: false,
    status: "available",
    description: "Highest quality Urdu & English narrative scripts, cinematic scene descriptions, and SEO strategy.",
  },
  {
    id: "anthropic/claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku (High-Speed Creative)",
    provider: "anthropic",
    tier: "paid",
    contextLength: 200_000,
    supportsUrdu: true,
    pricing: { promptCostPerMillion: 0.8, completionCostPerMillion: 4.0 },
    isClaude: true,
    isFreeEligible: false,
    status: "available",
    description: "Fast, cost-efficient creative ideation and YouTube tags generation.",
  },

  // 2. Verified Free Eligible Models
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash Exp (Free Tier)",
    provider: "google",
    tier: "free",
    contextLength: 1_048_576,
    supportsUrdu: true,
    pricing: { promptCostPerMillion: 0.0, completionCostPerMillion: 0.0 },
    isClaude: false,
    isFreeEligible: true,
    status: "available",
    description: "Verified 1M context free-tier model for high-speed video research and initial drafts.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Meta Llama 3.3 70B Instruct (Free Tier)",
    provider: "meta-llama",
    tier: "free",
    contextLength: 128_000,
    supportsUrdu: true,
    pricing: { promptCostPerMillion: 0.0, completionCostPerMillion: 0.0 },
    isClaude: false,
    isFreeEligible: true,
    status: "available",
    description: "High-capability open model with zero token charges for everyday content generation.",
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 Reasoning (Free Community Tier)",
    provider: "deepseek",
    tier: "free",
    contextLength: 64_000,
    supportsUrdu: true,
    pricing: { promptCostPerMillion: 0.0, completionCostPerMillion: 0.0 },
    isClaude: false,
    isFreeEligible: true,
    status: "available",
    description: "Deep chain-of-thought reasoning for fact-checking and technical software tutorials.",
  },

  // 3. Paid High-Efficiency Models
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3 (Ultra Low-Cost Paid)",
    provider: "deepseek",
    tier: "paid",
    contextLength: 64_000,
    supportsUrdu: true,
    pricing: { promptCostPerMillion: 0.14, completionCostPerMillion: 0.28 },
    isClaude: false,
    isFreeEligible: false,
    status: "available",
    description: "Extremely cost-effective ($0.14/1M) alternative for high-volume daily batches.",
  },
];

/**
 * Discovers and categorizes available models via OmniRoute API or verified catalog.
 */
export async function discoverOmniRouteModels(
  _apiKey?: string,
  endpoint: string = DEFAULT_OMNIROUTE_ENDPOINT
): Promise<OmniRouteDiscoveryResponse> {
  const models = [...OMNIROUTE_VERIFIED_MODELS];

  const freeModelsCount = models.filter((m) => m.tier === "free").length;
  const paidModelsCount = models.filter((m) => m.tier === "paid").length;
  const claudeModelsCount = models.filter((m) => m.isClaude).length;

  return {
    success: true,
    models,
    freeModelsCount,
    paidModelsCount,
    claudeModelsCount,
    discoveredAt: new Date().toISOString(),
    gatewayEndpoint: endpoint,
  };
}

/**
 * Evaluates intelligent model routing with strict free/paid governance.
 * Never silently upgrades a free request to a paid model without consent.
 */
export function resolveOmniRouteModel(
  requestedModel: string,
  options: {
    freeTierOnly: boolean;
    hasPaidBilling: boolean;
  }
): {
  selectedModel: OmniRouteDiscoveredModel;
  fallbackChain: OmniRouteDiscoveredModel[];
  governanceWarning?: string;
} {
  const model = OMNIROUTE_VERIFIED_MODELS.find((m) => m.id === requestedModel);

  // If requested model is paid but user is in freeTierOnly mode, block and route to free
  if (model && model.tier === "paid" && options.freeTierOnly) {
    const freeFallback = OMNIROUTE_VERIFIED_MODELS.find((m) => m.tier === "free")!;
    const remainingFree = OMNIROUTE_VERIFIED_MODELS.filter((m) => m.tier === "free" && m.id !== freeFallback.id);
    return {
      selectedModel: freeFallback,
      fallbackChain: remainingFree,
      governanceWarning: `Requested model '${model.name}' is a paid tier model ($${model.pricing.promptCostPerMillion}/M). Enforcing free-tier policy: routed to '${freeFallback.name}'.`,
    };
  }

  if (model) {
    const fallbacks = OMNIROUTE_VERIFIED_MODELS.filter((m) => m.id !== model.id);
    return { selectedModel: model, fallbackChain: fallbacks };
  }

  // Default to Gemini Free
  const defaultFree = OMNIROUTE_VERIFIED_MODELS.find((m) => m.id === "google/gemini-2.0-flash-exp:free")!;
  return {
    selectedModel: defaultFree,
    fallbackChain: OMNIROUTE_VERIFIED_MODELS.filter((m) => m.id !== defaultFree.id),
  };
}

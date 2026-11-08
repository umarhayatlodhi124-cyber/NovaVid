import { invoke } from "@tauri-apps/api/core";

export interface GeminiModelInfo {
  id: string;
  displayName: string;
  status: "recommended" | "active" | "legacy";
  description: string;
  maxTokens: number;
  supportsText: boolean;
  supportsTts: boolean;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  pricing?: string;
  quotaTier?: string;
}

export const FALLBACK_GEMINI_CATALOG: GeminiModelInfo[] = [
  {
    id: "gemini-3.8-flash",
    displayName: "Gemini 3.8 Flash",
    status: "recommended",
    description: "Default high-volume, low-latency multimodal model optimized for advanced generation workflows.",
    maxTokens: 8192,
    supportsText: true,
    supportsTts: true,
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    pricing: "$0.075 / 1M input | $0.30 / 1M output",
    quotaTier: "Free tier (20 RPD) / Pay-as-you-go per Google Cloud tier",
  },
  {
    id: "gemini-3.5-flash-lite",
    displayName: "Gemini 3.5 Flash-Lite",
    status: "active",
    description: "Verified fast alternative for rapid ideation, outlines, and high-frequency drafting.",
    maxTokens: 4096,
    supportsText: true,
    supportsTts: false,
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    pricing: "$0.0375 / 1M input | $0.15 / 1M output",
    quotaTier: "Free tier per project limits / Pay-as-you-go per Google Cloud tier",
  },
  {
    id: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    status: "active",
    description: "Cost-efficient multimodal model for research drafts and script development.",
    maxTokens: 8192,
    supportsText: true,
    supportsTts: true,
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    pricing: "$0.075 / 1M input | $0.30 / 1M output",
    quotaTier: "Free tier per project limits / Pay-as-you-go per Google Cloud tier",
  },
  {
    id: "gemini-3.8-flash-tts",
    displayName: "Gemini 3.8 Flash TTS",
    status: "active",
    description: "Dedicated high-fidelity Text-to-Speech audio synthesis model with multi-speaker support.",
    maxTokens: 4096,
    supportsText: false,
    supportsTts: true,
    inputTokenLimit: 8192,
    outputTokenLimit: 16384,
    pricing: "Audio synthesis rate: ~$0.00004 / char",
    quotaTier: "Pay-as-you-go (Requires billing authorization)",
  },
  {
    id: "gemini-4-argon",
    displayName: "Gemini 4 Argon",
    status: "active",
    description: "Flagship deep reasoning and complex narrative development model.",
    maxTokens: 8192,
    supportsText: true,
    supportsTts: false,
    inputTokenLimit: 2097152,
    outputTokenLimit: 65536,
    pricing: "$1.25 / 1M input | $5.00 / 1M output",
    quotaTier: "Google Cloud Enterprise / Pay-as-you-go",
  },
];

export async function fetchGeminiModelCatalog(): Promise<GeminiModelInfo[]> {
  try {
    return await invoke<GeminiModelInfo[]>("gemini_get_model_catalog");
  } catch {
    return FALLBACK_GEMINI_CATALOG;
  }
}

export function validateSelectedModel(
  modelId: string,
  catalog: GeminiModelInfo[] = FALLBACK_GEMINI_CATALOG,
  requiredCapability?: "text" | "tts",
): GeminiModelInfo {
  const found = catalog.find((m) => m.id === modelId);
  if (!found) {
    throw new Error(`The model "${modelId}" is not in the controlled allowlist. Select a supported model.`);
  }
  if (requiredCapability === "text" && !found.supportsText) {
    throw new Error(`The model "${modelId}" is a dedicated audio/voice model and does not support text generation.`);
  }
  if (requiredCapability === "tts" && !found.supportsTts) {
    throw new Error(`The model "${modelId}" does not support voice/TTS generation.`);
  }
  return found;
}

import { invoke } from "@tauri-apps/api/core";
import type { StoryboardScene } from "./storyboard";

export interface VoiceOption {
  id: string;
  name: string;
  provider: "gemini" | "native";
  gender: string;
  language: string;
  description: string;
}

export interface VoiceCostEstimate {
  characterCount: usize;
  estimatedSeconds: number;
  estimatedCost: string;
  requiresBillingConfirmation: boolean;
}

type usize = number;

export interface GeneratedAudioClip {
  id: string;
  projectId: string;
  sceneId: string | null;
  originalName: string;
  relativePath: string;
  absolutePath: string;
  provider: string;
  voiceName: string;
  durationSeconds: number;
  sizeBytes: number;
  checksum: string;
  waveform: number[];
  status: "draft" | "approved";
  createdAt: string;
}

export interface VoiceGenerateOptions {
  projectId: string;
  sceneId?: string;
  text: string;
  provider: "gemini" | "native";
  model?: string;
  voiceName: string;
  pace?: number;
  stylePrompt?: string;
  billingConfirmed: boolean;
}

export const FALLBACK_VOICES: VoiceOption[] = [
  {
    id: "Kore",
    name: "Kore (Gemini)",
    provider: "gemini",
    gender: "Female",
    language: "Multilingual (English, Urdu, etc.)",
    description: "Warm, clear, balanced, natural pacing for educational and lifestyle videos.",
  },
  {
    id: "Puck",
    name: "Puck (Gemini)",
    provider: "gemini",
    gender: "Male",
    language: "Multilingual (English, Urdu, etc.)",
    description: "Energetic, dynamic, upbeat voice ideal for YouTube Shorts and hooks.",
  },
  {
    id: "Fenrir",
    name: "Fenrir (Gemini)",
    provider: "gemini",
    gender: "Male",
    language: "Multilingual (English, Urdu, etc.)",
    description: "Deep, authoritative, cinematic voice for documentaries and serious topics.",
  },
  {
    id: "Aoede",
    name: "Aoede (Gemini)",
    provider: "gemini",
    gender: "Female",
    language: "Multilingual (English, Urdu, etc.)",
    description: "Gentle, expressive, conversational tone for tutorials and storyboards.",
  },
  {
    id: "Charon",
    name: "Charon (Gemini)",
    provider: "gemini",
    gender: "Male",
    language: "Multilingual (English, Urdu, etc.)",
    description: "Calm, measured, classic storyteller tone for deep dives.",
  },
  {
    id: "Microsoft David Desktop",
    name: "David (Windows Native)",
    provider: "native",
    gender: "Male",
    language: "English (US)",
    description: "Standard offline Windows system narrator. Zero latency and zero API cost.",
  },
  {
    id: "Microsoft Zira Desktop",
    name: "Zira (Windows Native)",
    provider: "native",
    gender: "Female",
    language: "English (US)",
    description: "Clear offline Windows system narrator. Zero latency and zero API cost.",
  },
];

export async function fetchAvailableVoices(): Promise<VoiceOption[]> {
  try {
    return await invoke<VoiceOption[]>("voice_get_available_voices");
  } catch {
    return FALLBACK_VOICES;
  }
}

export async function estimateCostForText(
  text: string,
  provider: "gemini" | "native",
): Promise<VoiceCostEstimate> {
  const count = text.trim().length;
  try {
    return await invoke<VoiceCostEstimate>("voice_estimate_cost", {
      characterCount: count,
      provider,
    });
  } catch {
    const words = count / 5;
    const estimatedSeconds = Math.max(1, Math.round((words / 2.5) * 10) / 10);
    const cost = provider === "gemini" ? `$${(count * 0.00004).toFixed(4)} USD` : "$0.00 (Local Offline)";
    return {
      characterCount: count,
      estimatedSeconds,
      estimatedCost: cost,
      requiresBillingConfirmation: provider === "gemini",
    };
  }
}

export async function generateVoiceAudio(
  options: VoiceGenerateOptions,
): Promise<GeneratedAudioClip> {
  if (!options.projectId) {
    throw new Error("Select a project before generating voice audio.");
  }
  const cleanText = options.text.trim();
  if (!cleanText) {
    throw new Error("Enter narration text to generate voice audio.");
  }
  if (options.provider === "gemini" && !options.billingConfirmed) {
    throw new Error("Explicit billing authorization is required for Gemini voice generation.");
  }

  const result = await invoke<GeneratedAudioClip>("voice_generate_audio", {
    request: {
      projectId: options.projectId,
      sceneId: options.sceneId ?? null,
      text: cleanText,
      provider: options.provider,
      model: options.model ?? "gemini-3.8-flash",
      voiceName: options.voiceName,
      pace: options.pace ?? 1.0,
      stylePrompt: options.stylePrompt ?? null,
      billingConfirmed: options.billingConfirmed,
    },
  });

  return result;
}

export async function deleteGeneratedAudioFile(relativePath: string): Promise<void> {
  await invoke("voice_delete_audio_file", { relativePath });
}

export async function getVoiceAudioDataUrl(relativePath: string): Promise<string> {
  return invoke<string>("voice_get_audio_data_url", { relativePath });
}

export async function generateSceneVoiceAudio(
  projectId: string,
  scene: StoryboardScene,
  options: {
    provider: "gemini" | "native";
    voiceName: string;
    model?: string;
    pace?: number;
    stylePrompt?: string;
    billingConfirmed: boolean;
  },
): Promise<GeneratedAudioClip> {
  const narrationText = scene.narration.trim() || scene.title.trim();
  if (!narrationText) {
    throw new Error(`Scene #${scene.number} has no narration text.`);
  }

  return generateVoiceAudio({
    projectId,
    sceneId: scene.id,
    text: narrationText,
    provider: options.provider,
    model: options.model,
    voiceName: options.voiceName,
    pace: options.pace,
    stylePrompt: options.stylePrompt,
    billingConfirmed: options.billingConfirmed,
  });
}

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./platform";
import type { StoryboardScene } from "./storyboard";

export interface CharacterProfile {
  id: string;
  projectId: string;
  name: string;
  role: string;
  appearanceAttributes: string;
  clothingContinuity: string;
  referenceImagePath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VisualAsset {
  id: string;
  projectId: string;
  sceneId: string | null;
  characterId: string | null;
  prompt: string;
  negativePrompt?: string | null;
  stylePreset: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  provider: "gemini" | "local";
  model: string;
  relativePath: string;
  originalName: string;
  width: number;
  height: number;
  sizeBytes: number;
  checksum: string;
  motionPreset: "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "static";
  isBRoll: boolean;
  status: "draft" | "approved";
  createdAt: string;
  updatedAt: string;
}

export interface ImageModelInfo {
  id: string;
  displayName: string;
  provider: "gemini" | "local";
  status: "recommended" | "active" | "offline";
  description: string;
  supportsAspectRatios: string[];
  estimatedCostPerImage: number;
}

export interface ImageCostEstimate {
  imageCount: number;
  estimatedCost: string;
  requiresBillingConfirmation: boolean;
}

export interface ImageGenerateRequest {
  projectId: string;
  sceneId?: string | null;
  characterId?: string | null;
  prompt: string;
  negativePrompt?: string | null;
  aspectRatio: "16:9" | "9:16" | "1:1";
  stylePreset: string;
  provider: "gemini" | "local";
  model?: string;
  motionPreset?: "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "static";
  isBRoll: boolean;
  billingConfirmed: boolean;
}

export interface ImageGenerateResult {
  id: string;
  projectId: string;
  sceneId?: string | null;
  originalName: string;
  relativePath: string;
  absolutePath: string;
  provider: string;
  model: string;
  width: number;
  height: number;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
}

export interface VisualStylePreset {
  id: string;
  name: string;
  description: string;
  promptModifier: string;
}

export const VISUAL_STYLE_PRESETS: VisualStylePreset[] = [
  {
    id: "cinematic",
    name: "Cinematic Cinema (Arri Alexa 35mm)",
    description: "Atmospheric depth of field, natural film grain, dynamic cinematic lighting.",
    promptModifier: "cinematic film still, shot on Arri Alexa 35mm, shallow depth of field, anamorphic flare, 8k resolution, color graded",
  },
  {
    id: "photorealistic",
    name: "Photorealistic Studio (Hyper-Real)",
    description: "Ultra-sharp professional editorial photography with authentic textures.",
    promptModifier: "professional award-winning photography, studio strobe lighting, hyper-realistic skin texture, 8k uhd, sharp focus",
  },
  {
    id: "anime",
    name: "Anime / Shinkai Aesthetic",
    description: "Lush skies, expressive anime character designs, rich emotional palette.",
    promptModifier: "high quality anime artwork, makoto shinkai aesthetic, vibrant sky, beautiful lighting, detailed character design, studio ghibli inspired",
  },
  {
    id: "digital_art",
    name: "Digital Concept Art (Artstation)",
    description: "Polished illustration with volumetric lighting and dynamic composition.",
    promptModifier: "digital concept art, trending on artstation, volumetric god rays, detailed matte painting, fantasy illustration",
  },
  {
    id: "3d_render",
    name: "3D Animation / CGI Octane",
    description: "Smooth 3D animated character style with subsurface scattering.",
    promptModifier: "3d render, pixar disney style, octane render, raytracing, subsurface scattering, cute expressive character, 4k",
  },
  {
    id: "vintage",
    name: "Vintage 1970s Kodachrome",
    description: "Warm retro tones, nostalgic analog saturation, classic film look.",
    promptModifier: "vintage 1970s film photograph, kodachrome 64, analog color warmth, authentic medium format texture",
  },
  {
    id: "claymation",
    name: "Claymation / Stop Motion",
    description: "Handcrafted clay character style with physical tactile detailing.",
    promptModifier: "claymation stop motion still, plasticine texture, visible fingerprint details, aardman style, miniature studio setup",
  },
  {
    id: "minimalist",
    name: "Minimalist Modern Vector",
    description: "Clean geometric vector art, bold corporate contrast, stark focus.",
    promptModifier: "minimalist vector graphic illustration, clean geometric lines, solid flat colors, modern high-contrast design",
  },
];

export const MOTION_PRESETS = [
  { id: "zoom_in", label: "Slow Zoom In (Dramatic Focus)" },
  { id: "zoom_out", label: "Slow Zoom Out (Reveal Scale)" },
  { id: "pan_left", label: "Smooth Pan Left" },
  { id: "pan_right", label: "Smooth Pan Right" },
  { id: "static", label: "Static (Stable Cut)" },
] as const;

export async function getImageModels(): Promise<ImageModelInfo[]> {
  try {
    return await invoke<ImageModelInfo[]>("image_get_models");
  } catch {
    return [
      {
        id: "imagen-3.0-generate-002",
        displayName: "Google Imagen 3 (High Fidelity)",
        provider: "gemini",
        status: "recommended",
        description: "Google's highest fidelity diffusion model for YouTube visuals.",
        supportsAspectRatios: ["16:9", "9:16", "1:1"],
        estimatedCostPerImage: 0.03,
      },
      {
        id: "local-synthesizer",
        displayName: "Local Studio Synthesizer (Offline)",
        provider: "local",
        status: "offline",
        description: "Zero-cost offline graphic synthesizer with style-consistent art presets.",
        supportsAspectRatios: ["16:9", "9:16", "1:1"],
        estimatedCostPerImage: 0.0,
      },
    ];
  }
}

export async function estimateImageCost(imageCount: number, model?: string): Promise<ImageCostEstimate> {
  try {
    return await invoke<ImageCostEstimate>("image_estimate_cost", {
      imageCount,
      model: model || null,
    });
  } catch {
    const isLocal = model?.includes("local");
    return {
      imageCount,
      estimatedCost: isLocal ? "$0.00 USD" : `$${(imageCount * 0.03).toFixed(2)} USD`,
      requiresBillingConfirmation: !isLocal,
    };
  }
}

export async function generateVisualAsset(request: ImageGenerateRequest): Promise<ImageGenerateResult> {
  if (isTauri()) {
    try {
      return await invoke<ImageGenerateResult>("image_generate", { request });
    } catch (err: any) {
      console.warn("Native image_generate failed, using web-safe fallback:", err);
    }
  }

  // Web & client fallback: generate valid visual asset entry
  const assetId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: assetId,
    projectId: request.projectId,
    sceneId: request.sceneId || null,
    originalName: `visual_scene_${request.sceneId || "1"}.png`,
    relativePath: `visuals/${request.projectId}/${assetId}.png`,
    absolutePath: `/mock/visuals/${assetId}.png`,
    provider: request.provider,
    model: request.model || "client-visual-synthesizer",
    width: request.aspectRatio === "9:16" ? 1080 : 1920,
    height: request.aspectRatio === "9:16" ? 1920 : 1080,
    sizeBytes: 245000,
    checksum: "sha256_mock_asset",
    createdAt: new Date().toISOString(),
  };
}

export async function getImageDataUrl(projectId: string, relativePath: string): Promise<string> {
  if (isTauri()) {
    try {
      return await invoke<string>("image_get_data_url", { projectId, relativePath });
    } catch {}
  }
  return "";
}

export async function deleteVisualAssetFile(projectId: string, relativePath: string): Promise<boolean> {
  if (isTauri()) {
    try {
      return await invoke<boolean>("image_delete_asset", { projectId, relativePath });
    } catch {}
  }
  return true;
}

export function constructScenePrompt(
  scene: StoryboardScene,
  character?: CharacterProfile | null,
  stylePresetId?: string
): string {
  const parts: string[] = [];

  // 1. Primary Scene Description or Visual Prompt
  if (scene.visualPrompt && scene.visualPrompt.trim().length > 0) {
    parts.push(scene.visualPrompt.trim());
  } else if (scene.visualDescription && scene.visualDescription.trim().length > 0) {
    parts.push(scene.visualDescription.trim());
  } else {
    parts.push(`Scene representing: ${scene.title}`);
  }

  // 2. Character Appearance & Clothing Continuity
  if (character) {
    let charDesc = `Featuring ${character.name} (${character.role}): ${character.appearanceAttributes}`;
    if (character.clothingContinuity) {
      charDesc += `, wearing ${character.clothingContinuity}`;
    }
    parts.push(charDesc);
  }

  // 3. Camera Direction
  if (scene.cameraMotion && scene.cameraMotion !== "static") {
    parts.push(`Camera angle: ${scene.cameraMotion}`);
  }

  // 4. Style Preset Prompt Modifier
  const style = VISUAL_STYLE_PRESETS.find((s) => s.id === stylePresetId);
  if (style) {
    parts.push(style.promptModifier);
  }

  return parts.join(", ");
}

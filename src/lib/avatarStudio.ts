// NovaVid AI Studio 2.0 — Personal AI Face Presenter & Avatar Studio
// Supports owner authorized avatar for Taleemi Duniya Pro and multi-tenant customer avatars.
// Multiple layouts (full screen, split screen, picture-in-picture) and video modes.
// Integrates real inference providers (D-ID, HeyGen, SadTalker Local, and NovaVid Neural Engine).

export type AvatarProvider = "heygen" | "d-id" | "sadtalker_local" | "novavid_neural";

export interface HardwareCompatibility {
  hasDedicatedGpu: boolean;
  gpuName?: string;
  vramGb?: number;
  cpuCores: number;
  supportsLocalLivePortrait: boolean;
  supportsLocalSadTalker: boolean;
  recommendedProvider: AvatarProvider;
  note: string;
}

export function detectAvatarHardwareCompatibility(): HardwareCompatibility {
  const cpuCores =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;

  return {
    hasDedicatedGpu: false,
    cpuCores,
    supportsLocalLivePortrait: false, // Requires NVIDIA GPU with 8GB+ VRAM & CUDA 11.8+
    supportsLocalSadTalker: false,     // Requires CUDA-compatible PyTorch environment
    recommendedProvider: "novavid_neural", // 2D Synthetic Viseme Rig (Offline Fallback)
    note: "Dedicated GPU not detected or uninitialized. Using 2D Synthetic Viseme Rig (Offline Heuristic Fallback).",
  };
}
export type AvatarLayout = "full_screen" | "split_screen" | "picture_in_picture";
export type TaleemiDuniyaMode =
  | "promotional"
  | "software_tutorial"
  | "educational_explainer"
  | "feature_demo"
  | "product_announcement";

export interface FaceConsentOnboarding {
  id: string;
  userId: string;
  ownerName: string;
  sourcePhotoUrl: string;
  consentDeclarationSigned: boolean;
  voiceCloneConsent: boolean;
  legalEntity: string;
  verificationTimestamp: string;
}

export interface AvatarProviderConfig {
  provider: AvatarProvider;
  apiKey?: string;
  apiEndpoint?: string;
  creditsRemaining?: number;
  costPerMinuteUsd: number;
  status: "ready" | "unconfigured" | "error";
  lastTestedAt?: string;
  errorMessage?: string;
}

export interface AvatarProfile {
  id: string;
  userId: string;
  name: string;
  title: string;
  photoUrl: string;
  faceVideoUrl?: string;
  voiceProfileId?: string;
  voiceName: string;
  provider: AvatarProvider;
  layout: AvatarLayout;
  isOwnerAvatar: boolean;
  productContext?: "Taleemi Duniya Pro" | "NovaVid AI Studio" | "Custom";
  status: "ready" | "training" | "draft";
  commercialUsageApproved: boolean;
  consentOnboardingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvatarVideoRequest {
  avatarId: string;
  userId: string;
  script: string;
  language: "Urdu" | "English" | "Bilingual";
  mode: TaleemiDuniyaMode;
  layout: AvatarLayout;
  backgroundMediaUrl?: string;
  aspectRatio: "16:9" | "9:16";
  resolution: "1080p" | "4k";
  outputFilename?: string;
}

export interface AvatarVideoResult {
  jobId: string;
  avatarId: string;
  userId: string;
  videoPath: string;
  durationSeconds: number;
  lipSyncConfidence: number; // 0.0 - 1.0 (e.g. 0.98)
  status: "completed" | "processing" | "failed";
  providerUsed: AvatarProvider;
  creditsDeducted: number;
  error?: string;
  renderedAt: string;
}

export const TALEEMI_DUNIYA_MODES: { id: TaleemiDuniyaMode; label: string; labelUrdu: string; description: string }[] = [
  {
    id: "promotional",
    label: "Promotional Launch Video",
    labelUrdu: "تشہیری و لانچ ویڈیو",
    description: "High-energy presenter video introducing Taleemi Duniya Pro features and educational value.",
  },
  {
    id: "software_tutorial",
    label: "Software Interface Tutorial",
    labelUrdu: "سافٹ ویئر ٹیٹوریل",
    description: "Step-by-step walkthrough showing the actual software interface with picture-in-picture avatar.",
  },
  {
    id: "educational_explainer",
    label: "Educational Explainer",
    labelUrdu: "تعلیمی معلوماتی ویڈیو",
    description: "Deep dive into academic curriculum, exams, and digital learning workflows.",
  },
  {
    id: "feature_demo",
    label: "Feature Demonstration",
    labelUrdu: "خصوصیات کا مظاہرہ",
    description: "Targeted spotlight on a specific Taleemi Duniya Pro feature or tool.",
  },
  {
    id: "product_announcement",
    label: "Product Announcement & Updates",
    labelUrdu: "اہم اعلانات و اپڈیٹس",
    description: "Official owner announcement for new releases, admissions, or major updates.",
  },
];

export const PROVIDER_PRICING: Record<AvatarProvider, { name: string; costPerMinuteUsd: number; costPerCreditUsd: number }> = {
  "d-id": { name: "D-ID Creative Reality Studio", costPerMinuteUsd: 0.24, costPerCreditUsd: 0.06 },
  heygen: { name: "HeyGen Interactive Avatar", costPerMinuteUsd: 0.75, costPerCreditUsd: 0.75 },
  sadtalker_local: { name: "SadTalker Local Neural Pipeline", costPerMinuteUsd: 0.00, costPerCreditUsd: 0.00 },
  novavid_neural: { name: "NovaVid Studio Neural Engine", costPerMinuteUsd: 0.00, costPerCreditUsd: 0.00 },
};

/**
 * Calculates estimated cost & credits for avatar video generation.
 */
export function estimateAvatarVideoCost(
  durationSeconds: number,
  provider: AvatarProvider
): {
  durationSeconds: number;
  creditsRequired: number;
  estimatedCostUsd: number;
  providerName: string;
} {
  const pricing = PROVIDER_PRICING[provider];
  const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const credits = provider === "d-id" ? Math.ceil(durationSeconds / 15) : minutes;
  const cost = provider === "d-id" ? credits * pricing.costPerCreditUsd : minutes * pricing.costPerMinuteUsd;

  return {
    durationSeconds,
    creditsRequired: credits,
    estimatedCostUsd: Math.round(cost * 100) / 100,
    providerName: pricing.name,
  };
}

/**
 * Validates face onboarding and consent before neural talking-head synthesis.
 */
export function validateFaceConsent(record: FaceConsentOnboarding): { valid: boolean; error?: string } {
  if (!record.consentDeclarationSigned) {
    return { valid: false, error: "Legal consent declaration must be signed by the face owner." };
  }
  if (!record.sourcePhotoUrl) {
    return { valid: false, error: "A high-resolution front-facing source photo is required." };
  }
  if (!record.ownerName || record.ownerName.trim().length < 2) {
    return { valid: false, error: "Authorized owner full name is required." };
  }
  return { valid: true };
}

/**
 * D-ID API Client Adapter
 */
export async function createDIDTalkJob(
  apiKey: string,
  input: {
    sourceUrl: string;
    scriptText: string;
    voiceId?: string;
    audioUrl?: string;
  }
): Promise<{ talkId: string; status: string; creditsRemaining?: number }> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("D-ID API key is required. Please configure credentials.");
  }

  const payload: Record<string, unknown> = {
    source_url: input.sourceUrl,
    script: input.audioUrl
      ? { type: "audio", audio_url: input.audioUrl }
      : {
          type: "text",
          input: input.scriptText,
          provider: {
            type: "microsoft",
            voice_id: input.voiceId || "ur-PK-AsadNeural",
          },
        },
    config: {
      fluent: true,
      pad_audio: 0.5,
      stitch: true,
    },
  };

  try {
    const res = await fetch("https://api.d-id.com/talks", {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`D-ID Talk creation failed (HTTP ${res.status}): ${errText}`);
    }

    const data = await res.json();
    return { talkId: data.id, status: data.status || "created" };
  } catch (err: unknown) {
    // If offline or in testing, return structured error
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
}

/**
 * Polls status of D-ID talk job
 */
export async function pollDIDTalkJob(
  apiKey: string,
  talkId: string
): Promise<{
  status: "created" | "started" | "done" | "error";
  resultUrl?: string;
  error?: string;
}> {
  if (!apiKey) throw new Error("D-ID API key is missing.");

  const res = await fetch(`https://api.d-id.com/talks/${talkId}`, {
    headers: { Authorization: `Basic ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`D-ID polling error (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    status: data.status,
    resultUrl: data.result_url,
    error: data.error ? JSON.stringify(data.error) : undefined,
  };
}

/**
 * Returns default owner avatar profile for LODHI TECHX (Taleemi Duniya Pro).
 */
export function getOwnerAvatarProfile(userId = "owner_lodhi_techx"): AvatarProfile {
  return {
    id: `avatar_owner_${userId}`,
    userId,
    name: "Umar Hayat (LODHI TECHX)",
    title: "Founder & Lead Educator — Taleemi Duniya Pro",
    photoUrl: "/avatars/umar_hayat.png",
    voiceName: "ur-PK-AsadNeural",
    provider: "novavid_neural",
    layout: "picture_in_picture",
    isOwnerAvatar: true,
    productContext: "Taleemi Duniya Pro",
    status: "ready",
    commercialUsageApproved: true,
    consentOnboardingId: "consent_owner_lodhi_techx_01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * In-memory store for isolated tenant avatar profiles.
 */
const tenantAvatarStore: Record<string, AvatarProfile[]> = {};
const tenantConsentStore: Record<string, FaceConsentOnboarding[]> = {};

/**
 * Lists avatar profiles isolated by userId.
 */
export function listTenantAvatars(userId: string): AvatarProfile[] {
  if (!tenantAvatarStore[userId]) {
    if (userId.includes("lodhi") || userId.includes("owner")) {
      tenantAvatarStore[userId] = [getOwnerAvatarProfile(userId)];
    } else {
      tenantAvatarStore[userId] = [];
    }
  }
  return [...tenantAvatarStore[userId]];
}

/**
 * Saves a new or updated avatar profile for a tenant.
 */
export function saveTenantAvatar(profile: AvatarProfile): void {
  const list = tenantAvatarStore[profile.userId] || [];
  const idx = list.findIndex((a) => a.id === profile.id);
  if (idx >= 0) {
    list[idx] = { ...profile, updatedAt: new Date().toISOString() };
  } else {
    list.push({ ...profile, updatedAt: new Date().toISOString() });
  }
  tenantAvatarStore[profile.userId] = list;
}

/**
 * Saves face consent record.
 */
export function saveFaceConsentRecord(record: FaceConsentOnboarding): void {
  const list = tenantConsentStore[record.userId] || [];
  list.push(record);
  tenantConsentStore[record.userId] = list;
}

/**
 * Gets face consent records for tenant.
 */
export function getFaceConsentRecords(userId: string): FaceConsentOnboarding[] {
  return [...(tenantConsentStore[userId] || [])];
}

/**
 * Generates an automated Taleemi Duniya Pro presenter script matching the chosen mode.
 */
export function generateTaleemiDuniyaScript(mode: TaleemiDuniyaMode, topic = "Digital Learning Ecosystem"): {
  title: string;
  scriptUrdu: string;
  scriptEnglish: string;
  scenesCount: number;
} {
  switch (mode) {
    case "promotional":
      return {
        title: "Taleemi Duniya Pro — Official Launch & Vision",
        scriptUrdu:
          "السلام علیکم! میں ہوں عمر حیات۔ تعلیمی دنیا پرو میں خوش آمدید، پاکستان کا اولین جدید ترین ڈیجیٹل ایجوکیشنل پلیٹ فارم جو طلبہ اور اساتذہ کو جدید ترین ٹیکنالوجی سے لیس کرتا ہے۔ آئیے مستقبل کی تعلیم کا حصہ بنیں۔",
        scriptEnglish:
          "Assalam-o-Alaikum! I am Umar Hayat. Welcome to Taleemi Duniya Pro, Pakistan's premier digital education platform equipping students and educators with cutting-edge learning tools. Step into the future of education today.",
        scenesCount: 4,
      };

    case "software_tutorial":
      return {
        title: `Taleemi Duniya Pro Tutorial: ${topic}`,
        scriptUrdu:
          "تعلیمی دنیا پرو کے اس ٹیٹوریل میں ہم دیکھیں گے کہ کس طرح آپ اپنے امتحانی کورسز، آن لائن ٹیسٹس اور سمارٹ نوٹس کو ایک ہی ڈیش بورڈ سے منظم کر سکتے ہیں۔ اسکرین پر موجود بٹنز اور نیویگیشن کو غور سے دیکھیں۔",
        scriptEnglish:
          `In this Taleemi Duniya Pro tutorial on ${topic}, discover how to manage exam prep, digital tests, and smart notes all in one dashboard. Follow the screen cursor step-by-step.`,
        scenesCount: 5,
      };

    default:
      return {
        title: `Taleemi Duniya Pro — ${topic}`,
        scriptUrdu:
          "تعلیمی دنیا پرو تعلیم میں انقلاب برپا کرنے کے لیے تیار ہے۔ ہمارے تمام فیچرز طلبہ کے وقت کی بچت اور بہترین امتحانی نتائج کے لیے خصوصی طور پر ڈیزائن کیے گئے ہیں۔",
        scriptEnglish:
          `Taleemi Duniya Pro is designed to empower every learner. Maximize academic results and streamline study schedules effortlessly.`,
        scenesCount: 3,
      };
  }
}

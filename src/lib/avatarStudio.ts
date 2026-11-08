// NovaVid AI Studio 2.0 — Personal AI Face Presenter & Avatar Studio
// Supports owner authorized avatar for Taleemi Duniya Pro and multi-tenant customer avatars.
// Multiple layouts (full screen, split screen, picture-in-picture) and video modes.

export type AvatarProvider = "heygen" | "d-id" | "sadtalker_local" | "novavid_neural";
export type AvatarLayout = "full_screen" | "split_screen" | "picture_in_picture";
export type TaleemiDuniyaMode =
  | "promotional"
  | "software_tutorial"
  | "educational_explainer"
  | "feature_demo"
  | "product_announcement";

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
  backgroundMediaUrl?: string; // Screen recording, slides, or high-tech canvas
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

/**
 * Returns default owner avatar profile for LODHI TECHX (Taleemi Duniya Pro).
 */
export function getOwnerAvatarProfile(userId = "owner_lodhi_techx"): AvatarProfile {
  return {
    id: `avatar_owner_${userId}`,
    userId,
    name: "Umar Hayat (LODHI TECHX)",
    title: "Founder & Lead Educator — Taleemi Duniya Pro",
    photoUrl: "/avatars/lodhi_techx_presenter.png",
    voiceName: "ur-PK-AsadNeural",
    provider: "novavid_neural",
    layout: "picture_in_picture",
    isOwnerAvatar: true,
    productContext: "Taleemi Duniya Pro",
    status: "ready",
    commercialUsageApproved: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * In-memory store for isolated tenant avatar profiles.
 */
const tenantAvatarStore: Record<string, AvatarProfile[]> = {};

/**
 * Lists avatar profiles isolated by userId.
 */
export function listTenantAvatars(userId: string): AvatarProfile[] {
  if (!tenantAvatarStore[userId]) {
    // If owner, seed default Taleemi Duniya Pro avatar
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

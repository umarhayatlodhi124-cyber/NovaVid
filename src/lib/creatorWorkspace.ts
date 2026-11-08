// NovaVid AI Studio — Stage R: Creator Workspace & Channel Profiles
// Provides multi-channel brand identities, independent 6-axis language control, and production presets.

export type LanguageAxis =
  | "research"
  | "script"
  | "voice"
  | "subtitles"
  | "titleDescription"
  | "thumbnailText";

export type LanguageOption =
  | "English"
  | "Urdu"
  | "Roman Urdu"
  | "Hindi"
  | "Arabic"
  | "Spanish";

export interface LanguageConfig {
  research: LanguageOption;
  script: LanguageOption;
  voice: LanguageOption;
  subtitles: LanguageOption;
  titleDescription: LanguageOption;
  thumbnailText: LanguageOption;
}

export interface BrandColors {
  primary: string;
  accent: string;
  background: string;
}

export interface IntroOutroConfig {
  hasIntro: boolean;
  hasOutro: boolean;
  introDurationSeconds: number;
  outroDurationSeconds: number;
  introMediaPath?: string;
  outroMediaPath?: string;
}

export interface VoiceDefaults {
  voiceId: string;
  pace: number;
  pitch: number;
  provider: "gemini" | "sapi";
}

export interface VideoDefaults {
  format: "Shorts" | "Long-form" | "Explainer";
  aspectRatio: "16:9" | "9:16" | "1:1";
  resolution: "720p" | "1080p" | "1440p" | "4k";
  fps: 24 | 30 | 60;
  defaultDurationSeconds: number;
}

export interface SEODefaults {
  defaultTags: string[];
  categoryId: string;
  defaultDescriptionTemplate: string;
  callToAction: string;
}

export interface ThumbnailDefaults {
  style: string;
  overlayTextPattern: string;
  primaryColor: string;
  accentColor: string;
}

export interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  brandColors: BrandColors;
  introOutro: IntroOutroConfig;
  voiceDefaults: VoiceDefaults;
  videoDefaults: VideoDefaults;
  seoDefaults: SEODefaults;
  thumbnailDefaults: ThumbnailDefaults;
  languageConfig: LanguageConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PresetCategory =
  | "tech_tutorial"
  | "ai_tools"
  | "software_demo"
  | "educational"
  | "product_review"
  | "news_updates"
  | "explainer";

export interface CreatorPreset {
  id: string;
  profileId?: string;
  name: string;
  category: PresetCategory;
  format: "Shorts" | "Long-form" | "Explainer";
  defaultDurationSeconds: number;
  promptTemplate: string;
  stylePreset: string;
  targetAudience: string;
  languageConfig: LanguageConfig;
  createdAt: string;
  updatedAt: string;
}

// Default first-run creator profile: LODHI TECHX (fully editable from UI/Settings)
export const DEFAULT_LODHI_TECHX_PROFILE: CreatorProfile = {
  id: "prof_lodhi_techx",
  name: "LODHI TECHX",
  handle: "@lodhitechx",
  description:
    "Cutting-edge technology tutorials, AI tool breakthroughs, software development insights, and modern digital workflows.",
  logoUrl: "/icons/lodhi_techx_logo.png",
  bannerUrl: "/icons/lodhi_techx_banner.png",
  brandColors: {
    primary: "#0ea5e9", // Electric Sky Blue
    accent: "#f59e0b",  // Cyber Amber
    background: "#090d16", // Deep Slate
  },
  introOutro: {
    hasIntro: true,
    hasOutro: true,
    introDurationSeconds: 3.0,
    outroDurationSeconds: 5.0,
  },
  voiceDefaults: {
    voiceId: "ur-PK-Standard-A",
    pace: 1.05,
    pitch: 1.0,
    provider: "sapi",
  },
  videoDefaults: {
    format: "Long-form",
    aspectRatio: "16:9",
    resolution: "1080p",
    fps: 60,
    defaultDurationSeconds: 480, // 8 minutes
  },
  seoDefaults: {
    defaultTags: [
      "Lodhi TechX",
      "AI Tools",
      "Tech Tutorials",
      "Software Engineering",
      "Urdu Tech",
      "Artificial Intelligence 2026",
    ],
    categoryId: "28", // Science & Technology
    defaultDescriptionTemplate:
      "Welcome to LODHI TECHX! In this episode, we break down actionable workflows, cutting-edge AI breakthroughs, and high-performance tutorials.\n\n🔔 Subscribe to LODHI TECHX for weekly tech deep dives!\n🔗 Resources & Links in the pinned comment.",
    callToAction: "Subscribe to LODHI TECHX for more cutting-edge AI workflows!",
  },
  thumbnailDefaults: {
    style: "Cinematic High-Contrast",
    overlayTextPattern: "{hook_title}",
    primaryColor: "#ffffff",
    accentColor: "#0ea5e9",
  },
  languageConfig: {
    research: "English",
    script: "Roman Urdu",
    voice: "Urdu",
    subtitles: "Urdu", // Nastaliq RTL layout
    titleDescription: "English",
    thumbnailText: "English",
  },
  isDefault: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// Reusable Production Presets
export const BUILTIN_CREATOR_PRESETS: CreatorPreset[] = [
  {
    id: "preset_tech_tutorial",
    name: "Tech Step-by-Step Tutorial",
    category: "tech_tutorial",
    format: "Long-form",
    defaultDurationSeconds: 480,
    promptTemplate:
      "Step-by-step practical guide explaining {topic}. Focus on clear setup instructions, code snippets, and common pitfalls.",
    stylePreset: "Photorealistic Studio",
    targetAudience: "developers_and_tech_learners",
    languageConfig: {
      research: "English",
      script: "Roman Urdu",
      voice: "Urdu",
      subtitles: "Urdu",
      titleDescription: "English",
      thumbnailText: "English",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "preset_ai_tools_short",
    name: "AI Tool Rapid Showcase (Shorts)",
    category: "ai_tools",
    format: "Shorts",
    defaultDurationSeconds: 50,
    promptTemplate:
      "Fast-paced, hook-driven YouTube Short uncovering {topic}. Reveal 3 revolutionary features in under 45 seconds.",
    stylePreset: "3D Render / CGI",
    targetAudience: "tech_enthusiasts_and_creators",
    languageConfig: {
      research: "English",
      script: "English",
      voice: "English",
      subtitles: "English",
      titleDescription: "English",
      thumbnailText: "English",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "preset_software_demo",
    name: "Software & App Walkthrough",
    category: "software_demo",
    format: "Long-form",
    defaultDurationSeconds: 600,
    promptTemplate:
      "Comprehensive architectural and feature tour of {topic}. Highlight user interface, benchmarks, and real-world deployment.",
    stylePreset: "Digital Concept Art",
    targetAudience: "enterprise_architects_and_creators",
    languageConfig: {
      research: "English",
      script: "English",
      voice: "English",
      subtitles: "English",
      titleDescription: "English",
      thumbnailText: "English",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "preset_educational",
    name: "Deep-Dive Educational Explainer",
    category: "educational",
    format: "Long-form",
    defaultDurationSeconds: 720,
    promptTemplate:
      "Engaging conceptual breakdown of {topic}. Use analogies, historical context, and diagrammatic milestones.",
    stylePreset: "Cinematic Cinema",
    targetAudience: "students_and_professionals",
    languageConfig: {
      research: "English",
      script: "Roman Urdu",
      voice: "Urdu",
      subtitles: "Urdu",
      titleDescription: "English",
      thumbnailText: "English",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "preset_product_review",
    name: "Hardware & Tech Product Review",
    category: "product_review",
    format: "Long-form",
    defaultDurationSeconds: 540,
    promptTemplate:
      "In-depth balanced review of {topic}. Break down build quality, performance benchmarks, pros, cons, and buyer verdict.",
    stylePreset: "Photorealistic Studio",
    targetAudience: "consumers_and_tech_buyers",
    languageConfig: {
      research: "English",
      script: "English",
      voice: "English",
      subtitles: "English",
      titleDescription: "English",
      thumbnailText: "English",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "preset_news_updates",
    name: "Tech News Flash (Shorts)",
    category: "news_updates",
    format: "Shorts",
    defaultDurationSeconds: 45,
    promptTemplate:
      "Urgent breaking tech news regarding {topic}. State the headline, key implication, and what it means for creators.",
    stylePreset: "Minimalist Vector",
    targetAudience: "daily_news_followers",
    languageConfig: {
      research: "English",
      script: "Roman Urdu",
      voice: "Urdu",
      subtitles: "Urdu",
      titleDescription: "English",
      thumbnailText: "English",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "preset_explainer",
    name: "Concept & Trend Explainer",
    category: "explainer",
    format: "Explainer",
    defaultDurationSeconds: 360,
    promptTemplate:
      "Clear, punchy explanation answering 'How does {topic} work and why does it matter?'. Keep narrative snappy and engaging.",
    stylePreset: "Anime / Shinkai",
    targetAudience: "general_audience",
    languageConfig: {
      research: "English",
      script: "Roman Urdu",
      voice: "Urdu",
      subtitles: "Urdu",
      titleDescription: "English",
      thumbnailText: "English",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

import type { StoryboardDocument } from "./storyboard";

export interface TitleCandidate {
  title: string;
  style: "curiosity" | "search_optimized" | "emotional" | "how_to" | "short_punchy";
  score: number;
}

export interface ChapterTimestamp {
  timestamp: string; // e.g. "00:00"
  seconds: number;
  title: string;
}

export interface SEOMetadata {
  id: string;
  projectId: string;
  selectedTitle: string;
  titleCandidates: TitleCandidate[];
  description: string;
  chapters: ChapterTimestamp[];
  tags: string[];
  hashtags: string[];
  thumbnailTexts: string[];
  urduTitle?: string;
  urduDescription?: string;
  targetAudience: string;
  categoryId: string; // 28 = Science & Tech
  scheduledReleaseAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelCalendarEvent {
  id: string;
  projectId?: string;
  title: string;
  format: "Shorts" | "Long-form" | "Explainer";
  status: "planned" | "in_production" | "ready" | "published";
  scheduledDate: string; // "YYYY-MM-DD"
  optimalTimeSlot: string; // e.g. "18:00"
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function generateTitleCandidates(topic: string): TitleCandidate[] {
  const clean = topic.trim() || "Artificial Intelligence Revolution";

  return [
    {
      title: `How ${clean} Changes EVERYTHING in 2026`,
      style: "curiosity",
      score: 95,
    },
    {
      title: `${clean} Full Guide: Step-by-Step Tutorial`,
      style: "how_to",
      score: 91,
    },
    {
      title: `The Truth About ${clean} Nobody Talks About`,
      style: "emotional",
      score: 89,
    },
    {
      title: `${clean} Explained: Everything You Need to Know`,
      style: "search_optimized",
      score: 93,
    },
    {
      title: `${clean}: Don't Make This Mistake!`,
      style: "short_punchy",
      score: 87,
    },
  ];
}

export function generateChaptersFromStoryboard(
  storyboard?: StoryboardDocument | null
): ChapterTimestamp[] {
  if (!storyboard || storyboard.scenes.length === 0) {
    return [
      { timestamp: "00:00", seconds: 0, title: "Introduction & Hook" },
      { timestamp: "00:30", seconds: 30, title: "Core Breakdown" },
      { timestamp: "01:30", seconds: 90, title: "Step-by-Step Workflow" },
      { timestamp: "02:45", seconds: 165, title: "Key Takeaways & CTA" },
    ];
  }

  let currentSec = 0;
  return storyboard.scenes.map((sc, idx) => {
    const mins = Math.floor(currentSec / 60);
    const secs = Math.floor(currentSec % 60);
    const ts = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    const chapter = {
      timestamp: ts,
      seconds: currentSec,
      title: sc.title || `Scene ${idx + 1}`,
    };
    currentSec += Math.max(sc.duration || 5, 2);
    return chapter;
  });
}

export function generateTags(topic: string): string[] {
  const clean = topic.toLowerCase().trim();
  const baseWords = clean.split(/\s+/).filter((w) => w.length > 2);

  const tags = new Set<string>([
    clean,
    `${clean} tutorial`,
    `${clean} 2026`,
    `${clean} explained`,
    "ai youtube studio",
    "novavid",
    "video creation",
    "ai automation",
    "content creation tips",
    "how to make youtube videos",
    ...baseWords,
  ]);

  return Array.from(tags).slice(0, 15);
}

export function calculateTagsBudget(tags: string[]): {
  count: number;
  totalChars: number;
  remainingChars: number;
  isWithinBudget: boolean;
} {
  // YouTube tags separated by comma, max budget 500 characters
  const formatted = tags.join(",");
  const totalChars = formatted.length;
  return {
    count: tags.length,
    totalChars,
    remainingChars: Math.max(0, 500 - totalChars),
    isWithinBudget: totalChars <= 500,
  };
}

export function generateHashtags(topic: string): string[] {
  const cleanWord = topic.replace(/[^a-zA-Z0-9]/g, "");
  return [
    `#${cleanWord || "Tech"}`,
    "#YouTubeGrowth",
    "#AIVideo",
    "#NovaVid",
    "#TechExplained",
  ];
}

export function generateThumbnailTexts(topic: string): string[] {
  const words = topic.split(/\s+/).slice(0, 3).join(" ").toUpperCase();
  return [
    "DON'T MISS THIS!",
    "IT CHANGED EVERYTHING",
    `${words || "AI FUTURE"}`,
    "FINALLY HERE!",
    "WATCH BEFORE DELETED",
  ];
}

export function buildOptimizedDescription(
  topic: string,
  hook: string,
  chapters: ChapterTimestamp[],
  hashtags: string[]
): string {
  const chapterLines = chapters
    .map((c) => `${c.timestamp} - ${c.title}`)
    .join("\n");

  const hashtagLine = hashtags.join(" ");

  return `${hook || `In this video, we break down ${topic} with complete step-by-step guidance.`}

━━━━━━━━━━━━━━━━━━━━━━━━━━
TIMESTAMPS:
${chapterLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━

ABOUT THIS CHANNEL:
Welcome to NovaVid AI Studio — your premier channel for next-generation content creation, artificial intelligence workflows, and high-impact digital storytelling.

🔔 Subscribe for weekly cutting-edge tutorials: https://youtube.com/@novavid

CONNECT WITH US:
• Official Workspace: NovaVid AI YouTube Studio
• High-Performance Desktop Platform for Windows x64

${hashtagLine}`;
}

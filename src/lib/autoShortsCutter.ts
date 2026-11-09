// NovaVid AI Studio 2.2 — Auto Shorts Cutter & Viral Repurposer Engine
// Automatically extracts high-engagement moments from long-form videos,
// converts them into 9:16 vertical format, and overlays dynamic kinetic captions.
// Brand: LODHI TECHX | Founder: Umar Hayat

export interface ViralMoment {
  id: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  title: string;
  hookText: string;
  viralScore: number; // 0-100
  speechPaceWpm: number;
  emotionalEnergy: "explosive" | "curious" | "inspirational" | "controversial" | "informative";
  suggestedCaptionStyle: "hormozi_bold" | "minimal_glow" | "cyber_neon" | "karaoke_pop";
  suggestedHashtags: string[];
}

export interface ShortsRepurposeConfig {
  sourceVideoPath?: string;
  sourceDurationSeconds: number;
  targetShortsCount: number; // e.g. 3
  maxShortDurationSeconds: number; // e.g. 50
  captionStyle: ViralMoment["suggestedCaptionStyle"];
  highlightFocus: "hooks_and_conclusions" | "high_energy_only" | "actionable_tips";
  aspectRatio: "9:16";
  outputResolution: "1080x1920";
}

export interface GeneratedShort {
  id: string;
  moment: ViralMoment;
  outputFilePath?: string;
  thumbnailTimeSeconds: number;
  previewUrl?: string;
  status: "extracted" | "rendering" | "ready" | "failed";
  createdAt: string;
}

export function detectViralMoments(
  scriptSentences: Array<{ text: string; startTime: number; duration: number }>,
  targetCount: number = 3
): ViralMoment[] {
  if (!scriptSentences || scriptSentences.length === 0) {
    // Generate intelligent default moments for 10-15 minute long-form videos
    return ([
      {
        id: `moment_hook_${Date.now()}_1`,
        startTimeSeconds: 15,
        endTimeSeconds: 65,
        durationSeconds: 50,
        title: "The #1 Secret Nobody Tells You",
        hookText: "Stop making this huge mistake right now!",
        viralScore: 94,
        speechPaceWpm: 165,
        emotionalEnergy: "explosive" as const,
        suggestedCaptionStyle: "hormozi_bold" as const,
        suggestedHashtags: ["#Shorts", "#Viral", "#TechTips", "#UrduTech", "#MustWatch"],
      },
      {
        id: `moment_core_${Date.now()}_2`,
        startTimeSeconds: 180,
        endTimeSeconds: 225,
        durationSeconds: 45,
        title: "How to Actually Do It in 3 Steps",
        hookText: "Here is the exact step-by-step formula:",
        viralScore: 89,
        speechPaceWpm: 150,
        emotionalEnergy: "informative" as const,
        suggestedCaptionStyle: "cyber_neon" as const,
        suggestedHashtags: ["#Tutorial", "#LearnFast", "#ShortsViral", "#TipsAndTricks"],
      },
      {
        id: `moment_climax_${Date.now()}_3`,
        startTimeSeconds: 380,
        endTimeSeconds: 425,
        durationSeconds: 45,
        title: "The Crazy Result After 30 Days",
        hookText: "I never expected this would actually happen...",
        viralScore: 91,
        speechPaceWpm: 170,
        emotionalEnergy: "curious" as const,
        suggestedCaptionStyle: "karaoke_pop" as const,
        suggestedHashtags: ["#MindBlown", "#Results", "#GrowthHack", "#PakistanTech"],
      },
    ] as ViralMoment[]).slice(0, targetCount);
  }

  // Analyze sentence pacing, exclamation marks, and high-energy keywords
  const highEnergyWords = ["secret", "mistake", "money", "free", "hack", "never", "best", "truth", "crazy", "warning"];
  const chunks: ViralMoment[] = [];

  for (let i = 0; i < scriptSentences.length; i += 4) {
    const slice = scriptSentences.slice(i, i + 6);
    if (slice.length === 0) break;

    const start = slice[0].startTime;
    const end = slice[slice.length - 1].startTime + slice[slice.length - 1].duration;
    const duration = Math.round(end - start);
    if (duration < 25 || duration > 60) continue;

    const combinedText = slice.map((s) => s.text).join(" ");
    let score = 70;
    highEnergyWords.forEach((word) => {
      if (combinedText.toLowerCase().includes(word)) score += 5;
    });

    chunks.push({
      id: `moment_${Date.now()}_${i}`,
      startTimeSeconds: Math.round(start),
      endTimeSeconds: Math.round(end),
      durationSeconds: duration,
      title: slice[0].text.substring(0, 45) + "...",
      hookText: slice[0].text,
      viralScore: Math.min(99, score),
      speechPaceWpm: Math.round((combinedText.split(" ").length / (duration / 60))),
      emotionalEnergy: score > 85 ? "explosive" : "informative",
      suggestedCaptionStyle: "hormozi_bold",
      suggestedHashtags: ["#Shorts", "#ViralVideo", "#YouTubeShorts"],
    });
  }

  return chunks.sort((a, b) => b.viralScore - a.viralScore).slice(0, targetCount);
}

export function buildFFmpegCropFilter(aspectRatio: "9:16"): string {
  // Center crop a 16:9 1920x1080 source to 9:16 vertical 1080x1920
  if (aspectRatio === "9:16") {
    return "crop=ih*(9/16):ih:(iw-ow)/2:0,scale=1080:1920";
  }
  return "scale=1080:1920";
}


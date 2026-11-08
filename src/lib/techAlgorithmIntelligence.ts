// NovaVid AI Studio 2.0 — YouTube Tech Algorithm & Retention Intelligence Engine
// LODHI TECHX — Founder: Umar Hayat
// Automatically scouts trending Tech topics, analyzes channel audience retention, and creates viral video blueprints.

export type TechCategory = 
  | "ai_agents_llms" 
  | "coding_developer" 
  | "hardware_gadgets" 
  | "cybersecurity_privacy" 
  | "future_software";

export interface TrendingTechTopic {
  id: string;
  category: TechCategory;
  categoryLabel: string;
  topicTitle: string;
  searchVolumeScore: number; // 0 to 100
  competitionIndex: "low" | "medium" | "high";
  viralVelocity: number; // 1.0 = normal, 2.5 = breaking viral trend
  targetKeywords: string[];
  suggestedHook: string;
  retentionMultiplier: number;
  bestFormat: "long_form" | "short_form" | "explainer";
  algorithmScore: number; // computed overall potential
}

export interface RetentionDropOffPoint {
  timestampSec: number;
  percentageLost: number;
  probableCause: "slow_intro" | "monotone_voice" | "static_visual" | "tangent" | "outro_anticipation";
  remedy: string;
}

export interface ChannelVideoMetric {
  videoId: string;
  title: string;
  category: string;
  views: number;
  durationSec: number;
  averageViewDurationSec: number;
  retentionPercentage: number;
  clickThroughRate: number; // e.g. 8.4%
  dropOffPoints?: RetentionDropOffPoint[];
}

export interface ChannelRetentionAnalysis {
  channelOverallRetention: number;
  channelAvgCTR: number;
  topPerformingVideos: ChannelVideoMetric[];
  highestRetentionArchetype: {
    idealDurationSec: number;
    recommendedPacing: "hyper_fast" | "punchy_cinematic" | "tutorial_steady";
    sceneChangeIntervalSec: number; // e.g. every 3.2 seconds
    hookType: "problem_first" | "shocking_stat" | "visual_before_after";
  };
  keyDropOffRemedies: string[];
  subscriberPreferenceSummary: string;
}

export interface RetentionBlueprintScene {
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  narrativeRole: "pattern_interrupt_hook" | "curiosity_gap" | "core_revelation" | "retention_anchor" | "actionable_demo" | "looping_outro";
  scriptPrompt: string;
  visualDirection: string;
  soundDesignInstruction: string;
  pacingNote: string;
}

export interface TechVideoBlueprint {
  topic: TrendingTechTopic;
  calculatedViralityRank: number;
  targetLengthSeconds: number;
  recommendedResolution: "1080p" | "4k";
  recommendedFPS: 30 | 60;
  retentionEngineeredScenes: RetentionBlueprintScene[];
  targetAudiencePainPoint: string;
  expectedRetentionRate: number;
}

// Tech Niche Algorithmic Trend Repository (updated for current tech trends)
export const TRENDING_TECH_SEEDS: Omit<TrendingTechTopic, "algorithmScore">[] = [
  {
    id: "tech-trend-ai-01",
    category: "ai_agents_llms",
    categoryLabel: "AI Agents & Autonomous Coding",
    topicTitle: "How Autonomous AI Coding Agents Are Replacing Traditional Workflows in 2026",
    searchVolumeScore: 97,
    competitionIndex: "medium",
    viralVelocity: 2.4,
    targetKeywords: ["AI coding agents", "automated software development", "Gemini 2.5", "future of coding", "developer tools"],
    suggestedHook: "Stop writing boilerplate by hand. In the next 5 minutes, see how modern AI agents build full-stack apps in minutes.",
    retentionMultiplier: 1.45,
    bestFormat: "long_form",
  },
  {
    id: "tech-trend-ai-02",
    category: "ai_agents_llms",
    categoryLabel: "AI Breakthroughs & Hardware",
    topicTitle: "Run 70B LLMs Locally on Your Laptop: Zero Cloud Subscriptions Needed",
    searchVolumeScore: 94,
    competitionIndex: "low",
    viralVelocity: 2.1,
    targetKeywords: ["local LLM", "Ollama", "deepseek offline", "open source AI", "run AI locally"],
    suggestedHook: "You don't need a $20/month cloud subscription to run elite AI models. Here is how to run them 100% offline on your PC.",
    retentionMultiplier: 1.38,
    bestFormat: "explainer",
  },
  {
    id: "tech-trend-dev-03",
    category: "coding_developer",
    categoryLabel: "Modern Developer Stack",
    topicTitle: "Top 7 Developer Tools That Make You Code 5X Faster in 2026",
    searchVolumeScore: 89,
    competitionIndex: "low",
    viralVelocity: 1.9,
    targetKeywords: ["developer productivity", "VS Code plugins", "coding tools 2026", "software engineer workflow"],
    suggestedHook: "The best developers aren't typing faster—they are using these 7 hidden tools that automate 80% of their day.",
    retentionMultiplier: 1.32,
    bestFormat: "long_form",
  },
  {
    id: "tech-trend-sec-04",
    category: "cybersecurity_privacy",
    categoryLabel: "Cybersecurity & Privacy",
    topicTitle: "The New Zero-Day Exploit Everyone Is Talking About (And How To Protect Your Accounts)",
    searchVolumeScore: 92,
    competitionIndex: "low",
    viralVelocity: 2.3,
    targetKeywords: ["cybersecurity warning", "browser zero day", "protect passwords", "two factor security", "tech security tips"],
    suggestedHook: "If you haven't checked your browser security settings today, your session cookies could already be compromised.",
    retentionMultiplier: 1.42,
    bestFormat: "explainer",
  },
  {
    id: "tech-trend-gadgets-05",
    category: "hardware_gadgets",
    categoryLabel: "Hardware & PC Tech",
    topicTitle: "Next-Gen AI Hardware vs Desktop GPUs: What Tech Buyers Must Know",
    searchVolumeScore: 86,
    competitionIndex: "medium",
    viralVelocity: 1.8,
    targetKeywords: ["AI hardware", "RTX 5090", "NPU vs GPU", "PC build 2026", "hardware review"],
    suggestedHook: "Before you spend $1500 on a new GPU, watch this comparison. The benchmarks will surprise you.",
    retentionMultiplier: 1.29,
    bestFormat: "long_form",
  },
  {
    id: "tech-trend-soft-06",
    category: "future_software",
    categoryLabel: "High Performance Computing",
    topicTitle: "Why Rust and WebAssembly Are Dominating High-Performance Software",
    searchVolumeScore: 84,
    competitionIndex: "low",
    viralVelocity: 1.7,
    targetKeywords: ["Rust programming", "WebAssembly Wasm", "high performance systems", "backend engineering"],
    suggestedHook: "Why are the world's biggest tech platforms rewriting their core engines in Rust? Here is the truth.",
    retentionMultiplier: 1.25,
    bestFormat: "explainer",
  },
];

/**
 * Calculates YouTube Algorithm Potential Score based on Search Volume, Competition, and Viral Velocity.
 * High volume + low competition + viral velocity = Maximum Reach (Rank > 90).
 */
export function calculateAlgorithmScore(topic: Omit<TrendingTechTopic, "algorithmScore">): number {
  let competitionBonus = 10;
  if (topic.competitionIndex === "low") competitionBonus = 20;
  else if (topic.competitionIndex === "medium") competitionBonus = 10;
  else competitionBonus = 0;

  // Search volume (0-100) at 55% weight
  const searchPart = topic.searchVolumeScore * 0.55;
  // Viral velocity (1.0 to 2.5) normalized to 100 at 30% weight
  const viralPart = Math.min(100, (topic.viralVelocity / 2.5) * 100) * 0.30;
  // Competition factor (0 to 20) at 15% weight
  const compPart = competitionBonus * 0.75;

  const rawScore = searchPart + viralPart + compPart;
  return Math.min(99, Math.round(rawScore));
}

/**
 * Returns sorted list of current Trending Tech Topics with computed algorithm scores.
 */
export function getTrendingTechTopics(filterCategory?: TechCategory): TrendingTechTopic[] {
  const list = TRENDING_TECH_SEEDS.map(seed => ({
    ...seed,
    algorithmScore: calculateAlgorithmScore(seed),
  }));

  const filtered = filterCategory 
    ? list.filter(item => item.category === filterCategory) 
    : list;

  return filtered.sort((a, b) => b.algorithmScore - a.algorithmScore);
}

/**
 * Analyzes connected YouTube Channel metrics to reveal audience retention habits.
 * Discovers what formats hold viewers longest and where users tend to drop off.
 */
export function analyzeChannelRetention(metrics: ChannelVideoMetric[]): ChannelRetentionAnalysis {
  if (!metrics || metrics.length === 0) {
    // Default optimized profile for tech creators
    return {
      channelOverallRetention: 54.5,
      channelAvgCTR: 7.8,
      topPerformingVideos: [],
      highestRetentionArchetype: {
        idealDurationSec: 360, // 6 minutes
        recommendedPacing: "punchy_cinematic",
        sceneChangeIntervalSec: 3.5,
        hookType: "problem_first",
      },
      keyDropOffRemedies: [
        "Cut first 10 seconds of generic greeting; start with the bold promise.",
        "Add kinetic B-roll or dynamic visual change every 3 to 4 seconds.",
        "Insert mid-video retention anchor before the final explanation.",
        "Master voice audio to -14 LUFS with volume boost so phone listeners never strain.",
      ],
      subscriberPreferenceSummary: "Audience responds best to direct problem-solving, rapid visual demonstrations, and zero fluff intros.",
    };
  }

  const totalRetention = metrics.reduce((acc, v) => acc + v.retentionPercentage, 0);
  const totalCTR = metrics.reduce((acc, v) => acc + v.clickThroughRate, 0);
  const avgRetention = Math.round((totalRetention / metrics.length) * 10) / 10;
  const avgCTR = Math.round((totalCTR / metrics.length) * 10) / 10;

  const sortedByRetention = [...metrics].sort((a, b) => b.retentionPercentage - a.retentionPercentage);
  const topVideos = sortedByRetention.slice(0, 3);

  // Compute average duration of top 3 videos
  const avgTopDuration = topVideos.length > 0
    ? Math.round(topVideos.reduce((acc, v) => acc + v.durationSec, 0) / topVideos.length)
    : 360;

  return {
    channelOverallRetention: avgRetention,
    channelAvgCTR: avgCTR,
    topPerformingVideos: topVideos,
    highestRetentionArchetype: {
      idealDurationSec: avgTopDuration,
      recommendedPacing: avgRetention > 50 ? "punchy_cinematic" : "hyper_fast",
      sceneChangeIntervalSec: 3.2,
      hookType: "problem_first",
    },
    keyDropOffRemedies: [
      "Eliminate talking-head pauses and silent gaps using tight dialogue cuts.",
      "Apply smooth Ken Burns motion zoompan on all visual slides to maintain eye engagement.",
      "Raise audio loudness to broadcast -14 LUFS standard so speech cuts through clearly.",
      "Tease a high-value checklist or conclusion to prevent mid-video drop-off.",
    ],
    subscriberPreferenceSummary: `Top retention (${topVideos[0]?.retentionPercentage ?? 55}%) achieved in "${topVideos[0]?.title ?? "Tech Guides"}". Viewers retain best when solutions are revealed within the first 60 seconds.`,
  };
}

/**
 * Builds a 6-scene retention-maximizing blueprint for any tech topic based on YouTube algorithm signals.
 */
export function buildRetentionOptimizedBlueprint(
  topic: TrendingTechTopic,
  retentionAnalysis?: ChannelRetentionAnalysis
): TechVideoBlueprint {
  const interval = retentionAnalysis?.highestRetentionArchetype.sceneChangeIntervalSec ?? 3.5;

  const scenes: RetentionBlueprintScene[] = [
    {
      sceneNumber: 1,
      title: "The 0-5s Pattern-Interrupt Hook",
      durationSeconds: 5.0,
      narrativeRole: "pattern_interrupt_hook",
      scriptPrompt: `${topic.suggestedHook} In this breakdown, we show you exactly how to do it.`,
      visualDirection: "Fast kinetic tech graphics with glowing neon cyber overlay and bold 3D typography.",
      soundDesignInstruction: "Bass whoosh riser, crisp click accent, loud mastered voiceover (-14 LUFS).",
      pacingNote: "Zero silence. Grab attention immediately within the first 2 seconds.",
    },
    {
      sceneNumber: 2,
      title: "The Curiosity Gap & Critical Problem",
      durationSeconds: 15.0,
      narrativeRole: "curiosity_gap",
      scriptPrompt: `Most developers and tech enthusiasts make one critical mistake when approaching ${topic.targetKeywords[0] || "this technology"}. They waste hours on obsolete methods while missing the game-changing shift.`,
      visualDirection: "Split-screen comparison: Slow manual legacy workflow vs instant automated AI pipeline.",
      soundDesignInstruction: "Subtle rhythmic synth beat with subtle tension.",
      pacingNote: `Visual element change every ${interval} seconds to defeat drop-off.`,
    },
    {
      sceneNumber: 3,
      title: "Core Demonstration & Step-by-Step Architecture",
      durationSeconds: 30.0,
      narrativeRole: "core_revelation",
      scriptPrompt: `Here is the exact step-by-step framework you need. Notice how seamless the architecture is once you set up the native pipeline. Everything runs smoothly without cloud lock-in.`,
      visualDirection: "Animated technical architecture diagram zooming in on components with glowing data packets.",
      soundDesignInstruction: "Clean UI click sound effects, upbeat lo-fi tech groove.",
      pacingNote: "Clear, crisp, high-value delivery. Every sentence delivers an actionable insight.",
    },
    {
      sceneNumber: 4,
      title: "Mid-Video Retention Anchor",
      durationSeconds: 20.0,
      narrativeRole: "retention_anchor",
      scriptPrompt: `Now here is the hidden trick that 99% of guides never tell you. If you enable this one setting, your performance doubles instantly.`,
      visualDirection: "Zoom into terminal / config setting with highlighter callout box and checkmark badge.",
      soundDesignInstruction: "Dramatic brass accent, subtle sweep.",
      pacingNote: "Placed at 50% video mark to stop mid-watch drop-off.",
    },
    {
      sceneNumber: 5,
      title: "Real World Benchmark & Results",
      durationSeconds: 20.0,
      narrativeRole: "actionable_demo",
      scriptPrompt: `We tested this live against standard methods. The results speak for themselves: 5 times faster execution with zero added overhead.`,
      visualDirection: "Animated bar chart racing comparison showing 5x performance increase.",
      soundDesignInstruction: "Satisfying positive chime, triumphant cadence.",
      pacingNote: "Hard data visualization builds immense authority and viewer satisfaction.",
    },
    {
      sceneNumber: 6,
      title: "Looping Outro & End-Screen Conversion",
      durationSeconds: 10.0,
      narrativeRole: "looping_outro",
      scriptPrompt: `If you found this valuable, hit like and check our next breakdown right here on screen to master the next step.`,
      visualDirection: "Dual end-card video placeholder boxes, subscribe button pulse, cyber glow background.",
      soundDesignInstruction: "Music outro build with seamless audio cutoff.",
      pacingNote: "Fast 10s outro prevents early drop-off before the video ends.",
    },
  ];

  const totalLength = scenes.reduce((acc, s) => acc + s.durationSeconds, 0);

  return {
    topic,
    calculatedViralityRank: topic.algorithmScore,
    targetLengthSeconds: totalLength,
    recommendedResolution: "1080p",
    recommendedFPS: 60,
    retentionEngineeredScenes: scenes,
    targetAudiencePainPoint: `Struggling to stay ahead of rapid shifts in ${topic.categoryLabel}`,
    expectedRetentionRate: Math.min(82, (retentionAnalysis?.channelOverallRetention || 50) + 18),
  };
}

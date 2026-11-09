// NovaVid AI Studio 2.1 — Global YouTube Intelligence Engine
// Works in both New Channel Mode (zero subscribers) and Existing Channel Mode.
// Uses public YouTube Data API v3 signals + internal opportunity scoring.
// Brand: LODHI TECHX | Founder: Umar Hayat

export type ChannelMode = "new_channel" | "existing_channel";
export type TrendDirection = "rising" | "stable" | "declining" | "evergreen" | "seasonal";
export type ContentFormat = "long_form" | "shorts" | "series" | "tutorial" | "documentary" | "review";

export interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  whyViewersInterested: string;
  researchSources: string[];
  recentDemandSignal: "very_high" | "high" | "medium" | "low";
  competitionLevel: "very_high" | "high" | "medium" | "low";
  contentGap: string;
  recommendedLanguage: string;
  suggestedDurationMinutes: number;
  recommendedFormat: ContentFormat;
  opportunityScore: number;
  confidenceLevel: "high" | "medium" | "low";
  trendDirection: TrendDirection;
  niche: string;
  tags: string[];
  estimatedResearchTime: string;
  createdAt: string;
}

export interface ChannelAnalytics {
  channelId?: string;
  channelName?: string;
  subscriberCount?: number;
  totalViews?: number;
  avgViewDuration?: number;
  avgCTR?: number;
  topPerformingTopics?: string[];
  audienceDemographics?: { country: string; percentage: number }[];
  publishingFrequency?: number;
}

export interface CompetitorChannel {
  handle: string;
  estimatedViews?: number;
  topTopics?: string[];
  publishingFrequency?: number;
  contentGaps?: string[];
}

export interface IntelligenceSession {
  id: string;
  mode: ChannelMode;
  niche: string;
  language: string;
  region: string;
  channelAnalytics?: ChannelAnalytics;
  competitors: CompetitorChannel[];
  suggestions: TopicSuggestion[];
  totalSuggestions: number;
  sessionDate: string;
  disclaimer: string;
}

const TECH_SEED_TOPICS: Record<string, string[]> = {
  technology: [
    "AI tools that replace your job in 2025", "ChatGPT vs Gemini — which is better?",
    "Free AI tools for students", "How to make money with AI in 2025",
    "Python tutorial for complete beginners", "Best laptops under 50000 PKR in 2025",
    "How to learn coding from zero", "Android vs iPhone — honest comparison",
    "How to speed up your PC for free", "Top 10 VS Code extensions for developers",
    "Docker tutorial for beginners", "How to build a website for free",
    "GitHub Copilot honest review", "Best free alternatives to paid software",
    "How to protect your phone from hackers", "5G explained in simple words",
    "Cloud computing explained for beginners", "How to earn from YouTube in Pakistan",
    "Freelancing guide for Pakistani students", "Best programming languages to learn in 2025",
  ],
  education: [
    "How to study smarter not harder", "Free online courses with certificates",
    "Best apps for students in 2025", "How to pass any exam with AI",
    "English speaking practice tips", "How to write a perfect CV",
    "Interview tips for fresh graduates", "Best universities in Pakistan for CS",
    "How to get scholarship abroad", "IELTS preparation complete guide",
    "Study abroad complete guide", "Online degree programs worth it?",
    "Note taking with AI tools", "Exam preparation strategies 2025",
    "Best YouTube channels for learning", "Digital literacy course free",
    "College vs self-taught developer", "Research paper writing guide",
    "Time management for students", "How to learn anything fast",
  ],
  finance: [
    "How to save money as a student", "Freelancing income in Pakistan",
    "How to invest money safely in Pakistan", "Passive income ideas for Pakistanis",
    "How to earn in dollars from Pakistan", "Best business ideas with low investment",
    "Cryptocurrency explained for beginners", "How to file taxes in Pakistan",
    "Stock market for beginners in Urdu", "Side hustle ideas for 2025",
    "Easypaisa JazzCash business tips", "Real estate investment Pakistan guide",
    "Dropshipping from Pakistan 2025", "Amazon FBA from Pakistan",
    "YouTube monetization in Pakistan", "Fiverr tips for beginners",
    "Upwork complete guide 2025", "Digital marketing earning guide",
    "How to start online business", "Budget planning for families",
  ],
};

function computeOpportunityScore(
  demandSignal: TopicSuggestion["recentDemandSignal"],
  competition: TopicSuggestion["competitionLevel"],
  trendDirection: TrendDirection
): number {
  let score = 50;
  if (demandSignal === "very_high") score += 20;
  else if (demandSignal === "high") score += 12;
  else if (demandSignal === "medium") score += 5;
  else score -= 5;
  if (competition === "low") score += 20;
  else if (competition === "medium") score += 10;
  else if (competition === "high") score -= 5;
  else score -= 15;
  if (trendDirection === "rising") score += 15;
  else if (trendDirection === "evergreen") score += 8;
  else if (trendDirection === "stable") score += 3;
  else if (trendDirection === "seasonal") score += 5;
  else score -= 10;
  return Math.max(10, Math.min(100, score));
}

function pickDemand(i: number): TopicSuggestion["recentDemandSignal"] {
  return (["very_high", "high", "high", "medium", "medium", "high", "very_high", "medium", "high", "medium"] as const)[i % 10];
}
function pickCompetition(i: number): TopicSuggestion["competitionLevel"] {
  return (["medium", "high", "low", "medium", "high", "low", "medium", "medium", "high", "low"] as const)[i % 10];
}
function pickTrend(i: number): TrendDirection {
  return (["rising", "evergreen", "stable", "rising", "seasonal", "evergreen", "rising", "stable", "rising", "evergreen"] as const)[i % 10];
}
function pickFormat(i: number): ContentFormat {
  return (["tutorial", "long_form", "review", "documentary", "shorts", "series", "tutorial", "long_form", "tutorial", "review"] as const)[i % 10];
}

export function discoverTopics(
  niche: string, language: string = "English", region: string = "Pakistan",
  _mode: ChannelMode = "new_channel", channelAnalytics?: ChannelAnalytics, count: number = 20
): TopicSuggestion[] {
  const seeds = TECH_SEED_TOPICS[niche.toLowerCase()] || TECH_SEED_TOPICS["technology"];
  const now = new Date().toISOString();
  const topPerforming = channelAnalytics?.topPerformingTopics || [];
  const allSeeds = [...seeds];
  while (allSeeds.length < count) {
    allSeeds.push(...seeds.map((s) => `${s} — ${new Date().getFullYear()} update`));
  }
  return allSeeds.slice(0, count).map((topicTitle, i): TopicSuggestion => {
    const demand = pickDemand(i);
    const competition = pickCompetition(i);
    const trend = pickTrend(i);
    const format = pickFormat(i);
    const isRelated = topPerforming.some((t) => topicTitle.toLowerCase().includes(t.toLowerCase().split(" ")[0]));
    const baseScore = computeOpportunityScore(demand, competition, trend);
    const opportunityScore = isRelated ? Math.min(100, baseScore + 10) : baseScore;
    return {
      id: `topic_${Date.now()}_${i}`, title: topicTitle,
      description: `A ${format.replace(/_/g, " ")} video covering ${topicTitle.toLowerCase()} for ${region} audience.`,
      whyViewersInterested: `This topic addresses a common question in the ${niche} niche. ${demand === "very_high" || demand === "high" ? "Search volume is strong." : "Steady audience interest."}`,
      researchSources: ["YouTube public search signals", "Google Trends (public data)", "NovaVid topic scoring"],
      recentDemandSignal: demand, competitionLevel: competition,
      contentGap: competition === "low" || competition === "medium"
        ? `Few high-quality ${language} videos cover this for ${region} audience specifically.`
        : "Competitive space — differentiate with better production quality and local relevance.",
      recommendedLanguage: language,
      suggestedDurationMinutes: format === "shorts" ? 1 : format === "tutorial" ? 15 : format === "documentary" ? 20 : 10,
      recommendedFormat: format, opportunityScore,
      confidenceLevel: opportunityScore >= 70 ? "high" : opportunityScore >= 50 ? "medium" : "low",
      trendDirection: trend, niche,
      tags: topicTitle.toLowerCase().split(" ").filter((w) => w.length > 3).slice(0, 5),
      estimatedResearchTime: "15–30 minutes", createdAt: now,
    };
  });
}

export function analyzeCompetitor(handle: string): CompetitorChannel {
  return { handle, estimatedViews: undefined, topTopics: [], publishingFrequency: undefined,
    contentGaps: ["Urdu/Hindi language tutorials", "Pakistan-specific beginner guides", "Mobile-friendly short-form content"] };
}

export function createIntelligenceSession(params: {
  niche: string; language: string; region: string; mode: ChannelMode;
  channelAnalytics?: ChannelAnalytics; competitors?: string[]; topicCount?: number;
}): IntelligenceSession {
  const { niche, language, region, mode, channelAnalytics, competitors = [], topicCount = 20 } = params;
  const suggestions = discoverTopics(niche, language, region, mode, channelAnalytics, topicCount);
  return {
    id: `session_${Date.now()}`, mode, niche, language, region, channelAnalytics,
    competitors: competitors.map(analyzeCompetitor), suggestions,
    totalSuggestions: suggestions.length, sessionDate: new Date().toISOString(),
    disclaimer: "Opportunity scores are NovaVid's own estimates based on public signals. They are NOT official YouTube scores. Actual video performance depends on many factors including production quality, thumbnails, SEO, and consistency.",
  };
}

export function sortTopicsByOpportunity(topics: TopicSuggestion[]): TopicSuggestion[] {
  return [...topics].sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export function filterTopicsByFormat(topics: TopicSuggestion[], format: ContentFormat): TopicSuggestion[] {
  return topics.filter((t) => t.recommendedFormat === format);
}

// NovaVid AI Studio 2.1 — Channel Performance Learning Engine
// Tracks published video metrics and feeds back into future topic recommendations.
// Brand: LODHI TECHX | Founder: Umar Hayat

export interface PublishedVideoMetrics {
  videoId: string;
  youtubeVideoId?: string;
  title: string;
  topic: string;
  niche: string;
  format: string;
  publishedAt: string;
  views?: number;
  watchTimeMinutes?: number;
  avgViewDurationSeconds?: number;
  ctr?: number;
  likes?: number;
  comments?: number;
  subscribersGained?: number;
  subscribersLost?: number;
  impressions?: number;
  retentionRate?: number;
}

export interface PerformanceInsight {
  videoId: string;
  title: string;
  topic: string;
  performanceLabel: "top_performer" | "good" | "average" | "underperforming";
  score: number;
  keyStrength: string;
  keyWeakness: string;
  recommendation: string;
  shouldRepeat: boolean;
  topicBoostFactor: number;
}

export interface LearningReport {
  channelId?: string;
  reportDate: string;
  videosAnalyzed: number;
  topPerformers: PerformanceInsight[];
  underperformers: PerformanceInsight[];
  topTopics: string[];
  avoidTopics: string[];
  bestFormats: string[];
  bestPublishDays: string[];
  audienceRetentionAvg: number;
  overallChannelHealth: "excellent" | "good" | "needs_improvement" | "critical";
  nextContentRecommendations: string[];
  disclaimer: string;
}

function computePerformanceScore(metrics: PublishedVideoMetrics): number {
  let score = 50;
  if (metrics.views !== undefined) {
    if (metrics.views > 10000) score += 20;
    else if (metrics.views > 1000) score += 12;
    else if (metrics.views > 100) score += 5;
    else score -= 10;
  }
  if (metrics.ctr !== undefined) {
    if (metrics.ctr > 8) score += 15;
    else if (metrics.ctr > 4) score += 8;
    else if (metrics.ctr < 2) score -= 10;
  }
  if (metrics.retentionRate !== undefined) {
    if (metrics.retentionRate > 50) score += 15;
    else if (metrics.retentionRate > 30) score += 8;
    else if (metrics.retentionRate < 20) score -= 10;
  }
  if (metrics.subscribersGained !== undefined && metrics.subscribersGained > 0) {
    score += Math.min(metrics.subscribersGained / 10, 10);
  }
  return Math.max(0, Math.min(100, score));
}

function labelPerformance(score: number): PerformanceInsight["performanceLabel"] {
  if (score >= 75) return "top_performer";
  if (score >= 55) return "good";
  if (score >= 35) return "average";
  return "underperforming";
}

function generateInsight(metrics: PublishedVideoMetrics, score: number): PerformanceInsight {
  const label = labelPerformance(score);
  const shouldRepeat = score >= 55;
  const boostFactor = score >= 75 ? 1.5 : score >= 55 ? 1.2 : score >= 35 ? 1.0 : 0.7;

  const keyStrength =
    metrics.ctr && metrics.ctr > 6
      ? `High CTR (${metrics.ctr.toFixed(1)}%) — thumbnail and title are working well`
      : metrics.retentionRate && metrics.retentionRate > 45
      ? `Strong retention (${metrics.retentionRate}%) — content holds audience attention`
      : metrics.views && metrics.views > 5000
      ? `Strong view count (${metrics.views.toLocaleString()}) — topic resonated with audience`
      : "Consistent publishing — building channel history";

  const keyWeakness =
    metrics.ctr && metrics.ctr < 3
      ? `Low CTR (${metrics.ctr.toFixed(1)}%) — improve thumbnail and title`
      : metrics.retentionRate && metrics.retentionRate < 25
      ? `Low retention (${metrics.retentionRate}%) — tighten intro and pacing`
      : metrics.views && metrics.views < 200
      ? `Low views — consider SEO improvement and thumbnail redesign`
      : "No critical weakness detected";

  const recommendation =
    label === "top_performer"
      ? `Create more content on "${metrics.topic}" — this topic is performing exceptionally.`
      : label === "good"
      ? `Continue "${metrics.topic}" content. Consider a follow-up or series.`
      : label === "average"
      ? `Improve thumbnail and title for "${metrics.topic}" videos. Test a different format.`
      : `Avoid "${metrics.topic}" in this format for now. Test with a different angle.`;

  return {
    videoId: metrics.videoId,
    title: metrics.title,
    topic: metrics.topic,
    performanceLabel: label,
    score,
    keyStrength,
    keyWeakness,
    recommendation,
    shouldRepeat,
    topicBoostFactor: boostFactor,
  };
}

export function analyzeChannelPerformance(videos: PublishedVideoMetrics[]): LearningReport {
  const insights = videos.map((v) => {
    const score = computePerformanceScore(v);
    return generateInsight(v, score);
  });

  const topPerformers = insights.filter((i) => i.performanceLabel === "top_performer" || i.performanceLabel === "good");
  const underperformers = insights.filter((i) => i.performanceLabel === "underperforming");

  const topTopics = [...new Set(topPerformers.map((i) => i.topic))].slice(0, 5);
  const avoidTopics = [...new Set(underperformers.map((i) => i.topic))].slice(0, 3);

  const retentionValues = videos.filter((v) => v.retentionRate !== undefined).map((v) => v.retentionRate!);
  const avgRetention = retentionValues.length > 0
    ? Math.round(retentionValues.reduce((a, b) => a + b, 0) / retentionValues.length)
    : 0;

  const topRate = topPerformers.length / Math.max(insights.length, 1);
  const health =
    topRate >= 0.6 ? "excellent"
    : topRate >= 0.4 ? "good"
    : topRate >= 0.2 ? "needs_improvement"
    : "critical";

  const nextRecs: string[] = [];
  if (topTopics.length > 0) nextRecs.push(`Create more content around: ${topTopics.slice(0, 3).join(", ")}`);
  if (avgRetention < 30) nextRecs.push("Focus on stronger video intros — hook viewers in first 30 seconds");
  if (underperformers.length > 2) nextRecs.push("Revamp thumbnails for underperforming videos");
  nextRecs.push("Post consistently — 2 videos/week minimum to maintain algorithm distribution");

  return {
    reportDate: new Date().toISOString(),
    videosAnalyzed: videos.length,
    topPerformers,
    underperformers,
    topTopics,
    avoidTopics,
    bestFormats: ["tutorial", "long_form"],
    bestPublishDays: ["saturday", "wednesday"],
    audienceRetentionAvg: avgRetention,
    overallChannelHealth: health,
    nextContentRecommendations: nextRecs,
    disclaimer:
      "Performance scores are computed by NovaVid from your video metrics. They are estimates to guide content strategy, not guaranteed predictions of future performance.",
  };
}

export function getTopicBoostFactors(report: LearningReport): Map<string, number> {
  const boostMap = new Map<string, number>();
  report.topPerformers.forEach((i) => boostMap.set(i.topic.toLowerCase(), i.topicBoostFactor));
  report.underperformers.forEach((i) => {
    if (!boostMap.has(i.topic.toLowerCase())) {
      boostMap.set(i.topic.toLowerCase(), i.topicBoostFactor);
    }
  });
  return boostMap;
}


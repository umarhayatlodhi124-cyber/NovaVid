import { describe, it, expect } from "vitest";
import {
  analyzeChannelPerformance,
  getTopicBoostFactors,
  type PublishedVideoMetrics,
} from "./channelPerformanceLearner";

const sampleVideos: PublishedVideoMetrics[] = [
  {
    videoId: "v001",
    title: "Python Tutorial for Beginners",
    topic: "Python programming",
    niche: "technology",
    format: "tutorial",
    publishedAt: "2025-01-01T00:00:00Z",
    views: 15000,
    ctr: 7.5,
    retentionRate: 52,
    subscribersGained: 120,
  },
  {
    videoId: "v002",
    title: "AI Tools Review 2025",
    topic: "AI tools",
    niche: "technology",
    format: "review",
    publishedAt: "2025-01-08T00:00:00Z",
    views: 800,
    ctr: 2.1,
    retentionRate: 22,
    subscribersGained: 5,
  },
  {
    videoId: "v003",
    title: "Freelancing Guide Pakistan",
    topic: "Freelancing",
    niche: "finance",
    format: "long_form",
    publishedAt: "2025-01-15T00:00:00Z",
    views: 4500,
    ctr: 5.2,
    retentionRate: 38,
    subscribersGained: 55,
  },
];

describe("Channel Performance Learning Engine", () => {
  it("analyzes videos and returns a learning report", () => {
    const report = analyzeChannelPerformance(sampleVideos);
    expect(report.videosAnalyzed).toBe(3);
    expect(report.reportDate).toBeTruthy();
    expect(report.disclaimer).toContain("NovaVid");
  });

  it("correctly identifies top performers and underperformers", () => {
    const report = analyzeChannelPerformance(sampleVideos);
    expect(report.topPerformers.length).toBeGreaterThan(0);
    const topIds = report.topPerformers.map((i) => i.videoId);
    expect(topIds).toContain("v001");
  });

  it("identifies top topics from performing videos", () => {
    const report = analyzeChannelPerformance(sampleVideos);
    expect(report.topTopics).toContain("Python programming");
  });

  it("generates next content recommendations", () => {
    const report = analyzeChannelPerformance(sampleVideos);
    expect(report.nextContentRecommendations.length).toBeGreaterThan(0);
  });

  it("computes overall channel health label", () => {
    const report = analyzeChannelPerformance(sampleVideos);
    expect(["excellent", "good", "needs_improvement", "critical"]).toContain(report.overallChannelHealth);
  });

  it("generates topic boost factors", () => {
    const report = analyzeChannelPerformance(sampleVideos);
    const boosts = getTopicBoostFactors(report);
    expect(boosts.size).toBeGreaterThan(0);
    const pythonBoost = boosts.get("python programming");
    if (pythonBoost !== undefined) {
      expect(pythonBoost).toBeGreaterThanOrEqual(1.0);
    }
  });
});


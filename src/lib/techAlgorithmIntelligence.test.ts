import { describe, it, expect } from "vitest";
import {
  calculateAlgorithmScore,
  getTrendingTechTopics,
  analyzeChannelRetention,
  buildRetentionOptimizedBlueprint,
  type ChannelVideoMetric,
} from "./techAlgorithmIntelligence";

describe("techAlgorithmIntelligence", () => {
  it("calculates high algorithm score for high volume low competition topics", () => {
    const topic = {
      id: "test-1",
      category: "ai_agents_llms" as const,
      categoryLabel: "AI Agents",
      topicTitle: "Autonomous Coding Agents",
      searchVolumeScore: 95,
      competitionIndex: "low" as const,
      viralVelocity: 2.2,
      targetKeywords: ["coding agents"],
      suggestedHook: "Stop coding manually.",
      retentionMultiplier: 1.4,
      bestFormat: "long_form" as const,
    };

    const score = calculateAlgorithmScore(topic);
    expect(score).toBeGreaterThan(85);
    expect(score).toBeLessThanOrEqual(99);
  });

  it("retrieves sorted trending tech topics by algorithm score", () => {
    const topics = getTrendingTechTopics();
    expect(topics.length).toBeGreaterThanOrEqual(5);

    // Verify descending order
    for (let i = 0; i < topics.length - 1; i++) {
      expect(topics[i].algorithmScore).toBeGreaterThanOrEqual(topics[i + 1].algorithmScore);
    }
  });

  it("filters trending tech topics by category", () => {
    const aiTopics = getTrendingTechTopics("ai_agents_llms");
    expect(aiTopics.length).toBeGreaterThan(0);
    expect(aiTopics.every(t => t.category === "ai_agents_llms")).toBe(true);
  });

  it("analyzes channel retention metrics and identifies drop-off remedies", () => {
    const mockMetrics: ChannelVideoMetric[] = [
      {
        videoId: "v1",
        title: "How to Build an AI Agent",
        category: "AI",
        views: 12500,
        durationSec: 420,
        averageViewDurationSec: 270,
        retentionPercentage: 64.2,
        clickThroughRate: 9.1,
      },
      {
        videoId: "v2",
        title: "Rust Beginner Tutorial",
        category: "Coding",
        views: 4500,
        durationSec: 600,
        averageViewDurationSec: 210,
        retentionPercentage: 35.0,
        clickThroughRate: 5.4,
      },
    ];

    const analysis = analyzeChannelRetention(mockMetrics);
    expect(analysis.channelOverallRetention).toBeCloseTo(49.6, 1);
    expect(analysis.channelAvgCTR).toBeCloseTo(7.25, 1);
    expect(analysis.topPerformingVideos[0].videoId).toBe("v1");
    expect(analysis.keyDropOffRemedies.length).toBeGreaterThan(0);
    expect(analysis.subscriberPreferenceSummary).toContain("How to Build an AI Agent");
  });

  it("provides optimal defaults when channel metrics are empty", () => {
    const analysis = analyzeChannelRetention([]);
    expect(analysis.channelOverallRetention).toBeGreaterThan(50);
    expect(analysis.highestRetentionArchetype.sceneChangeIntervalSec).toBe(3.5);
    expect(analysis.highestRetentionArchetype.hookType).toBe("problem_first");
  });

  it("builds a 6-scene retention-optimized blueprint with pattern-interrupt hook", () => {
    const topic = getTrendingTechTopics()[0];
    const blueprint = buildRetentionOptimizedBlueprint(topic);

    expect(blueprint.retentionEngineeredScenes.length).toBe(6);
    expect(blueprint.retentionEngineeredScenes[0].narrativeRole).toBe("pattern_interrupt_hook");
    expect(blueprint.retentionEngineeredScenes[0].durationSeconds).toBe(5);
    expect(blueprint.retentionEngineeredScenes[1].narrativeRole).toBe("curiosity_gap");
    expect(blueprint.retentionEngineeredScenes[3].narrativeRole).toBe("retention_anchor");
    expect(blueprint.recommendedFPS).toBe(60);
    expect(blueprint.targetLengthSeconds).toBeGreaterThan(60);
  });
});

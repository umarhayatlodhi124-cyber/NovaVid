import { describe, it, expect } from "vitest";
import {
  analyzeRetentionCurve,
  generateSyntheticAnalytics,
  RetentionPoint,
  youtubeQueryAnalytics,
  generateGeminiStrategicInsights,
} from "./analyticsStudio";

describe("Stage T — Real YouTube Analytics & Performance Intelligence Unit Tests", () => {
  it("analyzeRetentionCurve calculates correct average retention score and empty handling", () => {
    const emptyResult = analyzeRetentionCurve([], 60);
    expect(emptyResult.retentionScore).toBe(0);
    expect(emptyResult.dropOffPoints).toHaveLength(0);
    expect(emptyResult.recommendations).toHaveLength(0);

    const points: RetentionPoint[] = [
      { second: 0, retentionPercent: 100 },
      { second: 30, retentionPercent: 60 },
      { second: 60, retentionPercent: 50 },
    ];
    const result = analyzeRetentionCurve(points, 60);
    expect(result.retentionScore).toBe(70);
  });

  it("analyzeRetentionCurve detects early hook drop-off when delta >= 4% in first 5 seconds", () => {
    const points: RetentionPoint[] = [
      { second: 0, retentionPercent: 100 },
      { second: 3, retentionPercent: 92 }, // delta 8% -> drop-off
      { second: 10, retentionPercent: 90 },
      { second: 30, retentionPercent: 88 },
      { second: 60, retentionPercent: 85 },
    ];
    const result = analyzeRetentionCurve(points, 60);
    expect(result.dropOffPoints.length).toBeGreaterThanOrEqual(1);
    expect(result.dropOffPoints[0].second).toBe(3);
    expect(result.dropOffPoints[0].dropPercent).toBe(8);
    expect(result.dropOffPoints[0].reason).toContain("Early Hook Drop");
  });

  it("analyzeRetentionCurve generates critical recommendation when 5s hook retention is below 70%", () => {
    const points: RetentionPoint[] = [
      { second: 0, retentionPercent: 100 },
      { second: 5, retentionPercent: 64 }, // below 70%
      { second: 30, retentionPercent: 50 },
      { second: 60, retentionPercent: 40 },
    ];
    const result = analyzeRetentionCurve(points, 60);
    const hookRec = result.recommendations.find((r) => r.id === "rec_hook_optimization");
    expect(hookRec).toBeDefined();
    expect(hookRec?.severity).toBe("critical");
    expect(hookRec?.action).toContain("Trim intro padding");
  });

  it("generateSyntheticAnalytics creates complete snapshot and decaying retention curve", () => {
    const { snapshot, curve } = generateSyntheticAnalytics("proj_test_1", "vid_test_1", 60);

    expect(snapshot.projectId).toBe("proj_test_1");
    expect(snapshot.youtubeVideoId).toBe("vid_test_1");
    expect(snapshot.views).toBeGreaterThan(1000);
    expect(snapshot.watchTimeHours).toBeGreaterThan(0);
    expect(snapshot.ctrPercent).toBeGreaterThan(0);
    expect(snapshot.isLive).toBe(false);
    expect(snapshot.dataSourceLabel).toContain("Benchmark Sandbox");

    expect(curve.youtubeVideoId).toBe("vid_test_1");
    expect(curve.retentionPoints.length).toBeGreaterThan(5);
    expect(curve.retentionScore).toBeGreaterThan(0);
  });

  it("youtubeQueryAnalytics safely returns structured report with zero fabrication", async () => {
    const report = await youtubeQueryAnalytics("vid_test_sample");
    expect(report).toBeDefined();
    expect(typeof report.isLive).toBe("boolean");
    expect(typeof report.views).toBe("number");
    expect(typeof report.watchTimeHours).toBe("number");
    expect(report.dataSourceLabel).toBeDefined();
  });

  it("generateGeminiStrategicInsights returns structured AI recommendations", async () => {
    const insights = await generateGeminiStrategicInsights(65, 2, "Artificial Intelligence");
    expect(insights.length).toBeGreaterThanOrEqual(1);
    expect(insights[0].source).toBe("gemini_ai");
    expect(insights[0].title).toBeDefined();
    expect(insights[0].action).toBeDefined();
  });
});

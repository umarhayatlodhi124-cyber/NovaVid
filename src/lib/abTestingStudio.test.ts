import { describe, it, expect } from "vitest";
import { generateABExperiment } from "./abTestingStudio";

describe("A/B Testing Studio Engine", () => {
  it("generates 3 title and thumbnail variants with one predicted winner", () => {
    const exp = generateABExperiment("Machine Learning", "technology");
    expect(exp.variants).toHaveLength(3);
    const winners = exp.variants.filter((v) => v.isPredictedWinner);
    expect(winners).toHaveLength(1);
    expect(exp.overallRecommendation).toContain("Variant");
  });

  it("calculates valid predicted CTR percentages between 3% and 15%", () => {
    const exp = generateABExperiment("Freelancing Tips", "finance");
    exp.variants.forEach((v) => {
      expect(v.predictedCTR).toBeGreaterThanOrEqual(3.0);
      expect(v.predictedCTR).toBeLessThanOrEqual(15.0);
      expect(v.confidenceScore).toBeGreaterThanOrEqual(50);
    });
  });
});


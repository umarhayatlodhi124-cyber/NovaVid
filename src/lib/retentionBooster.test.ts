import { describe, it, expect } from "vitest";
import { analyzeScriptRetention } from "./retentionBooster";

describe("Retention Booster & Hook Engine", () => {
  it("analyzes empty or standard script and returns structured report", () => {
    const report = analyzeScriptRetention("");
    expect(report.averageRetentionPercent).toBeGreaterThan(0);
    expect(report.hookScore).toBeGreaterThanOrEqual(50);
    expect(report.retentionNodes.length).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThanOrEqual(2);
  });

  it("identifies high drop-off risks in complex scripts and suggests pattern interrupts", () => {
    const script = `
      Did you know that 99% of people fail at coding within their first week?
      The problem is they follow outdated courses that teach syntax instead of building real software.
      When you sit down to write your first program, you immediately get overwhelmed by countless terminal errors.
      Most students give up right here because they do not have an automated AI mentor guiding their workflow.
      Today, I am going to reveal the exact 3-step strategy that allows anyone to build full apps in 30 days.
    `;
    const report = analyzeScriptRetention(script);
    expect(report.scriptWordCount).toBeGreaterThan(20);
    expect(report.estimatedVideoLengthMinutes).toBeGreaterThan(0);

    const highRiskNodes = report.retentionNodes.filter((n) => n.suggestedInterrupt !== undefined);
    expect(highRiskNodes.length).toBeGreaterThan(0);
  });
});


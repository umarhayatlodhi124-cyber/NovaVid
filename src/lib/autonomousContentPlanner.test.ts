import { describe, it, expect } from "vitest";
import { generateContentCalendar, groupByWeek, buildMonthlyCalendar, type ContentPlannerConfig } from "./autonomousContentPlanner";

const baseConfig: ContentPlannerConfig = {
  niche: "technology", language: "Urdu", channelGoal: "balanced",
  videosPerWeek: 2, includeShorts: true, shortsPerWeek: 1, weeksToplan: 4, startDate: "2025-01-06",
};

describe("Autonomous Content Planner", () => {
  it("generates slots for 4 weeks", () => {
    const slots = generateContentCalendar(baseConfig);
    expect(slots.length).toBeGreaterThanOrEqual(8);
  });

  it("every slot has a strategic rationale", () => {
    const slots = generateContentCalendar(baseConfig);
    slots.forEach((s) => expect(s.strategicRationale.length).toBeGreaterThan(10));
  });

  it("shorts slots have correct format and duration", () => {
    const slots = generateContentCalendar(baseConfig);
    const shorts = slots.filter((s) => s.isShorts);
    expect(shorts.length).toBeGreaterThan(0);
    shorts.forEach((s) => {
      expect(s.videoFormat).toBe("shorts");
      expect(s.estimatedDurationMinutes).toBe(1);
    });
  });

  it("all slots have valid status of planned", () => {
    const slots = generateContentCalendar(baseConfig);
    slots.forEach((s) => expect(s.status).toBe("planned"));
  });

  it("groups slots into weekly strategies", () => {
    const slots = generateContentCalendar(baseConfig);
    const weeks = groupByWeek(slots);
    expect(weeks.length).toBeGreaterThan(0);
    weeks.forEach((w) => { expect(w.totalVideos).toBeGreaterThan(0); expect(w.strategicNotes.length).toBeGreaterThan(0); });
  });

  it("builds monthly calendar with content mix", () => {
    const slots = generateContentCalendar(baseConfig);
    const calendar = buildMonthlyCalendar(slots, 2025, 1);
    expect(calendar.monthName).toBe("January");
    expect(calendar.recommendation.length).toBeGreaterThan(10);
  });
});


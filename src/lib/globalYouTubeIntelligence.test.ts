import { describe, it, expect } from "vitest";
import { discoverTopics, createIntelligenceSession, sortTopicsByOpportunity, filterTopicsByFormat } from "./globalYouTubeIntelligence";

describe("Global YouTube Intelligence Engine", () => {
  it("generates at least 20 topic suggestions in new channel mode", () => {
    const topics = discoverTopics("technology", "English", "Pakistan", "new_channel", undefined, 20);
    expect(topics.length).toBeGreaterThanOrEqual(20);
  });

  it("every topic has an opportunity score between 0 and 100", () => {
    const topics = discoverTopics("technology", "English", "Pakistan", "new_channel");
    topics.forEach((t) => {
      expect(t.opportunityScore).toBeGreaterThanOrEqual(0);
      expect(t.opportunityScore).toBeLessThanOrEqual(100);
    });
  });

  it("every topic has required fields", () => {
    const topics = discoverTopics("technology", "English", "Pakistan", "new_channel");
    topics.forEach((t) => {
      expect(t.id).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.confidenceLevel).toMatch(/^(high|medium|low)$/);
    });
  });

  it("creates a full intelligence session with mode and disclaimer", () => {
    const session = createIntelligenceSession({ niche: "technology", language: "Urdu", region: "Pakistan", mode: "new_channel" });
    expect(session.mode).toBe("new_channel");
    expect(session.disclaimer).toContain("NovaVid");
    expect(session.suggestions.length).toBeGreaterThanOrEqual(20);
  });

  it("sorts topics by opportunity score descending", () => {
    const topics = discoverTopics("technology", "English", "Pakistan", "new_channel");
    const sorted = sortTopicsByOpportunity(topics);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].opportunityScore).toBeGreaterThanOrEqual(sorted[i + 1].opportunityScore);
    }
  });

  it("filters topics by format correctly", () => {
    const topics = discoverTopics("technology", "English", "Pakistan", "new_channel", undefined, 20);
    const tutorials = filterTopicsByFormat(topics, "tutorial");
    tutorials.forEach((t) => expect(t.recommendedFormat).toBe("tutorial"));
  });

  it("works without channel analytics in new channel mode", () => {
    expect(() => discoverTopics("technology", "Urdu", "Pakistan", "new_channel")).not.toThrow();
  });
});


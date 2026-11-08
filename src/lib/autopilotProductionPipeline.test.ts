import { describe, it, expect } from "vitest";
import { 
  createAutopilotTechProduction, 
  buildChaptersFromBlueprint 
} from "./autopilotProductionPipeline";
import { getTrendingTechTopics } from "./techAlgorithmIntelligence";

describe("autopilotProductionPipeline", () => {
  it("creates a complete end-to-end autopilot tech production plan", () => {
    const topic = getTrendingTechTopics()[0];
    const plan = createAutopilotTechProduction("proj-autopilot-101", topic, undefined, "UC_TECH_CHANNEL");

    expect(plan.projectId).toBe("proj-autopilot-101");
    expect(plan.topic.id).toBe(topic.id);
    expect(plan.pipelineStatus).toBe("ready_to_render");

    // Audio loudness mastering specs (-14 LUFS, True Peak -1.0)
    expect(plan.audioSpecs.loudnessStandard).toBe("-14 LUFS (EBU R128)");
    expect(plan.audioSpecs.truePeakDb).toBe(-1.0);
    expect(plan.audioSpecs.volumeBoostMultiplier).toBe(1.35);
    expect(plan.audioSpecs.sampleRateHz).toBe(48000);
    expect(plan.audioSpecs.audioBitrate).toBe("256k");

    // Video quality specs (1080p 60fps visually lossless CRF 18)
    expect(plan.videoSpecs.resolution).toBe("1080p");
    expect(plan.videoSpecs.fps).toBe(60);
    expect(plan.videoSpecs.crf).toBe(18);
    expect(plan.videoSpecs.motionPreset).toBe("ken_burns_dynamic_zoompan");

    // HD 1280x720 Thumbnail
    expect(plan.thumbnailConcept.width).toBe(1280);
    expect(plan.thumbnailConcept.height).toBe(720);
    expect(plan.thumbnailConcept.style).toBe("tech_cyber");
    expect(plan.thumbnailConcept.headline).toBeDefined();

    // SEO Metadata
    expect(plan.seoMetadata.selectedTitle).toBe(topic.topicTitle);
    expect(plan.seoMetadata.categoryId).toBe("28"); // Science & Technology
    expect(plan.seoMetadata.chapters.length).toBe(6);
    expect(plan.seoMetadata.tags.length).toBeGreaterThan(5);
    expect(plan.seoMetadata.description).toContain("📌 TIMESTAMPS:");

    // Publish request
    expect(plan.publishPayload.privacyStatus).toBe("public");
    expect(plan.publishPayload.channelId).toBe("UC_TECH_CHANNEL");
    expect(plan.publishPayload.title).toBe(topic.topicTitle);
  });

  it("builds formatted chapters with sequential timestamps", () => {
    const topic = getTrendingTechTopics()[0];
    const plan = createAutopilotTechProduction("proj-1", topic);
    const chapters = buildChaptersFromBlueprint(plan.blueprint);

    expect(chapters[0].timestamp).toBe("00:00");
    expect(chapters.length).toBe(6);
    // Timestamps must be non-decreasing
    for (let i = 0; i < chapters.length - 1; i++) {
      expect(chapters[i + 1].seconds).toBeGreaterThan(chapters[i].seconds);
    }
  });
});

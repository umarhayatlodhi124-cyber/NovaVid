import { describe, it, expect, beforeEach } from "vitest";
import {
  NICHE_CATALOG,
  createDefaultTenantConfig,
  getTenantAutomationConfig,
  saveTenantAutomationConfig,
  generateDailyJobBatch,
  listTenantAutomationJobs,
  updateAutomationJob,
  resetAutomationMemoryForTests,
  type TenantAutomationConfig,
} from "./automation";

describe("Multi-Tenant Multi-Niche Daily Automation Engine", () => {
  beforeEach(() => {
    resetAutomationMemoryForTests();
  });

  it("1. Provides a universal multi-niche catalog without forced global restriction", () => {
    expect(NICHE_CATALOG.length).toBeGreaterThanOrEqual(8);

    const niches = NICHE_CATALOG.map((n) => n.id);
    expect(niches).toContain("tech_ai");
    expect(niches).toContain("cooking_food");
    expect(niches).toContain("finance_crypto");
    expect(niches).toContain("health_fitness");
    expect(niches).toContain("gaming_esports");
    expect(niches).toContain("motivation_mindset");
    expect(niches).toContain("history_mysteries");
    expect(niches).toContain("science_space");

    // Verify rich metadata
    const tech = NICHE_CATALOG.find((n) => n.id === "tech_ai")!;
    expect(tech.subNiches.length).toBeGreaterThanOrEqual(3);
    expect(tech.sampleTopics.length).toBeGreaterThanOrEqual(3);

    const cooking = NICHE_CATALOG.find((n) => n.id === "cooking_food")!;
    expect(cooking.subNiches).toContain("Quick 15-Minute Meals");
    expect(cooking.icon).toBe("🍳");
  });

  it("2. Sets Technology as LODHI TECHX owner initial niche without forcing it on other customers", () => {
    // Owner Account
    const ownerConfig = createDefaultTenantConfig(
      "owner-lodhi-uid",
      "test.lodhitechx@novavid.studio"
    );
    expect(ownerConfig.niche).toBe("tech_ai");
    expect(ownerConfig.channelTitle).toBe("Lodhi TechX");
    expect(ownerConfig.language).toBe("Urdu");

    // General Customer Account A (starts fresh with culinary/cooking default or customized)
    const customerConfig = createDefaultTenantConfig(
      "customer-user-uid-999",
      "chef.ahmed@culinarystudio.com"
    );
    expect(customerConfig.niche).toBe("cooking_food");
    expect(customerConfig.channelTitle).toBe("My YouTube Channel");
    expect(customerConfig.channelId).toBe(""); // Not tied to LODHI TECHX channel
  });

  it("3. Enforces strict tenant isolation between two separate customer accounts", async () => {
    const tenantAId = "tenant-alice-fitness-111";
    const tenantBId = "tenant-bob-crypto-222";

    // Tenant A configures Fitness Channel (Spanish, 4 Shorts, 2 Long)
    const configA: TenantAutomationConfig = {
      ...createDefaultTenantConfig(tenantAId, "alice@fitnesspro.com"),
      niche: "health_fitness",
      subNiche: "Fat Loss & Nutrition",
      channelId: "UC_ALICE_FITNESS_001",
      channelTitle: "Alice Extreme Fitness",
      language: "Hindi",
      voiceId: "hi-IN-MadhurNeural",
      dailyShortsTarget: 4,
      dailyLongTarget: 2,
      customTopics: ["5 Minute Core Burner", "High Protein Vegan Meal Prep"],
      excludedTopics: ["Steroids", "Dangerous Supplements"],
      shortsPublishTimes: ["08:00", "12:00", "16:00", "20:00"],
    };
    await saveTenantAutomationConfig(configA);

    // Tenant B configures Finance & Crypto Channel (Urdu, 2 Shorts, 3 Long)
    const configB: TenantAutomationConfig = {
      ...createDefaultTenantConfig(tenantBId, "bob@cryptoking.com"),
      niche: "finance_crypto",
      subNiche: "Cryptocurrency & Web3",
      channelId: "UC_BOB_CRYPTO_002",
      channelTitle: "Crypto Insights Urdu",
      language: "Urdu",
      voiceId: "ur-PK-AsadNeural",
      dailyShortsTarget: 2,
      dailyLongTarget: 3,
      customTopics: ["Bitcoin Next Bull Run", "Solana vs Ethereum 2026"],
      excludedTopics: ["Meme Coins", "Gambling"],
      longPublishTimes: ["11:00", "15:00", "19:00"],
    };
    await saveTenantAutomationConfig(configB);

    // Verify Tenant A loads strictly Tenant A data
    const loadedA = await getTenantAutomationConfig(tenantAId);
    expect(loadedA.channelId).toBe("UC_ALICE_FITNESS_001");
    expect(loadedA.niche).toBe("health_fitness");
    expect(loadedA.language).toBe("Hindi");
    expect(loadedA.dailyShortsTarget).toBe(4);
    expect(loadedA.dailyLongTarget).toBe(2);
    expect(loadedA.customTopics).toContain("5 Minute Core Burner");

    // Verify Tenant B loads strictly Tenant B data
    const loadedB = await getTenantAutomationConfig(tenantBId);
    expect(loadedB.channelId).toBe("UC_BOB_CRYPTO_002");
    expect(loadedB.niche).toBe("finance_crypto");
    expect(loadedB.language).toBe("Urdu");
    expect(loadedB.dailyShortsTarget).toBe(2);
    expect(loadedB.dailyLongTarget).toBe(3);
    expect(loadedB.customTopics).toContain("Bitcoin Next Bull Run");

    // Verify ZERO data leakage between tenants
    expect(loadedA.customTopics).not.toContain("Bitcoin Next Bull Run");
    expect(loadedB.customTopics).not.toContain("5 Minute Core Burner");
    expect(loadedA.channelTitle).not.toBe(loadedB.channelTitle);
  });

  it("4. Generates daily batches with default target of 3 Shorts and 3 Long videos", () => {
    const tenantId = "tenant-default-quota-333";
    const config = createDefaultTenantConfig(tenantId, "creator@novavid.studio");
    expect(config.dailyShortsTarget).toBe(3);
    expect(config.dailyLongTarget).toBe(3);

    const today = "2026-11-08";
    const batch = generateDailyJobBatch(config, today);

    // Total 6 videos per day
    expect(batch.length).toBe(6);

    const shorts = batch.filter((j) => j.format === "short");
    const longs = batch.filter((j) => j.format === "long");

    expect(shorts.length).toBe(3);
    expect(longs.length).toBe(3);

    // Verify distinct slot indexes and publishing times
    expect(shorts.map((s) => s.slotIndex)).toEqual([1, 2, 3]);
    expect(longs.map((l) => l.slotIndex)).toEqual([1, 2, 3]);
    expect(shorts.map((s) => s.scheduledTime)).toEqual(["10:00", "14:00", "18:00"]);
    expect(longs.map((l) => l.scheduledTime)).toEqual(["12:00", "16:00", "20:00"]);

    // Verify tenant ownership on all jobs
    for (const job of batch) {
      expect(job.userId).toBe(tenantId);
      expect(job.status).toBe("scheduled");
      expect(job.date).toBe(today);
    }
  });

  it("5. Respects excluded topics and maintains idempotency across multiple batch runs", () => {
    const tenantId = "tenant-idempotent-444";
    const config: TenantAutomationConfig = {
      ...createDefaultTenantConfig(tenantId),
      niche: "gaming_esports",
      subNiche: "Esports Tournaments",
      customTopics: [
        "Uncensored Violent Game Review", // Should be filtered out
        "Top 5 Competitive Tactics in Valorant",
        "How To Optimize Ping and Framerate",
      ],
      excludedTopics: ["Violent", "Explicit"],
      dailyShortsTarget: 2,
      dailyLongTarget: 2,
    };

    const date = "2026-11-09";
    const batch1 = generateDailyJobBatch(config, date);
    expect(batch1.length).toBe(4);

    // Verify excluded topic is filtered out
    const allTopics = batch1.map((j) => j.topic);
    expect(allTopics.some((t) => t.includes("Violent"))).toBe(false);

    // Second run on the same date must be idempotent (no duplicate jobs created)
    const batch2 = generateDailyJobBatch(config, date);
    expect(batch2.length).toBe(4);
    expect(batch2.map((j) => j.id)).toEqual(batch1.map((j) => j.id));
  });

  it("6. Tracks isolated job execution status progression per tenant", async () => {
    const tenantId = "tenant-progress-555";
    const config = createDefaultTenantConfig(tenantId);
    const [job] = generateDailyJobBatch(config, "2026-11-10");

    expect(job.status).toBe("scheduled");

    // Progress job to rendering
    job.status = "rendering";
    job.projectId = "proj-auto-render-01";
    await updateAutomationJob(job);

    let jobs = await listTenantAutomationJobs(tenantId);
    expect(jobs.find((j) => j.id === job.id)?.status).toBe("rendering");

    // Progress job to published
    job.status = "published";
    job.youtubeVideoId = "yt_test_vid_888";
    job.youtubeUrl = "https://youtu.be/yt_test_vid_888";
    job.completedAt = new Date().toISOString();
    await updateAutomationJob(job);

    jobs = await listTenantAutomationJobs(tenantId);
    const updated = jobs.find((j) => j.id === job.id)!;
    expect(updated.status).toBe("published");
    expect(updated.youtubeVideoId).toBe("yt_test_vid_888");
    expect(updated.youtubeUrl).toBe("https://youtu.be/yt_test_vid_888");

    // Another tenant querying jobs sees empty
    const otherTenantJobs = await listTenantAutomationJobs("tenant-other-999");
    expect(otherTenantJobs.length).toBe(0);
  });
});

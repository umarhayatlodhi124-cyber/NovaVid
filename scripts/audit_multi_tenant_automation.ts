import {
  generateDailyJobBatch,
  type TenantAutomationConfig,
  type DailyAutomationJob,
  NICHE_CATALOG,
} from "../src/lib/automation";

async function runAudit() {
  console.log("=== NOVAVID 2.0 — MULTI-TENANT AUTOMATION INDEPENDENT AUDIT ===");

  // 1. Tenant A: Health & Fitness in New York
  const tenantA: TenantAutomationConfig = {
    userId: "tenant_health_101",
    channelId: "UC_health_channel_aaa",
    channelTitle: "Elite Wellness & Nutrition",
    niche: "health_fitness",
    subNiche: "Quick Home Workouts & HIIT",
    customTopics: ["10-Min Morning Calisthenics", "Intermittent Fasting Myths"],
    excludedTopics: ["Steroids", "Extreme Diets"],
    language: "English",
    voiceId: "en-US-GuyNeural",
    voiceGender: "Male",
    dailyShortsTarget: 3,
    dailyLongTarget: 3,
    scheduleTimezone: "America/New_York",
    shortsPublishTimes: ["08:00", "12:00", "17:00"],
    longPublishTimes: ["10:00", "14:00", "19:00"],
    approvalMode: "auto_publish",
    privacyDefault: "private",
    enabled: true,
    updatedAt: new Date().toISOString(),
  };

  // 2. Tenant B: Personal Finance & Crypto in Karachi
  const tenantB: TenantAutomationConfig = {
    userId: "tenant_finance_202",
    channelId: "UC_finance_channel_bbb",
    channelTitle: "Pakistan FinTech & Wealth",
    niche: "finance_crypto",
    subNiche: "Stock Market & Index Investing",
    customTopics: ["PSX 100 Index Analysis", "Digital Bank Accounts"],
    excludedTopics: ["Gambling", "Ponzi Schemes"],
    language: "Urdu",
    voiceId: "ur-PK-AsadNeural",
    voiceGender: "Male",
    dailyShortsTarget: 4,
    dailyLongTarget: 2,
    scheduleTimezone: "Asia/Karachi",
    shortsPublishTimes: ["11:00", "14:00", "17:00", "20:00"],
    longPublishTimes: ["13:00", "18:00"],
    approvalMode: "require_approval",
    privacyDefault: "private",
    enabled: true,
    updatedAt: new Date().toISOString(),
  };

  const testDate = "2026-11-09";

  // Generate jobs for Tenant A
  const jobsA = generateDailyJobBatch(tenantA, testDate);
  // Generate jobs for Tenant B
  const jobsB = generateDailyJobBatch(tenantB, testDate);

  console.log("\n--- Tenant A Results (Health & Fitness) ---");
  console.log(`User ID: ${tenantA.userId}`);
  console.log(`Channel: ${tenantA.channelTitle}`);
  console.log(`Timezone: ${tenantA.scheduleTimezone}`);
  console.log(`Total Jobs Generated: ${jobsA.length}`);
  const shortsA = jobsA.filter((j) => j.format === "short");
  const longsA = jobsA.filter((j) => j.format === "long");
  console.log(`Shorts count: ${shortsA.length} (Expected: 3)`);
  console.log(`Long videos count: ${longsA.length} (Expected: 3)`);
  jobsA.forEach((j, i) => {
    console.log(`  Job ${i + 1} [${j.format.toUpperCase()} @ ${j.scheduledTime}]: ${j.topic}`);
  });

  console.log("\n--- Tenant B Results (Personal Finance & Crypto) ---");
  console.log(`User ID: ${tenantB.userId}`);
  console.log(`Channel: ${tenantB.channelTitle}`);
  console.log(`Timezone: ${tenantB.scheduleTimezone}`);
  console.log(`Total Jobs Generated: ${jobsB.length}`);
  const shortsB = jobsB.filter((j) => j.format === "short");
  const longsB = jobsB.filter((j) => j.format === "long");
  console.log(`Shorts count: ${shortsB.length} (Expected: 4)`);
  console.log(`Long videos count: ${longsB.length} (Expected: 2)`);
  jobsB.forEach((j, i) => {
    console.log(`  Job ${i + 1} [${j.format.toUpperCase()} @ ${j.scheduledTime}]: ${j.topic}`);
  });

  // Verify Tenant Isolation
  console.log("\n--- Verifying Strict Tenant Isolation ---");
  const tenantAUserIds = new Set(jobsA.map((j) => j.userId));
  const tenantBUserIds = new Set(jobsB.map((j) => j.userId));
  const isTenantAIsolated = tenantAUserIds.size === 1 && tenantAUserIds.has("tenant_health_101");
  const isTenantBIsolated = tenantBUserIds.size === 1 && tenantBUserIds.has("tenant_finance_202");
  console.log(`Tenant A strictly isolated: ${isTenantAIsolated}`);
  console.log(`Tenant B strictly isolated: ${isTenantBIsolated}`);

  // Cross-contamination check
  const topicOverlap = jobsA.some((ja) => jobsB.some((jb) => ja.topic === jb.topic));
  console.log(`Zero topic contamination between Tenant A & B: ${!topicOverlap}`);

  // Duplicate Prevention Check (Idempotency)
  console.log("\n--- Verifying Duplicate Prevention (Idempotency) ---");
  const secondBatchA = generateDailyJobBatch(tenantA, testDate);
  const isDuplicateFree = secondBatchA.length === 6 && secondBatchA.every((j, i) => j.id === jobsA[i].id);
  console.log(`Calling generate twice returns exact existing slots without duplicates: ${isDuplicateFree}`);

  console.log("\n=== Independent Audit Complete ===");
}

runAudit();

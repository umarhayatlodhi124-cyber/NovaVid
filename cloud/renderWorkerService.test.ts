import { describe, it, expect, beforeEach } from "vitest";
import {
  CloudRenderWorkerService,
  QUALITY_PROFILES,
  type CloudRenderJob,
} from "./renderWorkerService";

describe("CloudRenderWorkerService — Independent Cloud Video Renderer", () => {
  let worker: CloudRenderWorkerService;

  beforeEach(() => {
    worker = new CloudRenderWorkerService({
      maxConcurrency: 2,
      s3Bucket: "novavid-test-exports",
      defaultMaxRetries: 3,
    });
  });

  it("verifies broadcast quality profile specs (1080p 6000kbps 192kbps AAC)", () => {
    const profile = QUALITY_PROFILES.broadcast_vbr_1080p;
    expect(profile.resolution).toBe("1080p");
    expect(profile.videoBitrateKbps).toBe(6000);
    expect(profile.audioBitrateKbps).toBe(192);
    expect(profile.audioSampleRateHz).toBe(44100);
    expect(profile.codec).toBe("libx264");
    expect(profile.crf).toBe(18);
  });

  it("submits a render job with strict idempotency", async () => {
    const jobData = {
      jobId: "job_tenant_tech_01",
      idempotencyKey: "idem_key_tech_scene_01",
      tenantId: "cust_technology_lodhi",
      projectId: "proj_tech_001",
      title: "AI Automation Breakthroughs",
      niche: "Technology & AI",
      aspectRatio: "16:9" as const,
      profile: "broadcast_vbr_1080p" as const,
      scenes: [
        {
          id: "sc_1",
          order: 1,
          durationSeconds: 15,
          visualAssetUrl: "https://s3.amazonaws.com/novavid/assets/sc1.png",
          audioNarrationUrl: "https://s3.amazonaws.com/novavid/assets/sc1.mp3",
        },
      ],
    };

    const firstSubmit = await worker.submitJob(jobData);
    expect(firstSubmit.status).toBe("queued");
    expect(firstSubmit.progressPercent).toBe(0);
    expect(firstSubmit.firestoreDocPath).toBe("tenants/cust_technology_lodhi/render_jobs/job_tenant_tech_01");

    // Re-submitting with identical idempotency key must return existing job
    const duplicateSubmit = await worker.submitJob({
      ...jobData,
      title: "Altered Title Attempt",
    });
    expect(duplicateSubmit.jobId).toBe(firstSubmit.jobId);
    expect(duplicateSubmit.title).toBe("AI Automation Breakthroughs"); // Original preserved
  });

  it("executes full cloud rendering lifecycle from 0% to 100% with progress tracking", async () => {
    const progressHistory: number[] = [];
    worker.onProgress((job) => {
      progressHistory.push(job.progressPercent);
    });

    await worker.submitJob({
      jobId: "job_full_lifecycle_01",
      idempotencyKey: "idem_lifecycle_01",
      tenantId: "cust_cooking_tasty",
      projectId: "proj_cook_001",
      title: "5 Minute Mughlai Biryani",
      niche: "Cooking & Recipes",
      aspectRatio: "9:16",
      profile: "standard_1080p",
      scenes: [
        {
          id: "sc_biryani_1",
          order: 1,
          durationSeconds: 10,
          visualAssetUrl: "https://s3.amazonaws.com/novavid/cook/scene1.png",
          audioNarrationUrl: "https://s3.amazonaws.com/novavid/cook/scene1.mp3",
        },
      ],
    });

    const completedJob = await worker.executeJob("job_full_lifecycle_01");

    expect(completedJob.status).toBe("completed");
    expect(completedJob.progressPercent).toBe(100);
    expect(completedJob.completedAt).toBeDefined();
    expect(completedJob.s3ExportUrl).toContain("novavid-exports-cloud.s3.amazonaws.com/exports/cust_cooking_tasty/job_full_lifecycle_01_9x16.mp4");
    expect(progressHistory).toContain(100);
    expect(completedJob.logs.some((l) => l.includes("FFmpeg encoding progress"))).toBe(true);
  });

  it("handles transient failure with retry_pending and permanently fails to DLQ on max retries", async () => {
    await worker.submitJob({
      jobId: "job_retry_test_01",
      idempotencyKey: "idem_retry_01",
      tenantId: "cust_finance_01",
      projectId: "proj_fin_001",
      title: "Crypto Staking Guide",
      niche: "Finance",
      aspectRatio: "16:9",
      profile: "draft_720p",
      maxAttempts: 2,
      scenes: [],
    });

    // Attempt 1: Transient failure at 10%
    const attempt1 = await worker.executeJob("job_retry_test_01", 10);
    expect(attempt1.status).toBe("retry_pending");
    expect(attempt1.currentAttempt).toBe(1);
    expect(worker.getDeadLetterQueue().length).toBe(0);

    // Attempt 2: Failure again, hitting maxAttempts (2) -> moved to DLQ
    const attempt2 = await worker.executeJob("job_retry_test_01", 50);
    expect(attempt2.status).toBe("failed");
    expect(attempt2.currentAttempt).toBe(2);
    expect(worker.getDeadLetterQueue().length).toBe(1);
    expect(worker.getDeadLetterQueue()[0].jobId).toBe("job_retry_test_01");
  });

  it("guarantees strict tenant isolation when listing render jobs", async () => {
    await worker.submitJob({
      jobId: "job_tenant_a",
      idempotencyKey: "idem_a",
      tenantId: "tenant_alpha",
      projectId: "proj_a",
      title: "Alpha Video",
      niche: "Tech",
      aspectRatio: "16:9",
      profile: "standard_1080p",
      scenes: [],
    });

    await worker.submitJob({
      jobId: "job_tenant_b",
      idempotencyKey: "idem_b",
      tenantId: "tenant_beta",
      projectId: "proj_b",
      title: "Beta Video",
      niche: "Fitness",
      aspectRatio: "9:16",
      profile: "standard_1080p",
      scenes: [],
    });

    const tenantAJobs = worker.listJobsByTenant("tenant_alpha");
    const tenantBJobs = worker.listJobsByTenant("tenant_beta");

    expect(tenantAJobs.length).toBe(1);
    expect(tenantAJobs[0].jobId).toBe("job_tenant_a");
    expect(tenantBJobs.length).toBe(1);
    expect(tenantBJobs[0].jobId).toBe("job_tenant_b");
  });
});

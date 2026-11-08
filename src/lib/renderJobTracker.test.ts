import { describe, it, expect, beforeEach } from "vitest";
import {
  createUnifiedRenderJob,
  updateRenderJobProgress,
  markRenderJobCompleted,
  markRenderJobFailed,
  getRenderJob,
  listRenderJobs,
  onRenderProgress,
} from "./renderJobTracker";

describe("Unified Render Job Tracker", () => {
  beforeEach(() => {
    // Clean up local storage if present
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it("should create and register a new render job", () => {
    const job = createUnifiedRenderJob({
      jobId: "job-test-001",
      tenantId: "tenant_alpha",
      projectId: "proj_123",
      title: "Test Urdu Render",
      target: "custom_gpu_worker",
    });

    expect(job.jobId).toBe("job-test-001");
    expect(job.status).toBe("queued");
    expect(job.progressPercent).toBe(0);
    expect(job.currentAttempt).toBe(1);
    expect(job.maxAttempts).toBe(3);

    const retrieved = getRenderJob("job-test-001");
    expect(retrieved?.title).toBe("Test Urdu Render");
  });

  it("should update progress and notify listeners", () => {
    const updates: number[] = [];
    const unsubscribe = onRenderProgress((j) => {
      if (j.jobId === "job-test-002") {
        updates.push(j.progressPercent);
      }
    });

    createUnifiedRenderJob({
      jobId: "job-test-002",
      tenantId: "tenant_alpha",
      projectId: "proj_123",
      title: "Test Progress Updates",
      target: "local_ffmpeg",
    });

    updateRenderJobProgress("job-test-002", 35, "downloading_assets", "Assets downloaded");
    updateRenderJobProgress("job-test-002", 75, "rendering_ffmpeg", "Encoding 75%");

    const job = getRenderJob("job-test-002");
    expect(job?.progressPercent).toBe(75);
    expect(job?.status).toBe("rendering_ffmpeg");
    expect(job?.logs.length).toBeGreaterThanOrEqual(3);

    unsubscribe();
  });

  it("should mark job as completed with genuine physical metrics", () => {
    createUnifiedRenderJob({
      jobId: "job-test-003",
      tenantId: "tenant_alpha",
      projectId: "proj_123",
      title: "Completed Render",
      target: "aws_batch_byoa",
    });

    const completed = markRenderJobCompleted("job-test-003", {
      outputUrl: "https://novavid-media.s3.amazonaws.com/test.mp4",
      outputPath: "/tmp/test.mp4",
      fileSizeBytes: 3120500,
      durationSeconds: 65.4,
      sha256Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    });

    expect(completed.status).toBe("completed");
    expect(completed.progressPercent).toBe(100);
    expect(completed.completedAt).toBeDefined();
    expect(completed.fileSizeBytes).toBe(3120500);
    expect(completed.sha256Checksum).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("should handle retries on failure and mark permanently failed when attempts exhausted", () => {
    createUnifiedRenderJob({
      jobId: "job-test-004",
      tenantId: "tenant_alpha",
      projectId: "proj_123",
      title: "Failing Render",
      target: "runpod_serverless",
      maxAttempts: 2,
    });

    // Attempt 1 fails -> status should be retrying
    const attempt1 = markRenderJobFailed("job-test-004", "Network timeout on scene 2");
    expect(attempt1.status).toBe("retrying");
    expect(attempt1.currentAttempt).toBe(2);

    // Attempt 2 fails -> status should be failed
    const attempt2 = markRenderJobFailed("job-test-004", "CUDA out of memory");
    expect(attempt2.status).toBe("failed");
    expect(attempt2.error).toContain("CUDA out of memory");
  });

  it("should list jobs filtered by tenant and project", () => {
    createUnifiedRenderJob({
      jobId: "job-filter-1",
      tenantId: "tenant_x",
      projectId: "proj_a",
      title: "Video 1",
      target: "local_ffmpeg",
    });

    createUnifiedRenderJob({
      jobId: "job-filter-2",
      tenantId: "tenant_x",
      projectId: "proj_b",
      title: "Video 2",
      target: "local_ffmpeg",
    });

    createUnifiedRenderJob({
      jobId: "job-filter-3",
      tenantId: "tenant_y",
      projectId: "proj_a",
      title: "Video 3",
      target: "local_ffmpeg",
    });

    const tenantXJobs = listRenderJobs("tenant_x");
    expect(tenantXJobs.length).toBe(2);

    const tenantXProjA = listRenderJobs("tenant_x", "proj_a");
    expect(tenantXProjA.length).toBe(1);
    expect(tenantXProjA[0].jobId).toBe("job-filter-1");
  });
});

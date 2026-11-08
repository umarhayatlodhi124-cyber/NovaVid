import { describe, it, expect, beforeEach } from "vitest";
import { AwsCloudExecutionEngine } from "./awsSqsWorker";

describe("Phase 7: AWS Cloud Background Workers & Execution Engine Unit Tests", () => {
  let engine: AwsCloudExecutionEngine;

  beforeEach(() => {
    engine = new AwsCloudExecutionEngine();
  });

  it("successfully enqueues SQS message and progresses headless rendering", async () => {
    const jobId = await engine.enqueueJob({
      jobId: "job-sqs-test-1",
      projectId: "proj-1",
      userId: "user-1",
      orgId: null,
      priority: "high",
      payload: {
        title: "Cloud Video Test",
        topic: "AWS SQS Headless Worker",
        language: "Urdu",
        resolution: "1080p",
        aspectRatio: "16:9",
        fps: 30,
        scenesCount: 3,
      },
    });

    expect(jobId).toBe("job-sqs-test-1");

    // Process job headless
    const result = await engine.processJobHeadless(jobId);
    expect(result.status).toBe("completed");
    expect(result.progressPercent).toBe(100);
    expect(result.s3ExportUrl).toContain("s3.us-east-1.amazonaws.com");
  });

  it("calculates compute costs and adheres to cost controls", async () => {
    const metricsBefore = engine.getCostMetrics();
    expect(metricsBefore.totalCostIncurredUsd).toBe(0.0);
    expect(metricsBefore.budgetAlertTriggered).toBe(false);

    await engine.enqueueJob({
      jobId: "job-cost-test",
      projectId: "proj-2",
      userId: "user-2",
      orgId: null,
      priority: "normal",
      payload: {
        title: "Cost Test",
        topic: "Testing compute",
        language: "English",
        resolution: "1080p",
        aspectRatio: "16:9",
        fps: 30,
        scenesCount: 2,
      },
    });

    await engine.processJobHeadless("job-cost-test");
    const metricsAfter = engine.getCostMetrics();
    expect(metricsAfter.totalCostIncurredUsd).toBeGreaterThan(0.0);
    expect(metricsAfter.budgetAlertTriggered).toBe(false);
  });

  it("generates compliant S3 presigned URLs", () => {
    const url = engine.generatePresignedS3Url("my-bucket", "exports/vid1.mp4", 3600);
    expect(url).toBe("https://my-bucket.s3.us-east-1.amazonaws.com/exports/vid1.mp4?X-Amz-Expires=3600&X-Amz-Signature=auth_verified_sig");
  });
});

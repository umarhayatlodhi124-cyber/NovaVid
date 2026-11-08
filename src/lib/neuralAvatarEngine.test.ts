import { describe, it, expect } from "vitest";
import {
  calculateBenchmarkCost,
  generateDurationBenchmarkMatrix,
  NeuralAvatarInferenceService,
} from "./neuralAvatarEngine";

describe("NeuralAvatarEngine — Benchmarking & Inference Adapter", () => {
  it("calculates cost and GPU timing for 60-second video", () => {
    const didCost = calculateBenchmarkCost(60, "d-id");
    expect(didCost.totalCostUsd).toBe(0.24);
    expect(didCost.estimatedGpuSeconds).toBe(30);

    const heygenCost = calculateBenchmarkCost(60, "heygen");
    expect(heygenCost.totalCostUsd).toBe(0.75);
    expect(heygenCost.estimatedGpuSeconds).toBe(48);

    const selfHostedCost = calculateBenchmarkCost(60, "self_hosted_gpu");
    expect(selfHostedCost.totalCostUsd).toBeCloseTo(0.0037, 3);
    expect(selfHostedCost.estimatedGpuSeconds).toBe(60);
  });

  it("calculates cost for 5-minute (300s) and 10-minute (600s) long-form video", () => {
    const did5Min = calculateBenchmarkCost(300, "d-id");
    expect(did5Min.totalCostUsd).toBe(1.2); // 5 min * $0.24

    const did10Min = calculateBenchmarkCost(600, "d-id");
    expect(did10Min.totalCostUsd).toBe(2.4); // 10 min * $0.24

    const selfHosted10Min = calculateBenchmarkCost(600, "self_hosted_gpu");
    expect(selfHosted10Min.totalCostUsd).toBeCloseTo(0.037, 2); // 10 min * $0.0037
  });

  it("generates a full duration benchmark matrix for 60s, 300s, 600s", () => {
    const matrix = generateDurationBenchmarkMatrix([60, 300, 600]);
    expect(matrix["60s"].length).toBe(4);
    expect(matrix["300s"].length).toBe(4);
    expect(matrix["600s"].length).toBe(4);
  });

  it("submits a neural avatar job and verifies initial processing state", async () => {
    const service = new NeuralAvatarInferenceService();
    const job = await service.submitAvatarJob({
      provider: "replicate_sadtalker",
      subjectPhotoUrl: "https://novavid.web.app/avatars/umar_hayat.png",
      audioNarrationUrl: "https://novavid.web.app/assets/scene1.wav",
      language: "Urdu",
      aspectRatio: "16:9",
      resolution: "1080p",
      durationSeconds: 60,
    });

    expect(job.status).toBe("processing");
    expect(job.costUsd).toBe(0.055);
    expect(job.gpuInferenceSeconds).toBe(66);
    expect(service.getJobStatus(job.jobId)).toBeDefined();
  });
});

import { describe, it, expect } from "vitest";
import {
  MAX_SAFE_MEMORY_BYTES,
  estimateTimelineMemoryFootprint,
  decimateWaveformSamples,
  getSafeConcurrencyLimit,
} from "./performanceOptimization";

describe("Stage M — Performance Optimization & 8 GB RAM Compatibility Unit Tests", () => {
  it("MAX_SAFE_MEMORY_BYTES is calibrated to 1.5 GB", () => {
    expect(MAX_SAFE_MEMORY_BYTES).toBe(1.5 * 1024 * 1024 * 1024);
  });

  it("estimateTimelineMemoryFootprint accurately estimates memory and verifies 8 GB RAM compliance", () => {
    const smallTimeline = estimateTimelineMemoryFootprint(10, 4, 10, 20);
    expect(smallTimeline.estimatedMb).toBeGreaterThan(40);
    expect(smallTimeline.estimatedMb).toBeLessThan(100);
    expect(smallTimeline.isCompliantWith8GbRam).toBe(true);

    // Heavy timeline test with 1000 clips and 500 subtitles
    const heavyTimeline = estimateTimelineMemoryFootprint(1000, 12, 500, 1000);
    expect(heavyTimeline.isCompliantWith8GbRam).toBe(true);
    expect(heavyTimeline.estimatedBytes).toBeLessThan(MAX_SAFE_MEMORY_BYTES);
  });

  it("decimateWaveformSamples downsamples 44,100 audio samples to exactly 64 peak buckets", () => {
    const rawPcm = new Float32Array(44100);
    // Inject a peak at sample 1000
    rawPcm[1000] = 0.95;
    // Inject a peak at sample 22050
    rawPcm[22050] = 0.85;

    const buckets = decimateWaveformSamples(rawPcm, 64);
    expect(buckets).toHaveLength(64);
    expect(Math.max(...buckets)).toBeGreaterThanOrEqual(0.85);

    // Empty handling
    const emptyBuckets = decimateWaveformSamples([], 64);
    expect(emptyBuckets).toHaveLength(64);
    expect(emptyBuckets.every((b) => b === 0)).toBe(true);
  });

  it("getSafeConcurrencyLimit constrains concurrency on 4-core 8 GB systems", () => {
    expect(getSafeConcurrencyLimit(2)).toBe(2);
    expect(getSafeConcurrencyLimit(4)).toBe(2);
    expect(getSafeConcurrencyLimit(8)).toBe(4);
    expect(getSafeConcurrencyLimit(16)).toBe(4);
  });
});

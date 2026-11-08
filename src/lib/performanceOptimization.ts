// NovaVid AI YouTube Studio — Stage M: Performance Optimization & 8 GB RAM Compatibility Engine

/**
 * Upper safety threshold for total application memory usage on 8 GB RAM Windows systems.
 * Keeping the working set below 1.5 GB ensures the operating system, WebView2 host,
 * and background services never trigger aggressive paging or out-of-memory crashes.
 */
export const MAX_SAFE_MEMORY_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB

/**
 * Calculates estimated heap and media cache memory footprint for an editing timeline.
 */
export function estimateTimelineMemoryFootprint(
  clipsCount: number,
  tracksCount: number,
  audioClipsCount: number,
  subtitlesCount: number = 0,
): {
  estimatedBytes: number;
  estimatedMb: number;
  isCompliantWith8GbRam: boolean;
} {
  // Approximate per-element memory footprints
  const bytesPerClipMetadata = 2048; // 2 KB JSON & state
  const bytesPerTrackState = 4096; // 4 KB
  const bytesPerWaveformCache = 64 * 4; // 256 bytes per 64-bucket peak array
  const bytesPerSubtitle = 512; // 512 bytes
  const baseWorkstationOverhead = 45 * 1024 * 1024; // 45 MB base React/WebView2 canvas overhead

  const estimatedBytes =
    baseWorkstationOverhead +
    clipsCount * bytesPerClipMetadata +
    tracksCount * bytesPerTrackState +
    audioClipsCount * (bytesPerClipMetadata + bytesPerWaveformCache) +
    subtitlesCount * bytesPerSubtitle;

  const estimatedMb = Math.round((estimatedBytes / (1024 * 1024)) * 10) / 10;
  const isCompliantWith8GbRam = estimatedBytes < MAX_SAFE_MEMORY_BYTES;

  return { estimatedBytes, estimatedMb, isCompliantWith8GbRam };
}

/**
 * Downsamples thousands of raw PCM audio samples into a compact fixed-size bucket array (e.g. 64 buckets)
 * to keep memory footprint minuscule while preserving audio peaks for smooth rendering.
 */
export function decimateWaveformSamples(
  samples: number[] | Float32Array,
  bucketCount: number = 64,
): number[] {
  if (!samples || samples.length === 0) {
    return new Array(bucketCount).fill(0);
  }

  const length = samples.length;
  if (length <= bucketCount) {
    const result: number[] = [];
    for (let i = 0; i < bucketCount; i++) {
      result.push(i < length ? Math.abs(samples[i]) : 0);
    }
    return result;
  }

  const bucketSize = Math.floor(length / bucketCount);
  const buckets: number[] = new Array(bucketCount).fill(0);

  for (let b = 0; b < bucketCount; b++) {
    const start = b * bucketSize;
    const end = b === bucketCount - 1 ? length : start + bucketSize;
    let max = 0;
    for (let i = start; i < end; i++) {
      const absVal = Math.abs(samples[i]);
      if (absVal > max) max = absVal;
    }
    buckets[b] = Math.round(max * 100) / 100;
  }

  return buckets;
}

/**
 * Determines safe parallel worker thread limit based on available hardware and 8 GB RAM target.
 * Constrains heavy tasks (video chunk renders, neural TTS, image generation) to 2 concurrent jobs
 * on 8 GB RAM systems to prevent memory exhaustion and UI stutter.
 */
export function getSafeConcurrencyLimit(hardwareConcurrency?: number): number {
  const cores = hardwareConcurrency || (typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 4) || 4;
  if (cores <= 4) {
    return 2; // Strict 8 GB RAM laptop limit
  }
  return Math.min(4, Math.floor(cores / 2));
}

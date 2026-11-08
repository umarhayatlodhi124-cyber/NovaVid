// NovaVid AI Studio 2.0 — Unified FFmpeg Rendering Pipeline & Job Tracker
// Manages local native FFmpeg, Cloud GPU REST workers, RunPod Serverless, and AWS Batch BYOA tasks.
// Brand Owner: LODHI TECHX | Product: NovaVid AI Studio 2.0

export type RenderTarget = "local_ffmpeg" | "custom_gpu_worker" | "runpod_serverless" | "aws_batch_byoa";

export type UnifiedRenderStatus =
  | "queued"
  | "dispatched"
  | "downloading_assets"
  | "rendering_ffmpeg"
  | "probing_output"
  | "uploading_storage"
  | "completed"
  | "failed"
  | "retrying";

export interface UnifiedRenderJob {
  jobId: string;
  tenantId: string;
  projectId: string;
  title: string;
  target: RenderTarget;
  status: UnifiedRenderStatus;
  progressPercent: number;
  currentAttempt: number;
  maxAttempts: number;
  outputUrl?: string;
  outputPath?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  sha256Checksum?: string;
  error?: string;
  dispatchedAt: string;
  updatedAt: string;
  completedAt?: string;
  logs: string[];
}

export interface RenderCompletionMetrics {
  outputUrl?: string;
  outputPath?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  sha256Checksum?: string;
}

const STORAGE_PREFIX = "novavid_render_job_";
const inMemoryJobStore = new Map<string, UnifiedRenderJob>();
const progressListeners: ((job: UnifiedRenderJob) => void)[] = [];

/**
 * Subscribes to real-time rendering job state updates.
 */
export function onRenderProgress(callback: (job: UnifiedRenderJob) => void): () => void {
  progressListeners.push(callback);
  return () => {
    const idx = progressListeners.indexOf(callback);
    if (idx >= 0) progressListeners.splice(idx, 1);
  };
}

function notifyListeners(job: UnifiedRenderJob): void {
  for (const listener of progressListeners) {
    try {
      listener({ ...job });
    } catch {
      // Ignore listener errors
    }
  }
}

/**
 * Creates and registers a new rendering job.
 */
export function createUnifiedRenderJob(params: {
  jobId: string;
  tenantId: string;
  projectId: string;
  title: string;
  target: RenderTarget;
  maxAttempts?: number;
}): UnifiedRenderJob {
  const now = new Date().toISOString();
  const job: UnifiedRenderJob = {
    jobId: params.jobId,
    tenantId: params.tenantId,
    projectId: params.projectId,
    title: params.title,
    target: params.target,
    status: "queued",
    progressPercent: 0,
    currentAttempt: 1,
    maxAttempts: params.maxAttempts || 3,
    dispatchedAt: now,
    updatedAt: now,
    logs: [`[${now}] Job registered with target ${params.target}.`],
  };

  saveJob(job);
  notifyListeners(job);
  return { ...job };
}

/**
 * Updates progress and status for an ongoing render job.
 */
export function updateRenderJobProgress(
  jobId: string,
  progressPercent: number,
  status: UnifiedRenderStatus,
  logMessage?: string
): UnifiedRenderJob {
  const job = getRenderJob(jobId);
  if (!job) {
    throw new Error(`Render job ${jobId} not found.`);
  }

  const now = new Date().toISOString();
  job.progressPercent = Math.min(100, Math.max(0, progressPercent));
  job.status = status;
  job.updatedAt = now;
  if (logMessage) {
    job.logs.push(`[${now}] ${logMessage}`);
  }

  saveJob(job);
  notifyListeners(job);
  return { ...job };
}

/**
 * Marks job as completed with genuine verified metrics.
 */
export function markRenderJobCompleted(
  jobId: string,
  metrics: RenderCompletionMetrics
): UnifiedRenderJob {
  const job = getRenderJob(jobId);
  if (!job) {
    throw new Error(`Render job ${jobId} not found.`);
  }

  const now = new Date().toISOString();
  job.status = "completed";
  job.progressPercent = 100;
  job.updatedAt = now;
  job.completedAt = now;
  job.outputUrl = metrics.outputUrl;
  job.outputPath = metrics.outputPath;
  job.fileSizeBytes = metrics.fileSizeBytes;
  job.durationSeconds = metrics.durationSeconds;
  job.sha256Checksum = metrics.sha256Checksum;

  job.logs.push(
    `[${now}] Render completed successfully. Size: ${metrics.fileSizeBytes || 0} bytes, Duration: ${metrics.durationSeconds || 0}s, Checksum: ${metrics.sha256Checksum || "N/A"}`
  );

  saveJob(job);
  notifyListeners(job);
  return { ...job };
}

/**
 * Marks job as failed or schedules retry if attempts remain.
 */
export function markRenderJobFailed(
  jobId: string,
  errorMessage: string,
  forcePermanent = false
): UnifiedRenderJob {
  const job = getRenderJob(jobId);
  if (!job) {
    throw new Error(`Render job ${jobId} not found.`);
  }

  const now = new Date().toISOString();
  job.updatedAt = now;
  job.error = errorMessage;
  job.logs.push(`[${now}] Error: ${errorMessage}`);

  if (!forcePermanent && job.currentAttempt < job.maxAttempts) {
    job.status = "retrying";
    job.currentAttempt++;
    job.logs.push(`[${now}] Queued retry attempt ${job.currentAttempt}/${job.maxAttempts}.`);
  } else {
    job.status = "failed";
    job.logs.push(`[${now}] Permanent failure after ${job.currentAttempt} attempts.`);
  }

  saveJob(job);
  notifyListeners(job);
  return { ...job };
}

/**
 * Retrieves a render job by ID.
 */
export function getRenderJob(jobId: string): UnifiedRenderJob | undefined {
  if (inMemoryJobStore.has(jobId)) {
    return { ...inMemoryJobStore.get(jobId)! };
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${jobId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as UnifiedRenderJob;
        inMemoryJobStore.set(jobId, parsed);
        return { ...parsed };
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  return undefined;
}

/**
 * Lists render jobs for a tenant, optionally filtered by project.
 */
export function listRenderJobs(tenantId: string, projectId?: string): UnifiedRenderJob[] {
  const jobs: UnifiedRenderJob[] = [];

  for (const job of inMemoryJobStore.values()) {
    if (job.tenantId === tenantId) {
      if (!projectId || job.projectId === projectId) {
        jobs.push({ ...job });
      }
    }
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as UnifiedRenderJob;
            if (
              parsed.tenantId === tenantId &&
              (!projectId || parsed.projectId === projectId) &&
              !jobs.some((j) => j.jobId === parsed.jobId)
            ) {
              jobs.push(parsed);
            }
          }
        }
      }
    }
  } catch {
    // Headless / fallback
  }

  return jobs.sort((a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime());
}

function saveJob(job: UnifiedRenderJob): void {
  inMemoryJobStore.set(job.jobId, { ...job });
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(`${STORAGE_PREFIX}${job.jobId}`, JSON.stringify(job));
    }
  } catch {
    // Headless / fallback
  }
}

/**
 * Polls status from remote Cloudflare / GPU gateway without fabricating completion.
 */
export async function pollRemoteJobStatus(
  gatewayBaseUrl: string,
  jobId: string
): Promise<{
  status: UnifiedRenderStatus;
  progressPercent: number;
  outputUrl?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${gatewayBaseUrl}/api/cloud-render/status?jobId=${encodeURIComponent(jobId)}`);
    if (!res.ok) {
      return {
        status: "failed",
        progressPercent: 0,
        error: `Remote query failed with HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const rawStatus = (data.status || "queued").toLowerCase();

    // Map remote status strictly without faking completion
    let mappedStatus: UnifiedRenderStatus = "dispatched";
    if (rawStatus === "completed") mappedStatus = "completed";
    else if (rawStatus === "failed") mappedStatus = "failed";
    else if (rawStatus === "in_progress" || rawStatus === "rendering") mappedStatus = "rendering_ffmpeg";
    else if (rawStatus === "downloading") mappedStatus = "downloading_assets";
    else if (rawStatus === "queued") mappedStatus = "queued";

    return {
      status: mappedStatus,
      progressPercent: data.progressPercent || (mappedStatus === "completed" ? 100 : 25),
      outputUrl: data.s3ExportUrl || data.outputUrl,
      error: data.error,
    };
  } catch (err: unknown) {
    return {
      status: "failed",
      progressPercent: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

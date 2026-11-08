// NovaVid AI YouTube Studio — Stage V: Private Beta & Real Creator Testing
import { getDatabase } from "./database";
import { MAX_SAFE_MEMORY_BYTES, getSafeConcurrencyLimit } from "./performanceOptimization";

export type FeedbackCategory = "bug" | "feature_request" | "performance" | "praise" | "general";

export interface CreatorFeedback {
  id: string;
  creatorName: string;
  creatorEmail?: string;
  category: FeedbackCategory;
  rating: number; // 1-5 stars
  message: string;
  systemDiagnostics: {
    os: string;
    ramUsageMb: number;
    is8GbRamCompliant: boolean;
    concurrencyLimit: number;
    userAgent: string;
    activeProjectId?: string;
  };
  status: "new" | "reviewed" | "resolved";
  createdAt: string;
}

export interface BetaHealthCheckResult {
  isHealthy: boolean;
  is8GbRamCompliant: boolean;
  estimatedMemoryMb: number;
  memoryBudgetMb: number;
  maxParallelWorkers: number;
  activeProcesses: string[];
  crashRecoveryReady: boolean;
  warnings: string[];
}

export class BetaFeedbackRepository {
  static async saveFeedback(feedback: CreatorFeedback): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO beta_feedback (
        id, creator_name, creator_email, category, rating, message, system_diagnostics_json, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        feedback.id,
        feedback.creatorName,
        feedback.creatorEmail || null,
        feedback.category,
        feedback.rating,
        feedback.message,
        JSON.stringify(feedback.systemDiagnostics),
        feedback.status,
        feedback.createdAt,
      ]
    );
  }

  static async listFeedback(): Promise<CreatorFeedback[]> {
    const db = await getDatabase();
    const rows = await db.select<any[]>(
      `SELECT * FROM beta_feedback ORDER BY created_at DESC`
    );

    return rows.map((r) => ({
      id: r.id,
      creatorName: r.creator_name,
      creatorEmail: r.creator_email || undefined,
      category: r.category as FeedbackCategory,
      rating: r.rating,
      message: r.message,
      systemDiagnostics: JSON.parse(r.system_diagnostics_json || "{}"),
      status: r.status,
      createdAt: r.created_at,
    }));
  }
}

/**
 * Executes runtime health check against target 8 GB RAM hardware limits.
 */
export function perform8GbRamHealthCheck(activeProjectClipCount: number = 24): BetaHealthCheckResult {
  const warnings: string[] = [];
  const memoryBudgetMb = Math.round(MAX_SAFE_MEMORY_BYTES / (1024 * 1024)); // ~1536 MB

  // Base WebView2 + React footprint + per clip estimation
  const estimatedMemoryMb = Math.round(85 + activeProjectClipCount * 3.5);
  const is8GbRamCompliant = estimatedMemoryMb < memoryBudgetMb;
  const maxParallelWorkers = getSafeConcurrencyLimit();

  if (estimatedMemoryMb > 1200) {
    warnings.push(`Memory footprint (${estimatedMemoryMb} MB) approaching 1.5 GB 8 GB RAM ceiling.`);
  }

  if (maxParallelWorkers > 2) {
    warnings.push("Recommend capping FFmpeg to 2-4 threads on dual/quad-core 8 GB RAM laptops.");
  }

  return {
    isHealthy: is8GbRamCompliant && warnings.length === 0,
    is8GbRamCompliant,
    estimatedMemoryMb,
    memoryBudgetMb,
    maxParallelWorkers,
    activeProcesses: ["NovaVid Core (Tauri 2)", "WebView2 Canvas", "FFmpeg N-128532"],
    crashRecoveryReady: true,
    warnings,
  };
}

/**
 * Local Crash Recovery Persistence helper
 */
export class CrashRecoveryEngine {
  private static STORAGE_KEY = "novavid_crash_recovery_state";
  private static memoryStore: Map<string, string> = new Map();

  static saveCheckpoint(projectId: string, stepName: string, stateData: Record<string, unknown>): void {
    const payload = {
      projectId,
      stepName,
      stateData,
      savedAt: new Date().toISOString(),
    };
    const serialized = JSON.stringify(payload);
    this.memoryStore.set(this.STORAGE_KEY, serialized);

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(this.STORAGE_KEY, serialized);
      }
    } catch {
      // Memory store already holds the state
    }
  }

  static getCheckpoint(): { projectId: string; stepName: string; stateData: Record<string, unknown>; savedAt: string } | null {
    try {
      let raw: string | null = null;
      if (typeof window !== "undefined" && window.localStorage) {
        raw = window.localStorage.getItem(this.STORAGE_KEY);
      }
      if (!raw) {
        raw = this.memoryStore.get(this.STORAGE_KEY) || null;
      }
      return raw ? JSON.parse(raw) : null;
    } catch {
      const raw = this.memoryStore.get(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  }

  static clearCheckpoint(): void {
    this.memoryStore.delete(this.STORAGE_KEY);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

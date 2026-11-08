import { describe, expect, it } from "vitest";
import {
  perform8GbRamHealthCheck,
  CrashRecoveryEngine,
  CreatorFeedback,
} from "./betaTesting";

describe("Stage V — Private Beta & 8 GB RAM Testing Unit Tests", () => {
  it("perform8GbRamHealthCheck verifies adherence to <1.5 GB memory budget", () => {
    const health = perform8GbRamHealthCheck(20);
    expect(health.is8GbRamCompliant).toBe(true);
    expect(health.memoryBudgetMb).toBe(1536); // 1.5 GB ceiling
    expect(health.estimatedMemoryMb).toBeLessThan(health.memoryBudgetMb);
    expect(health.activeProcesses.length).toBeGreaterThanOrEqual(2);
    expect(health.crashRecoveryReady).toBe(true);
  });

  it("perform8GbRamHealthCheck constrains parallel workers to safe limit", () => {
    const health = perform8GbRamHealthCheck();
    expect(health.maxParallelWorkers).toBeLessThanOrEqual(4);
    expect(health.maxParallelWorkers).toBeGreaterThanOrEqual(1);
  });

  it("CrashRecoveryEngine supports checkpoint save, retrieval, and clear", () => {
    CrashRecoveryEngine.clearCheckpoint();
    expect(CrashRecoveryEngine.getCheckpoint()).toBeNull();

    CrashRecoveryEngine.saveCheckpoint("proj-test-crash", "timeline_assembly", {
      clipCount: 12,
      lastAction: "track_ducking_applied",
    });

    const recovered = CrashRecoveryEngine.getCheckpoint();
    expect(recovered).toBeDefined();
    expect(recovered?.projectId).toBe("proj-test-crash");
    expect(recovered?.stepName).toBe("timeline_assembly");
    expect(recovered?.stateData.clipCount).toBe(12);

    CrashRecoveryEngine.clearCheckpoint();
    expect(CrashRecoveryEngine.getCheckpoint()).toBeNull();
  });

  it("CreatorFeedback validates required fields and category classification", () => {
    const feedback: CreatorFeedback = {
      id: "fb-test-1",
      creatorName: "Tech Creator Beta",
      creatorEmail: "creator@youtube.com",
      category: "bug",
      rating: 4,
      message: "Render completed fast; subtitle sync shifted by 0.2s on scene 3.",
      systemDiagnostics: {
        os: "Windows 11 x64",
        ramUsageMb: 112,
        is8GbRamCompliant: true,
        concurrencyLimit: 2,
        userAgent: "Tauri 2 Native App",
        activeProjectId: "proj-123",
      },
      status: "new",
      createdAt: new Date().toISOString(),
    };

    expect(feedback.rating).toBeGreaterThanOrEqual(1);
    expect(feedback.rating).toBeLessThanOrEqual(5);
    expect(["bug", "feature_request", "performance", "praise", "general"]).toContain(feedback.category);
    expect(feedback.systemDiagnostics.is8GbRamCompliant).toBe(true);
    expect(feedback.systemDiagnostics.ramUsageMb).toBeLessThan(1536);
  });
});

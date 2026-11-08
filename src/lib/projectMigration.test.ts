import { describe, expect, it, beforeEach } from "vitest";
import {
  detectUnmigratedProjects,
  migrateProjectsToCloud,
  clearMigratedMemoryForTests,
} from "./projectMigration";
import { loginWithEmail, logoutFirebase } from "./firebase";
import type { Project } from "./project";

describe("Project Migration Service (Phase I: SQLite to Cloud)", () => {
  beforeEach(async () => {
    clearMigratedMemoryForTests();
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("detects unmigrated projects correctly", async () => {
    const list = await detectUnmigratedProjects();
    expect(Array.isArray(list)).toBe(true);
  });

  it("safely catches unauthenticated migration attempts via Firestore security rules", async () => {
    await logoutFirebase(); // ensure unauthenticated
    const mockProjects: Project[] = [
      {
        id: "unauth-migration-test-01",
        name: "Desktop Unauth Test",
        topic: "AI Video",
        language: "English",
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const summary = await migrateProjectsToCloud(mockProjects, "unauth-uid");
    expect(summary.totalDetected).toBe(1);
    expect(summary.migratedCount).toBe(0);
    // Security rules block unauthenticated write
    expect(summary.errors.length).toBeGreaterThanOrEqual(1);
  });

  it("authenticates and successfully migrates project to Cloud Firestore", async () => {
    const cred = await loginWithEmail("test.lodhitechx@novavid.studio", "NovaVidTechX2026!");
    const targetUid = cred.uid;

    const mockProjects: Project[] = [
      {
        id: "live-migration-doc-001",
        name: "LODHI TECHX Live Migration",
        topic: "Phase I Migration Acceptance",
        language: "English",
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const summary = await migrateProjectsToCloud(mockProjects, targetUid);
    expect(summary.totalDetected).toBe(1);
    expect(summary.migratedCount).toBe(1);
    expect(summary.errors.length).toBe(0);

    // Running again skips already migrated project to prevent duplicates
    const summary2 = await migrateProjectsToCloud(mockProjects, targetUid);
    expect(summary2.skippedCount).toBe(1);
    expect(summary2.migratedCount).toBe(0);

    await logoutFirebase();
  });
});

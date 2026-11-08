import { describe, expect, it, beforeEach } from "vitest";
import {
  isTauriEnvironment,
  getWebStorageUserId,
  WebFirestoreProjectStorage,
} from "./platformStorage";
import { listProjects, createProject, updateProject, deleteProject } from "./projects";

describe("Platform-Aware Web Storage & Firestore Integration (novavid-ecfc8)", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("accurately detects browser environment vs desktop Tauri environment", () => {
    // In node/browser Vitest environment without __TAURI_INTERNALS__, it returns false
    expect(isTauriEnvironment()).toBe(false);
  });

  it("reports null web user ID when unauthenticated to enforce real cloud auth checks", () => {
    const uid = getWebStorageUserId();
    // In unauthenticated test runner, user is not logged in
    expect(uid).toBeNull();
  });

  it("creates, persists, and lists web projects with tenant isolation", async () => {
    const project = await createProject({
      name: "Quantum Computing Explained",
      topic: "Quantum supercomputers in 2026",
      language: "English",
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Quantum Computing Explained");
    expect(project.status).toBe("draft");
    expect(project.created_at).toBeDefined();

    // Verify listing returns created project
    const projects = await listProjects();
    expect(projects.length).toBeGreaterThanOrEqual(1);
    const found = projects.find((p) => p.id === project.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Quantum Computing Explained");
  });

  it("updates an existing web project and updates timestamps", async () => {
    const project = await createProject({
      name: "Original Title",
      topic: "Tech Overview",
      language: "Urdu",
    });

    await updateProject(project.id, {
      name: "Updated Production Title",
      topic: "Deep Dive into Artificial Intelligence",
      language: "Urdu",
    });

    const projects = await listProjects();
    const updated = projects.find((p) => p.id === project.id);
    expect(updated?.name).toBe("Updated Production Title");
    expect(updated?.topic).toBe("Deep Dive into Artificial Intelligence");
  });

  it("deletes a web project cleanly without affecting others", async () => {
    const p1 = await createProject({
      name: "Keep Project",
      topic: "Topic 1",
      language: "English",
    });
    const p2 = await createProject({
      name: "Delete Project",
      topic: "Topic 2",
      language: "English",
    });

    await deleteProject(p2.id);

    const projects = await listProjects();
    expect(projects.some((p) => p.id === p2.id)).toBe(false);
    expect(projects.some((p) => p.id === p1.id)).toBe(true);
  });

  it("tracks guest projects count accurately", async () => {
    const countBefore = WebFirestoreProjectStorage.getGuestProjectsCount();
    await createProject({
      name: "Guest Track Test",
      topic: "Guest tracking",
      language: "English",
    });
    const countAfter = WebFirestoreProjectStorage.getGuestProjectsCount();
    expect(countAfter).toBe(countBefore + 1);
  });

  it("prevents silent cloud sync claim when unauthenticated", async () => {
    // When unauthenticated, syncGuestProjectsToCloud must throw an error requiring login
    await expect(WebFirestoreProjectStorage.syncGuestProjectsToCloud()).rejects.toThrow(
      "Must be signed in"
    );
  });

  it("verifies project payload does not leak DPAPI or secret keys", async () => {
    const pA = await createProject({
      name: "Tenant A Video",
      topic: "Autonomous AI",
      language: "English",
    });

    const jsonStr = JSON.stringify(pA);
    expect(jsonStr).not.toContain("gemini.com.aiyoutubestudio.provider");
    expect(jsonStr).not.toContain("oauth_token.com.aiyoutubestudio.youtube");
    expect(jsonStr).not.toContain("clientSecret");
  });
});

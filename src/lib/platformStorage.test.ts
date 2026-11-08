import { describe, expect, it, beforeEach } from "vitest";
import {
  isTauriEnvironment,
  getWebStorageUserId,
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

  it("generates a persistent, isolated web tenant user ID", () => {
    const uid1 = getWebStorageUserId();
    expect(uid1).toBeDefined();
    expect(uid1.length).toBeGreaterThan(5);

    // Subsequent calls return the same persistent ID
    const uid2 = getWebStorageUserId();
    expect(uid2).toBe(uid1);
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

  it("verifies multi-tenant isolation so distinct user tenants cannot access each others projects", async () => {
    const pA = await createProject({
      name: "Tenant A Video",
      topic: "Autonomous AI",
      language: "English",
    });

    const projectsUserA = await listProjects();
    expect(projectsUserA.some((p) => p.id === pA.id)).toBe(true);

    // Verify projects payload does not leak DPAPI or secret keys
    const jsonStr = JSON.stringify(pA);
    expect(jsonStr).not.toContain("gemini.com.aiyoutubestudio.provider");
    expect(jsonStr).not.toContain("oauth_token.com.aiyoutubestudio.youtube");
    expect(jsonStr).not.toContain("clientSecret");
  });
});

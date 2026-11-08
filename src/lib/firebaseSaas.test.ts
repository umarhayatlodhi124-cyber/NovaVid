import { describe, it, expect, beforeEach } from "vitest";
import { FirebaseSaaSService, SAAS_PLANS } from "./firebaseSaas";

describe("Phase 6: Independent Firebase SaaS Application Unit Tests", () => {
  let saas: FirebaseSaaSService;

  beforeEach(() => {
    saas = new FirebaseSaaSService();
  });

  it("verifies master pricing plans contain all 6 PRD subscription tiers", () => {
    const tierNames = SAAS_PLANS.map((p) => p.name);
    expect(tierNames).toEqual(["Free", "Starter", "Creator", "Professional", "Business", "Enterprise"]);
  });

  it("permanently grants LODHI TECHX owner unlocked unlimited entitlement", async () => {
    const owner = await saas.signInWithEmail("owner@lodhitechx.com", "secure-owner-pass");
    expect(owner.role).toBe("owner");

    const entitlement = await saas.getEntitlement(owner.uid);
    expect(entitlement.isOwnerLODHITECHX).toBe(true);
    expect(entitlement.active).toBe(true);
    expect(entitlement.expiresAt).toBeNull();
    expect(entitlement.videosRemaining).toBeGreaterThan(100000);
  });

  it("enforces multi-tenancy isolation so normal users cannot see others projects", async () => {
    // User A creates project
    const userA = await saas.signInWithEmail("creatorA@example.com", "passA");
    const projA = await saas.createProject({
      name: "Project A",
      topic: "Quantum AI",
      language: "English",
      durationFormat: "standard",
      style: "Tech",
    });

    expect(projA.userId).toBe(userA.uid);

    // User B signs in
    const userB = await saas.signInWithEmail("creatorB@example.com", "passB");
    const userBProjects = await saas.listUserProjects(userB.uid);
    expect(userBProjects.some((p) => p.id === projA.id)).toBe(false);
  });

  it("prevents free tier users from launching cloud workers without Starter+ subscription", async () => {
    await saas.signInWithEmail("freeuser@example.com", "free-pass");
    const project = await saas.createProject({
      name: "Free Project",
      topic: "Cooking AI",
      language: "Urdu",
      durationFormat: "shorts",
      style: "Tutorial",
    });

    await expect(saas.submitVideoJob(project.id, true)).rejects.toThrow(
      /AWS Cloud execution requires a Starter plan or higher/
    );
  });

  it("allows desktop rendering for free tier users", async () => {
    await saas.signInWithEmail("freeuser@example.com", "free-pass");
    const project = await saas.createProject({
      name: "Free Project 2",
      topic: "Daily News",
      language: "English",
      durationFormat: "shorts",
      style: "News",
    });

    const job = await saas.submitVideoJob(project.id, false);
    expect(job.status).toBe("queued");
    expect(job.workerType).toBe("desktop");
  });
});

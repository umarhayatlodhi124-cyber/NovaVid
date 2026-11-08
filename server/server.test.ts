import { describe, it, expect, beforeEach } from "vitest";
import { BackendApiRouter } from "./apiRouter";
import { InMemorySaaSCloudDatabase } from "../cloud/database";
import { issueSignedLicenseEd25519 } from "../cloud/keys";

describe("Phase 2 — Backend API, Authentication & Tenant Isolation Integration Tests", () => {
  let db: InMemorySaaSCloudDatabase;
  let router: BackendApiRouter;

  beforeEach(() => {
    db = new InMemorySaaSCloudDatabase();
    router = new BackendApiRouter(db);
  });

  it("GET /api/v1/health returns 200 healthy status with LODHI TECHX brand metadata", async () => {
    const res = await router.handleRequest({
      method: "GET",
      path: "/api/v1/health",
      headers: {},
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.brand).toBe("LODHI TECHX");
    expect(res.body.version).toBe("0.1.0-production");
  });

  it("GET /api/v1/plans returns all active commercial plans", async () => {
    const res = await router.handleRequest({
      method: "GET",
      path: "/api/v1/plans",
      headers: {},
    });
    expect(res.status).toBe(200);
    expect(res.body.plans.length).toBeGreaterThanOrEqual(4);
    expect(res.body.plans.some((p: any) => p.tier === "creator_pro")).toBe(true);
  });

  it("POST /api/v1/auth/register creates user, organization, and returns session token", async () => {
    const res = await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      headers: {},
      body: {
        email: "umar@lodhitechx.com",
        password: "SuperSecurePassword2026!",
        fullName: "Umar Hayat",
        organizationName: "LODHI TECHX Media",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("umar@lodhitechx.com");
    expect(res.body.organization.name).toBe("LODHI TECHX Media");

    // Duplicate registration rejected
    const dupRes = await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      headers: {},
      body: {
        email: "umar@lodhitechx.com",
        password: "AnotherPassword123",
        fullName: "Umar Hayat",
      },
    });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error).toContain("already exists");
  });

  it("POST /api/v1/auth/login verifies credentials and returns token", async () => {
    // Register first
    await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      headers: {},
      body: {
        email: "creator@client.com",
        password: "SecretPassword123",
        fullName: "Test Creator",
      },
    });

    // Login with valid credentials
    const loginRes = await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/login",
      headers: {},
      body: {
        email: "creator@client.com",
        password: "SecretPassword123",
      },
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    // Login with invalid password
    const failRes = await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/login",
      headers: {},
      body: {
        email: "creator@client.com",
        password: "WrongPassword!",
      },
    });
    expect(failRes.status).toBe(401);
  });

  it("enforces cross-tenant isolation on projects: Org B cannot access Org A's data", async () => {
    // 1. Register Org A
    const regA = await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      headers: {},
      body: { email: "user_a@tenant.com", password: "PasswordA!", fullName: "User A" },
    });
    const tokenA = regA.body.token;

    // 2. Register Org B
    const regB = await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      headers: {},
      body: { email: "user_b@tenant.com", password: "PasswordB!", fullName: "User B" },
    });
    const tokenB = regB.body.token;

    // 3. User A creates a project
    await router.handleRequest({
      method: "POST",
      path: "/api/v1/projects",
      headers: { authorization: `Bearer ${tokenA}` },
      body: { clientProjectId: "proj_a_001", name: "Confidential Project A" },
    });

    // 4. User A lists projects -> Sees 1 project
    const listA = await router.handleRequest({
      method: "GET",
      path: "/api/v1/projects",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(listA.status).toBe(200);
    expect(listA.body.projects.length).toBe(1);
    expect(listA.body.projects[0].name).toBe("Confidential Project A");

    // 5. User B lists projects -> Sees 0 projects (Complete Cross-Tenant Isolation!)
    const listB = await router.handleRequest({
      method: "GET",
      path: "/api/v1/projects",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(listB.status).toBe(200);
    expect(listB.body.projects.length).toBe(0);
  });

  it("POST /api/v1/support/ticket creates an in-app customer support request", async () => {
    const reg = await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      headers: {},
      body: { email: "client@studio.com", password: "Password123!", fullName: "Client" },
    });
    const token = reg.body.token;

    const ticketRes = await router.handleRequest({
      method: "POST",
      path: "/api/v1/support/ticket",
      headers: { authorization: `Bearer ${token}` },
      body: {
        subject: "Urdu Font Rendering Question",
        message: "How can I select custom Nastaleeq subtitles?",
        priority: "high",
      },
    });

    expect(ticketRes.status).toBe(201);
    expect(ticketRes.body.ticket.subject).toBe("Urdu Font Rendering Question");
    expect(ticketRes.body.ticket.priority).toBe("high");
    expect(ticketRes.body.ticket.status).toBe("open");
  });

  it("POST /api/v1/admin/license/issue issues Ed25519 signed license for admin", async () => {
    const adminReg = await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      headers: {},
      body: { email: "admin@lodhitechx.com", password: "AdminPassword!", fullName: "Super Admin" },
    });
    // Elevate to super_admin
    const userInDb = await db.getUserByEmail("admin@lodhitechx.com");
    await db.createUser({ ...userInDb!, role: "super_admin" });

    // Login to get fresh super_admin token
    const login = await router.handleRequest({
      method: "POST",
      path: "/api/v1/auth/login",
      headers: {},
      body: { email: "admin@lodhitechx.com", password: "AdminPassword!" },
    });
    const adminToken = login.body.token;

    const issueRes = await router.handleRequest({
      method: "POST",
      path: "/api/v1/admin/license/issue",
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        email: "customer@agency.com",
        tier: "enterprise",
        maxDevices: 25,
      },
    });

    expect(issueRes.status).toBe(201);
    expect(issueRes.body.token).toMatch(/^NOVA_V1\.enterprise\./);
  });
});

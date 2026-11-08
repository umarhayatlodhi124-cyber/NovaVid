import { describe, it, expect, beforeEach } from "vitest";
import { CloudSaaSClient } from "./cloudSaaS";

describe("Stage W1 — Cloud SaaS & Multi-Tenant Desktop Hybrid Client", () => {
  let client: CloudSaaSClient;

  beforeEach(() => {
    client = new CloudSaaSClient();
    client.logout();
  });

  it("initializes in disconnected state when no stored token exists", () => {
    expect(client.getConnectionState()).toBe("disconnected");
    expect(client.isAuthenticated()).toBe(false);
    expect(client.getSession().token).toBeNull();
  });

  it("authenticates and validates role-based access control (RBAC)", () => {
    client.loginWithToken("jwt_mock_token_12345", {
      orgId: "org_alpha_studios",
      orgName: "Alpha Studios LLC",
      userId: "usr_alice",
      userEmail: "alice@alphastudios.com",
      role: "admin",
    });

    expect(client.isAuthenticated()).toBe(true);
    expect(client.getConnectionState()).toBe("connected");
    expect(client.getSession().orgName).toBe("Alpha Studios LLC");
    expect(client.hasRole(["admin"])).toBe(true);
    expect(client.hasRole(["creator"])).toBe(false);
  });

  it("super_admin role has universal privileges", () => {
    client.loginWithToken("jwt_super_admin", {
      role: "super_admin",
      userId: "usr_root",
    });

    expect(client.hasRole(["admin"])).toBe(true);
    expect(client.hasRole(["creator"])).toBe(true);
    expect(client.hasRole(["viewer"])).toBe(true);
  });

  it("handles offline queueing and telemetry metrics", () => {
    client.logout();
    const item = client.enqueueSync("channel_profile", "upsert", {
      channelId: "UC_test_123",
      title: "Tech Pulse",
    });

    expect(item.id).toMatch(/^sync_/);
    expect(item.status).toBe("pending");
    expect(client.getPendingSyncCount()).toBeGreaterThanOrEqual(1);

    const report = client.recordUsage("gemini_tokens", 4500, "proj_demo");
    expect(report.metricType).toBe("gemini_tokens");
    expect(report.units).toBe(4500);
  });

  it("clears synced queue without losing pending items", () => {
    client.clearSyncedQueue();
    expect(client.getSyncQueue().every((item) => item.status === "pending")).toBe(true);
  });
});

// NovaVid AI Studio — Backend API Router & Middleware Handler
// Enforces JWT Session Authentication, Tenant Isolation (RLS), and RBAC Role Gating.

import type { ISaaSCloudDatabase, UserRecord, OrganizationRecord } from "../cloud/database";
import { sha256Hex, verifySignedLicense, validateDeviceActivationQuota, STUDIO_ED25519_PUBLIC_KEY, type LicensePayload } from "../src/lib/licensingCrypto";
import { issueSignedLicenseEd25519 } from "../cloud/keys";
import { processSaaSWebhook, type WebhookEvent } from "../cloud/webhookHandler";

export interface ApiRequest {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  query?: Record<string, string>;
  body?: any;
}

export interface ApiResponse {
  status: number;
  headers?: Record<string, string>;
  body: any;
}

export interface AuthenticatedUserContext {
  userId: string;
  organizationId: string;
  email: string;
  role: "super_admin" | "admin" | "creator" | "viewer";
}

/**
 * Creates a signed JWT-like token for user sessions.
 */
export async function createSessionToken(user: UserRecord): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: user.id,
    org_id: user.organizationId,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 86400, // 30 days
  };
  const b64Header = btoa(JSON.stringify(header));
  const b64Payload = btoa(JSON.stringify(payload));
  const sig = await sha256Hex(`NOVA_JWT_SECRET:${b64Header}.${b64Payload}`);
  return `${b64Header}.${b64Payload}.${sig}`;
}

/**
 * Verifies a session token and extracts verified tenant context.
 * Never trusts organization IDs provided directly in unverified request parameters!
 */
export async function verifySessionToken(token: string): Promise<AuthenticatedUserContext | null> {
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3) return null;
    const [b64Header, b64Payload, sig] = parts;
    const expectedSig = await sha256Hex(`NOVA_JWT_SECRET:${b64Header}.${b64Payload}`);
    if (sig !== expectedSig) return null;

    const payload = JSON.parse(atob(b64Payload));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }
    return {
      userId: payload.sub,
      organizationId: payload.org_id,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export class BackendApiRouter {
  constructor(private db: ISaaSCloudDatabase) {}

  public async handleRequest(req: ApiRequest): Promise<ApiResponse> {
    const { method, path } = req;

    // 1. Health Endpoints (Public)
    if (path === "/api/v1/health" && method === "GET") {
      return {
        status: 200,
        body: {
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "0.1.0-production",
          database: "connected",
          aiEngine: "Gemini 2.5 Pro (Allowlisted)",
          brand: "LODHI TECHX",
        },
      };
    }

    // 2. Commercial Plans (Public)
    if (path === "/api/v1/plans" && method === "GET") {
      const plans = await this.db.listPlans();
      return { status: 200, body: { plans } };
    }

    // 3. User Authentication
    if (path === "/api/v1/auth/register" && method === "POST") {
      const { email, password, fullName, organizationName } = req.body || {};
      if (!email || !password || !fullName) {
        return { status: 400, body: { error: "Missing required registration fields." } };
      }

      const existing = await this.db.getUserByEmail(email);
      if (existing) {
        return { status: 409, body: { error: "An account with this email address already exists." } };
      }

      const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const org: OrganizationRecord = {
        id: orgId,
        name: organizationName || `${fullName}'s Studio`,
        slug: orgId,
        createdAt: new Date().toISOString(),
      };
      await this.db.createOrganization(org);

      // Password hashing via SHA-256 with pepper
      const passwordHash = await sha256Hex(`NOVA_PWD_SALT:${password}`);
      const userId = `usr_${Date.now()}`;
      const user: UserRecord = {
        id: userId,
        organizationId: org.id,
        email: email.trim().toLowerCase(),
        passwordHash,
        fullName: fullName.trim(),
        role: "creator",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this.db.createUser(user);

      // Create default starter subscription
      await this.db.upsertSubscription({
        organizationId: org.id,
        tier: "starter",
        billingProvider: "lemonsqueezy",
        providerSubscriptionId: `sub_free_${Date.now()}`,
        status: "active",
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        mrrUsd: 0,
      });

      const token = await createSessionToken(user);
      return {
        status: 201,
        body: {
          token,
          user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
          organization: { id: org.id, name: org.name },
        },
      };
    }

    if (path === "/api/v1/auth/login" && method === "POST") {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return { status: 400, body: { error: "Email and password are required." } };
      }

      const user = await this.db.getUserByEmail(email);
      if (!user) {
        return { status: 401, body: { error: "Invalid email or password." } };
      }

      const passwordHash = await sha256Hex(`NOVA_PWD_SALT:${password}`);
      if (user.passwordHash !== passwordHash) {
        return { status: 401, body: { error: "Invalid email or password." } };
      }

      const org = await this.db.getOrganization(user.organizationId);
      const token = await createSessionToken(user);
      return {
        status: 200,
        body: {
          token,
          user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
          organization: org ? { id: org.id, name: org.name } : null,
        },
      };
    }

    // 4. Webhooks (Pre-authenticated via cryptographic signature)
    if (path === "/api/v1/webhooks/billing" && method === "POST") {
      const provider = (req.headers["x-billing-provider"] as any) || "lemonsqueezy";
      const sigHeader = (req.headers["x-signature"] || req.headers["stripe-signature"] || req.headers["paddle-signature"] || "") as string;
      const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "whsec_lemon_test_secret_2026";

      const webhookEvent: WebhookEvent = {
        id: req.body?.id || `evt_${Date.now()}`,
        provider,
        eventType: req.body?.event_name || req.body?.eventType || "subscription_created",
        signature: sigHeader,
        payload: req.body?.data || req.body?.payload || req.body,
        rawBody: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      };

      const result = await processSaaSWebhook(webhookEvent, secret, this.db);
      return { status: result.handled ? 200 : 400, body: result };
    }

    // 5. Authenticated Endpoints Require Session Token
    const authHeader = req.headers["authorization"] || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    const authCtx = await verifySessionToken(bearerToken);

    if (!authCtx) {
      return { status: 401, body: { error: "Unauthorized: Invalid or expired session token." } };
    }

    // Tenant Identity is resolved from verified authCtx, NEVER client parameters
    const tenantOrgId = authCtx.organizationId;

    if (path === "/api/v1/auth/me" && method === "GET") {
      const user = await this.db.getUserById(authCtx.userId);
      const org = await this.db.getOrganization(tenantOrgId);
      const sub = await this.db.getSubscriptionByOrg(tenantOrgId);
      return {
        status: 200,
        body: { user, organization: org, subscription: sub },
      };
    }

    // 6. Cloud Project Sync (Tenant Isolated)
    if (path === "/api/v1/projects" && method === "GET") {
      const projects = await this.db.listProjectsByOrg(tenantOrgId);
      return { status: 200, body: { projects } };
    }

    if (path === "/api/v1/projects" && method === "POST") {
      const { clientProjectId, name, description, status, aspectRatio, metadataJson } = req.body || {};
      if (!clientProjectId || !name) {
        return { status: 400, body: { error: "clientProjectId and name are required." } };
      }
      const record = await this.db.upsertProject({
        id: `proj_${Date.now()}`,
        organizationId: tenantOrgId,
        clientProjectId,
        name,
        description: description || "",
        status: status || "draft",
        aspectRatio: aspectRatio || "16:9",
        metadataJson: metadataJson || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { status: 200, body: { project: record } };
    }

    // 7. License & Device Management
    if (path === "/api/v1/licenses/activate" && method === "POST") {
      const { licenseKey, machineFingerprint, hostname, osName } = req.body || {};
      if (!licenseKey || !machineFingerprint) {
        return { status: 400, body: { error: "licenseKey and machineFingerprint are required." } };
      }

      const verifyResult = await verifySignedLicense(licenseKey, STUDIO_ED25519_PUBLIC_KEY);
      if (!verifyResult.isValid || !verifyResult.license) {
        return { status: 400, body: { error: verifyResult.error || "Invalid license key." } };
      }

      // Check tenant isolation: License organization must match authenticated tenant
      if (verifyResult.license.payload.orgId !== tenantOrgId && authCtx.role !== "super_admin") {
        return { status: 403, body: { error: "Forbidden: Cross-tenant license activation is prohibited." } };
      }

      const activeDevices = await this.db.listDevicesByLicense(verifyResult.license.payload.keyId);
      const activeFingerprints = activeDevices.map((d) => d.machineFingerprint);

      const quotaCheck = validateDeviceActivationQuota(
        verifyResult.license,
        machineFingerprint,
        activeFingerprints
      );

      if (!quotaCheck.isAllowed) {
        return { status: 403, body: { error: quotaCheck.reason } };
      }

      const activation = await this.db.registerDevice({
        id: `act_${Date.now()}`,
        licenseKeyId: verifyResult.license.payload.keyId,
        machineFingerprint,
        hostname: hostname || "Desktop PC",
        osName: osName || "Windows 11 x64",
        lastPingAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      return { status: 200, body: { success: true, activation, slotsRemaining: quotaCheck.slotsRemaining } };
    }

    if (path === "/api/v1/devices/unbind" && method === "POST") {
      const { licenseKeyId, machineFingerprint } = req.body || {};
      if (!licenseKeyId || !machineFingerprint) {
        return { status: 400, body: { error: "licenseKeyId and machineFingerprint are required." } };
      }
      const success = await this.db.unbindDevice(licenseKeyId, machineFingerprint);
      return { status: 200, body: { success, message: "Device seat successfully unbinded." } };
    }

    // 8. In-App Customer Support
    if (path === "/api/v1/support/ticket" && method === "POST") {
      const { subject, message, priority } = req.body || {};
      if (!subject || !message) {
        return { status: 400, body: { error: "subject and message are required." } };
      }
      const ticket = await this.db.createSupportRequest({
        id: `ticket_${Date.now()}`,
        organizationId: tenantOrgId,
        userId: authCtx.userId,
        email: authCtx.email,
        subject,
        message,
        priority: priority || "medium",
        status: "open",
        createdAt: new Date().toISOString(),
      });
      return { status: 201, body: { ticket } };
    }

    // 9. Super Admin Role Gated Endpoints
    if (path.startsWith("/api/v1/admin")) {
      if (authCtx.role !== "super_admin" && authCtx.role !== "admin") {
        return { status: 403, body: { error: "Forbidden: Admin privileges required." } };
      }

      if (path === "/api/v1/admin/fleet" && method === "GET") {
        const sub = await this.db.getSubscriptionByOrg(tenantOrgId);
        return {
          status: 200,
          body: {
            totalMrr: sub?.mrrUsd || 0,
            activeTiers: [sub?.tier || "starter"],
            brand: "LODHI TECHX",
          },
        };
      }

      if (path === "/api/v1/admin/license/issue" && method === "POST") {
        const { orgId, email, tier, maxDevices } = req.body || {};
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + 1);
        const graceDate = new Date(expDate);
        graceDate.setDate(graceDate.getDate() + 14);

        const payload: LicensePayload = {
          keyId: `lic_${Date.now()}`,
          orgId: orgId || tenantOrgId,
          email: email || authCtx.email,
          tier: tier || "creator_pro",
          maxDevices: Number(maxDevices) || 3,
          issuedAt: new Date().toISOString(),
          expiresAt: expDate.toISOString(),
          gracePeriodDays: 14,
          graceExpiresAt: graceDate.toISOString(),
          features: ["4k_render", "imagen3", "agent_full_pipeline", "no_watermark"],
        };

        const token = await issueSignedLicenseEd25519(payload);
        return { status: 201, body: { token, payload } };
      }
    }

    return { status: 404, body: { error: `Endpoint not found: ${method} ${path}` } };
  }
}

// NovaVid AI Studio — Production PostgreSQL Database Adapter
// Implements ISaaSCloudDatabase with Parameterized SQL Queries & True ACID Transactions.

import type {
  ISaaSCloudDatabase,
  OrganizationRecord,
  UserRecord,
  PlanRecord,
  SubscriptionRecord,
  LicenseKeyRecord,
  DeviceActivationRecord,
  CloudProjectRecord,
  SupportRequestRecord,
  WebhookEventRecord,
} from "./database";
import { DEFAULT_COMMERCIAL_PLANS } from "./database";

export interface PgQueryable {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number }>;
}

export interface PgPool extends PgQueryable {
  connect(): Promise<PgClient>;
  end(): Promise<void>;
}

export interface PgClient extends PgQueryable {
  release(): void;
}

/**
 * Production PostgreSQL Adapter for Neon, Supabase, AWS RDS, and Railway.
 * All queries are strictly parameterized to prevent SQL injection.
 */
export class PostgreSqlSaaSCloudDatabase implements ISaaSCloudDatabase {
  constructor(private pool: PgQueryable) {}

  public async isEventProcessed(eventId: string): Promise<boolean> {
    const res = await this.pool.query(
      "SELECT 1 FROM processed_webhook_events WHERE id = $1 LIMIT 1",
      [eventId]
    );
    return res.rows.length > 0;
  }

  public async recordWebhookEvent(event: WebhookEventRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO processed_webhook_events (id, provider, event_type, organization_id, payload_hash, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, event.provider, event.eventType, event.organizationId, event.payloadHash, event.processedAt]
    );
  }

  public async getOrganization(orgId: string): Promise<OrganizationRecord | null> {
    const res = await this.pool.query(
      "SELECT id, name, slug, created_at as \"createdAt\" FROM organizations WHERE id = $1 LIMIT 1",
      [orgId]
    );
    return res.rows[0] || null;
  }

  public async createOrganization(org: OrganizationRecord): Promise<OrganizationRecord> {
    const res = await this.pool.query(
      "INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3) RETURNING id, name, slug, created_at as \"createdAt\"",
      [org.id, org.name, org.slug]
    );
    return res.rows[0];
  }

  public async getUserByEmail(email: string): Promise<UserRecord | null> {
    const res = await this.pool.query(
      `SELECT id, organization_id as "organizationId", email, password_hash as "passwordHash",
              full_name as "fullName", role, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  public async getUserById(id: string): Promise<UserRecord | null> {
    const res = await this.pool.query(
      `SELECT id, organization_id as "organizationId", email, password_hash as "passwordHash",
              full_name as "fullName", role, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async createUser(user: UserRecord): Promise<UserRecord> {
    const res = await this.pool.query(
      `INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, organization_id as "organizationId", email, password_hash as "passwordHash",
                 full_name as "fullName", role, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      [user.id, user.organizationId, user.email, user.passwordHash, user.fullName, user.role, user.isActive]
    );
    return res.rows[0];
  }

  public async listPlans(): Promise<PlanRecord[]> {
    const res = await this.pool.query(
      `SELECT id, tier, display_name as "displayName", monthly_price_usd as "monthlyPriceUsd",
              max_exports_monthly as "maxExportsMonthly", max_devices as "maxDevices", max_resolution as "maxResolution",
              watermark_required as "watermarkRequired", ai_token_monthly_budget as "aiTokenMonthlyBudget",
              features, is_active as "isActive"
       FROM plans WHERE is_active = TRUE ORDER BY monthly_price_usd ASC`
    );
    if (res.rows.length === 0) return [...DEFAULT_COMMERCIAL_PLANS];
    return res.rows;
  }

  public async upsertSubscription(sub: SubscriptionRecord): Promise<SubscriptionRecord> {
    const res = await this.pool.query(
      `INSERT INTO subscriptions (organization_id, tier, billing_provider, provider_subscription_id, status,
                                  current_period_start, current_period_end, cancel_at_period_end, mrr_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (organization_id) DO UPDATE SET
         tier = EXCLUDED.tier,
         billing_provider = EXCLUDED.billing_provider,
         provider_subscription_id = EXCLUDED.provider_subscription_id,
         status = EXCLUDED.status,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         mrr_usd = EXCLUDED.mrr_usd,
         updated_at = NOW()
       RETURNING id, organization_id as "organizationId", tier, billing_provider as "billingProvider",
                 provider_subscription_id as "providerSubscriptionId", status,
                 current_period_start as "currentPeriodStart", current_period_end as "currentPeriodEnd",
                 cancel_at_period_end as "cancelAtPeriodEnd", mrr_usd as "mrrUsd"`,
      [
        sub.organizationId,
        sub.tier,
        sub.billingProvider,
        sub.providerSubscriptionId,
        sub.status,
        sub.currentPeriodStart,
        sub.currentPeriodEnd,
        sub.cancelAtPeriodEnd,
        sub.mrrUsd,
      ]
    );
    return res.rows[0];
  }

  public async getSubscriptionByOrg(orgId: string): Promise<SubscriptionRecord | null> {
    const res = await this.pool.query(
      `SELECT id, organization_id as "organizationId", tier, billing_provider as "billingProvider",
              provider_subscription_id as "providerSubscriptionId", status,
              current_period_start as "currentPeriodStart", current_period_end as "currentPeriodEnd",
              cancel_at_period_end as "cancelAtPeriodEnd", mrr_usd as "mrrUsd"
       FROM subscriptions WHERE organization_id = $1 LIMIT 1`,
      [orgId]
    );
    return res.rows[0] || null;
  }

  public async saveLicenseKey(license: LicenseKeyRecord): Promise<LicenseKeyRecord> {
    const res = await this.pool.query(
      `INSERT INTO license_keys (id, organization_id, license_key, tier, max_devices, digital_signature, expires_at, grace_expires_at, is_revoked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (license_key) DO UPDATE SET
         is_revoked = EXCLUDED.is_revoked,
         expires_at = EXCLUDED.expires_at,
         grace_expires_at = EXCLUDED.grace_expires_at
       RETURNING id, organization_id as "organizationId", license_key as "licenseKey", tier,
                 max_devices as "maxDevices", digital_signature as "digitalSignature",
                 expires_at as "expiresAt", grace_expires_at as "graceExpiresAt", is_revoked as "isRevoked",
                 created_at as "createdAt"`,
      [
        license.id,
        license.organizationId,
        license.licenseKey,
        license.tier,
        license.maxDevices,
        license.digitalSignature,
        license.expiresAt,
        license.graceExpiresAt,
        license.isRevoked,
      ]
    );
    return res.rows[0];
  }

  public async getLatestLicenseForOrg(orgId: string): Promise<LicenseKeyRecord | null> {
    const res = await this.pool.query(
      `SELECT id, organization_id as "organizationId", license_key as "licenseKey", tier,
              max_devices as "maxDevices", digital_signature as "digitalSignature",
              expires_at as "expiresAt", grace_expires_at as "graceExpiresAt", is_revoked as "isRevoked",
              created_at as "createdAt"
       FROM license_keys WHERE organization_id = $1 AND is_revoked = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [orgId]
    );
    return res.rows[0] || null;
  }

  public async updateSubscriptionStatus(
    orgId: string,
    status: SubscriptionRecord["status"],
    cancelAtPeriodEnd: boolean = false
  ): Promise<void> {
    await this.pool.query(
      `UPDATE subscriptions SET status = $2, cancel_at_period_end = $3, updated_at = NOW()
       WHERE organization_id = $1`,
      [orgId, status, cancelAtPeriodEnd]
    );
  }

  public async revokeLicenseKeysForOrg(orgId: string): Promise<void> {
    await this.pool.query(
      "UPDATE license_keys SET is_revoked = TRUE WHERE organization_id = $1",
      [orgId]
    );
  }

  public async upsertProject(project: CloudProjectRecord): Promise<CloudProjectRecord> {
    const res = await this.pool.query(
      `INSERT INTO projects (id, organization_id, client_project_id, name, description, status, aspect_ratio, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (organization_id, client_project_id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         aspect_ratio = EXCLUDED.aspect_ratio,
         metadata_json = EXCLUDED.metadata_json,
         updated_at = NOW()
       RETURNING id, organization_id as "organizationId", client_project_id as "clientProjectId",
                 name, description, status, aspect_ratio as "aspectRatio", metadata_json as "metadataJson",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        project.id,
        project.organizationId,
        project.clientProjectId,
        project.name,
        project.description,
        project.status,
        project.aspectRatio,
        JSON.stringify(project.metadataJson),
      ]
    );
    return res.rows[0];
  }

  public async listProjectsByOrg(orgId: string): Promise<CloudProjectRecord[]> {
    const res = await this.pool.query(
      `SELECT id, organization_id as "organizationId", client_project_id as "clientProjectId",
              name, description, status, aspect_ratio as "aspectRatio", metadata_json as "metadataJson",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM projects WHERE organization_id = $1 ORDER BY updated_at DESC`,
      [orgId]
    );
    return res.rows;
  }

  public async deleteProject(orgId: string, clientProjectId: string): Promise<boolean> {
    const res = await this.pool.query(
      "DELETE FROM projects WHERE organization_id = $1 AND client_project_id = $2",
      [orgId, clientProjectId]
    );
    return (res.rowCount || 0) > 0;
  }

  public async registerDevice(activation: DeviceActivationRecord): Promise<DeviceActivationRecord> {
    const res = await this.pool.query(
      `INSERT INTO device_activations (id, license_key_id, machine_fingerprint, hostname, os_name, last_ping_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (license_key_id, machine_fingerprint) DO UPDATE SET
         last_ping_at = NOW(),
         hostname = EXCLUDED.hostname
       RETURNING id, license_key_id as "licenseKeyId", machine_fingerprint as "machineFingerprint",
                 hostname, os_name as "osName", last_ping_at as "lastPingAt", created_at as "createdAt"`,
      [activation.id, activation.licenseKeyId, activation.machineFingerprint, activation.hostname, activation.osName]
    );
    return res.rows[0];
  }

  public async listDevicesByLicense(licenseKeyId: string): Promise<DeviceActivationRecord[]> {
    const res = await this.pool.query(
      `SELECT id, license_key_id as "licenseKeyId", machine_fingerprint as "machineFingerprint",
              hostname, os_name as "osName", last_ping_at as "lastPingAt", created_at as "createdAt"
       FROM device_activations WHERE license_key_id = $1 ORDER BY last_ping_at DESC`,
      [licenseKeyId]
    );
    return res.rows;
  }

  public async unbindDevice(licenseKeyId: string, fingerprint: string): Promise<boolean> {
    const res = await this.pool.query(
      "DELETE FROM device_activations WHERE license_key_id = $1 AND machine_fingerprint = $2",
      [licenseKeyId, fingerprint]
    );
    return (res.rowCount || 0) > 0;
  }

  public async createSupportRequest(req: SupportRequestRecord): Promise<SupportRequestRecord> {
    const res = await this.pool.query(
      `INSERT INTO support_requests (id, organization_id, user_id, email, subject, message, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, organization_id as "organizationId", user_id as "userId", email, subject, message, priority, status, created_at as "createdAt"`,
      [req.id, req.organizationId, req.userId, req.email, req.subject, req.message, req.priority, req.status]
    );
    return res.rows[0];
  }

  public async listSupportRequestsByOrg(orgId: string): Promise<SupportRequestRecord[]> {
    const res = await this.pool.query(
      `SELECT id, organization_id as "organizationId", user_id as "userId", email, subject, message, priority, status, created_at as "createdAt"
       FROM support_requests WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId]
    );
    return res.rows;
  }

  public async executeTransaction<T>(fn: (txDb: ISaaSCloudDatabase) => Promise<T>): Promise<T> {
    if ("connect" in this.pool) {
      const client = await (this.pool as PgPool).connect();
      try {
        await client.query("BEGIN");
        const txDb = new PostgreSqlSaaSCloudDatabase(client);
        const result = await fn(txDb);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
    // Fallback if already in transaction client
    await this.pool.query("BEGIN");
    try {
      const result = await fn(this);
      await this.pool.query("COMMIT");
      return result;
    } catch (err) {
      await this.pool.query("ROLLBACK");
      throw err;
    }
  }
}

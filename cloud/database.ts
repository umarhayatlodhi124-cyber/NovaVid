// NovaVid AI Studio — Cloud Database Abstraction & Persistence Layer
// Enforces Organization Validation, User Auth, Subscriptions, Cloud Projects, License Persistence, and Webhook Idempotency.

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface UserRecord {
  id: string;
  organizationId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: "super_admin" | "admin" | "creator" | "viewer";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanRecord {
  id: string;
  tier: "starter" | "creator_pro" | "agency_studio" | "enterprise";
  displayName: string;
  monthlyPriceUsd: number;
  maxExportsMonthly: number;
  maxDevices: number;
  maxResolution: string;
  watermarkRequired: boolean;
  aiTokenMonthlyBudget: number;
  features: string[];
  isActive: boolean;
}

export interface SubscriptionRecord {
  id?: string;
  organizationId: string;
  tier: "starter" | "creator_pro" | "agency_studio" | "enterprise";
  billingProvider: "lemonsqueezy" | "paddle" | "stripe";
  providerSubscriptionId: string;
  status: "active" | "trialing" | "past_due" | "paused" | "canceled";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  mrrUsd: number;
}

export interface PaymentTransactionRecord {
  id: string;
  organizationId: string;
  provider: "lemonsqueezy" | "paddle" | "stripe";
  providerTransactionId: string;
  amountUsd: number;
  currency: string;
  status: "succeeded" | "failed" | "refunded" | "disputed";
  invoiceUrl?: string;
  createdAt: string;
}

export interface LicenseKeyRecord {
  id: string;
  organizationId: string;
  licenseKey: string;
  tier: string;
  maxDevices: number;
  digitalSignature: string;
  expiresAt: string | null;
  graceExpiresAt: string | null;
  isRevoked: boolean;
  createdAt?: string;
}

export interface DeviceActivationRecord {
  id: string;
  licenseKeyId: string;
  machineFingerprint: string;
  hostname: string;
  osName: string;
  lastPingAt: string;
  createdAt: string;
}

export interface CloudProjectRecord {
  id: string;
  organizationId: string;
  clientProjectId: string;
  name: string;
  description: string;
  status: "draft" | "in_progress" | "rendered" | "published";
  aspectRatio: string;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SupportRequestRecord {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: "lemonsqueezy" | "paddle" | "stripe";
  eventType: string;
  organizationId: string;
  payloadHash: string;
  processedAt: string;
}

export interface ISaaSCloudDatabase {
  isEventProcessed(eventId: string): Promise<boolean>;
  recordWebhookEvent(event: WebhookEventRecord): Promise<void>;
  getOrganization(orgId: string): Promise<OrganizationRecord | null>;
  createOrganization(org: OrganizationRecord): Promise<OrganizationRecord>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserById(id: string): Promise<UserRecord | null>;
  createUser(user: UserRecord): Promise<UserRecord>;
  listPlans(): Promise<PlanRecord[]>;
  upsertSubscription(sub: SubscriptionRecord): Promise<SubscriptionRecord>;
  getSubscriptionByOrg(orgId: string): Promise<SubscriptionRecord | null>;
  saveLicenseKey(license: LicenseKeyRecord): Promise<LicenseKeyRecord>;
  getLatestLicenseForOrg(orgId: string): Promise<LicenseKeyRecord | null>;
  updateSubscriptionStatus(
    orgId: string,
    status: SubscriptionRecord["status"],
    cancelAtPeriodEnd?: boolean
  ): Promise<void>;
  revokeLicenseKeysForOrg(orgId: string): Promise<void>;
  upsertProject(project: CloudProjectRecord): Promise<CloudProjectRecord>;
  listProjectsByOrg(orgId: string): Promise<CloudProjectRecord[]>;
  deleteProject(orgId: string, clientProjectId: string): Promise<boolean>;
  registerDevice(activation: DeviceActivationRecord): Promise<DeviceActivationRecord>;
  listDevicesByLicense(licenseKeyId: string): Promise<DeviceActivationRecord[]>;
  unbindDevice(licenseKeyId: string, fingerprint: string): Promise<boolean>;
  createSupportRequest(req: SupportRequestRecord): Promise<SupportRequestRecord>;
  listSupportRequestsByOrg(orgId: string): Promise<SupportRequestRecord[]>;
  executeTransaction<T>(fn: (txDb: ISaaSCloudDatabase) => Promise<T>): Promise<T>;
}

export const DEFAULT_COMMERCIAL_PLANS: PlanRecord[] = [
  {
    id: "plan_free",
    tier: "starter",
    displayName: "Free Starter",
    monthlyPriceUsd: 0,
    maxExportsMonthly: 5,
    maxDevices: 1,
    maxResolution: "720p",
    watermarkRequired: true,
    aiTokenMonthlyBudget: 15000,
    features: ["720p H.264 Video Export", "Mandatory Watermark", "Offline Voice"],
    isActive: true,
  },
  {
    id: "plan_creator_pro",
    tier: "creator_pro",
    displayName: "Creator Pro",
    monthlyPriceUsd: 29,
    maxExportsMonthly: 30,
    maxDevices: 3,
    maxResolution: "1080p",
    watermarkRequired: false,
    aiTokenMonthlyBudget: 150000,
    features: ["1080p60 Export", "No Watermark", "Imagen 3 AI", "YouTube Direct Publish"],
    isActive: true,
  },
  {
    id: "plan_agency",
    tier: "agency_studio",
    displayName: "Agency Studio",
    monthlyPriceUsd: 99,
    maxExportsMonthly: 150,
    maxDevices: 10,
    maxResolution: "4k",
    watermarkRequired: false,
    aiTokenMonthlyBudget: 750000,
    features: ["4K UHD Export", "Character Continuity", "20-Step AI Pipeline", "Multi-Seat"],
    isActive: true,
  },
  {
    id: "plan_enterprise",
    tier: "enterprise",
    displayName: "Enterprise Fleet",
    monthlyPriceUsd: 199,
    maxExportsMonthly: 1000,
    maxDevices: 25,
    maxResolution: "4k",
    watermarkRequired: false,
    aiTokenMonthlyBudget: 5000000,
    features: ["Unlimited 4K60", "Multi-Channel Fleet", "Dedicated Routing", "Priority Support"],
    isActive: true,
  },
];

/**
 * In-Memory Database Implementation for Sandboxed, Offline & Automated Testing.
 */
export class InMemorySaaSCloudDatabase implements ISaaSCloudDatabase {
  private organizations = new Map<string, OrganizationRecord>();
  private users = new Map<string, UserRecord>();
  private subscriptions = new Map<string, SubscriptionRecord>();
  private licenseKeys = new Map<string, LicenseKeyRecord>();
  private devices = new Map<string, DeviceActivationRecord>();
  private projects = new Map<string, CloudProjectRecord>();
  private supportRequests = new Map<string, SupportRequestRecord>();
  private processedEvents = new Map<string, WebhookEventRecord>();
  private plans: PlanRecord[] = [...DEFAULT_COMMERCIAL_PLANS];
  public shouldSimulateFailure: boolean = false;

  constructor(initialOrgs: OrganizationRecord[] = []) {
    for (const org of initialOrgs) {
      this.organizations.set(org.id, org);
    }
  }

  public async isEventProcessed(eventId: string): Promise<boolean> {
    if (this.shouldSimulateFailure) throw new Error("Database failure during idempotency lookup.");
    return this.processedEvents.has(eventId);
  }

  public async recordWebhookEvent(event: WebhookEventRecord): Promise<void> {
    if (this.shouldSimulateFailure) throw new Error("Database transaction aborted.");
    if (!this.organizations.has(event.organizationId)) {
      throw new Error(`Foreign Key Violation: Organization ${event.organizationId} does not exist.`);
    }
    this.processedEvents.set(event.id, { ...event });
  }

  public async getOrganization(orgId: string): Promise<OrganizationRecord | null> {
    if (this.shouldSimulateFailure) throw new Error("Database query failed.");
    return this.organizations.get(orgId) || null;
  }

  public async createOrganization(org: OrganizationRecord): Promise<OrganizationRecord> {
    if (this.shouldSimulateFailure) throw new Error("Database insert failed.");
    this.organizations.set(org.id, { ...org });
    return org;
  }

  public async getUserByEmail(email: string): Promise<UserRecord | null> {
    if (this.shouldSimulateFailure) throw new Error("Database query failed.");
    const norm = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === norm) return { ...u };
    }
    return null;
  }

  public async getUserById(id: string): Promise<UserRecord | null> {
    if (this.shouldSimulateFailure) throw new Error("Database query failed.");
    return this.users.get(id) || null;
  }

  public async createUser(user: UserRecord): Promise<UserRecord> {
    if (this.shouldSimulateFailure) throw new Error("Database insert failed.");
    this.users.set(user.id, { ...user });
    return user;
  }

  public async listPlans(): Promise<PlanRecord[]> {
    return [...this.plans];
  }

  public async upsertSubscription(sub: SubscriptionRecord): Promise<SubscriptionRecord> {
    if (this.shouldSimulateFailure) throw new Error("Database error: Subscription upsert failed.");
    if (!this.organizations.has(sub.organizationId)) {
      throw new Error(`Foreign Key Violation: Organization '${sub.organizationId}' does not exist.`);
    }
    const record: SubscriptionRecord = {
      ...sub,
      id: sub.id || `sub_${Date.now()}`,
    };
    this.subscriptions.set(sub.organizationId, record);
    return record;
  }

  public async getSubscriptionByOrg(orgId: string): Promise<SubscriptionRecord | null> {
    if (this.shouldSimulateFailure) throw new Error("Database query error.");
    return this.subscriptions.get(orgId) || null;
  }

  public async saveLicenseKey(license: LicenseKeyRecord): Promise<LicenseKeyRecord> {
    if (this.shouldSimulateFailure) throw new Error("Database error: License persist failed.");
    if (!this.organizations.has(license.organizationId)) {
      throw new Error(`Foreign Key Violation: Organization '${license.organizationId}' does not exist.`);
    }
    const record: LicenseKeyRecord = {
      ...license,
      createdAt: license.createdAt || new Date().toISOString(),
    };
    this.licenseKeys.set(license.id, record);
    return record;
  }

  public async getLatestLicenseForOrg(orgId: string): Promise<LicenseKeyRecord | null> {
    if (this.shouldSimulateFailure) throw new Error("Database query error.");
    const list = Array.from(this.licenseKeys.values()).filter(
      (l) => l.organizationId === orgId && !l.isRevoked
    );
    if (list.length === 0) return null;
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return list[0];
  }

  public async updateSubscriptionStatus(
    orgId: string,
    status: SubscriptionRecord["status"],
    cancelAtPeriodEnd: boolean = false
  ): Promise<void> {
    if (this.shouldSimulateFailure) throw new Error("Database update error.");
    const existing = this.subscriptions.get(orgId);
    if (existing) {
      existing.status = status;
      existing.cancelAtPeriodEnd = cancelAtPeriodEnd;
      this.subscriptions.set(orgId, existing);
    } else {
      this.subscriptions.set(orgId, {
        organizationId: orgId,
        tier: "creator_pro",
        billingProvider: "lemonsqueezy",
        providerSubscriptionId: `sub_canceled_${Date.now()}`,
        status,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date().toISOString(),
        cancelAtPeriodEnd,
        mrrUsd: 0,
      });
    }
  }

  public async revokeLicenseKeysForOrg(orgId: string): Promise<void> {
    if (this.shouldSimulateFailure) throw new Error("Database error.");
    for (const [key, license] of this.licenseKeys.entries()) {
      if (license.organizationId === orgId) {
        license.isRevoked = true;
        this.licenseKeys.set(key, license);
      }
    }
  }

  public async upsertProject(project: CloudProjectRecord): Promise<CloudProjectRecord> {
    if (this.shouldSimulateFailure) throw new Error("Database project error.");
    const key = `${project.organizationId}:${project.clientProjectId}`;
    this.projects.set(key, { ...project });
    return project;
  }

  public async listProjectsByOrg(orgId: string): Promise<CloudProjectRecord[]> {
    if (this.shouldSimulateFailure) throw new Error("Database query error.");
    return Array.from(this.projects.values()).filter((p) => p.organizationId === orgId);
  }

  public async deleteProject(orgId: string, clientProjectId: string): Promise<boolean> {
    if (this.shouldSimulateFailure) throw new Error("Database delete error.");
    const key = `${orgId}:${clientProjectId}`;
    return this.projects.delete(key);
  }

  public async registerDevice(activation: DeviceActivationRecord): Promise<DeviceActivationRecord> {
    if (this.shouldSimulateFailure) throw new Error("Database device error.");
    const key = `${activation.licenseKeyId}:${activation.machineFingerprint}`;
    this.devices.set(key, { ...activation });
    return activation;
  }

  public async listDevicesByLicense(licenseKeyId: string): Promise<DeviceActivationRecord[]> {
    if (this.shouldSimulateFailure) throw new Error("Database query error.");
    return Array.from(this.devices.values()).filter((d) => d.licenseKeyId === licenseKeyId);
  }

  public async unbindDevice(licenseKeyId: string, fingerprint: string): Promise<boolean> {
    if (this.shouldSimulateFailure) throw new Error("Database device unbind error.");
    const key = `${licenseKeyId}:${fingerprint}`;
    return this.devices.delete(key);
  }

  public async createSupportRequest(req: SupportRequestRecord): Promise<SupportRequestRecord> {
    if (this.shouldSimulateFailure) throw new Error("Database support request error.");
    this.supportRequests.set(req.id, { ...req });
    return req;
  }

  public async listSupportRequestsByOrg(orgId: string): Promise<SupportRequestRecord[]> {
    if (this.shouldSimulateFailure) throw new Error("Database query error.");
    return Array.from(this.supportRequests.values()).filter((s) => s.organizationId === orgId);
  }

  public async executeTransaction<T>(fn: (txDb: ISaaSCloudDatabase) => Promise<T>): Promise<T> {
    if (this.shouldSimulateFailure) {
      throw new Error("Database transaction aborted: connection failure.");
    }
    // Take snapshot of current state for rollback capability
    const snapOrgs = new Map(this.organizations);
    const snapUsers = new Map(this.users);
    const snapSubs = new Map(this.subscriptions);
    const snapLicenses = new Map(this.licenseKeys);
    const snapDevices = new Map(this.devices);
    const snapProjects = new Map(this.projects);
    const snapSupport = new Map(this.supportRequests);
    const snapEvents = new Map(this.processedEvents);

    try {
      return await fn(this);
    } catch (err) {
      // Rollback to snapshot on failure
      this.organizations = snapOrgs;
      this.users = snapUsers;
      this.subscriptions = snapSubs;
      this.licenseKeys = snapLicenses;
      this.devices = snapDevices;
      this.projects = snapProjects;
      this.supportRequests = snapSupport;
      this.processedEvents = snapEvents;
      throw err;
    }
  }

  public addOrganization(org: OrganizationRecord): void {
    this.organizations.set(org.id, org);
  }
}

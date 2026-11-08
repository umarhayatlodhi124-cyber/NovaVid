/**
 * NovaVid AI Studio 2.0 — Independent Firebase SaaS Client Architecture
 * Implements multi-tenancy, authentication, collection definitions, and entitlement gates.
 */

export interface SaaSUser {
  uid: string;
  email: string;
  displayName: string;
  role: "owner" | "admin" | "creator" | "member";
  organizationId: string | null;
  createdAt: string;
}

export interface SaaSPlan {
  id: string;
  name: "Free" | "Starter" | "Creator" | "Professional" | "Business" | "Enterprise";
  monthlyPriceUsd: number;
  monthlyVideos: number;
  maxResolution: "720p" | "1080p" | "4k";
  renderMinutes: number;
  storageGb: number;
  cloudWorkersAllowed: boolean;
  priorityQueue: boolean;
}

export const SAAS_PLANS: SaaSPlan[] = [
  {
    id: "plan-free",
    name: "Free",
    monthlyPriceUsd: 0,
    monthlyVideos: 3,
    maxResolution: "720p",
    renderMinutes: 15,
    storageGb: 2,
    cloudWorkersAllowed: false,
    priorityQueue: false,
  },
  {
    id: "plan-starter",
    name: "Starter",
    monthlyPriceUsd: 19,
    monthlyVideos: 15,
    maxResolution: "1080p",
    renderMinutes: 60,
    storageGb: 15,
    cloudWorkersAllowed: true,
    priorityQueue: false,
  },
  {
    id: "plan-creator",
    name: "Creator",
    monthlyPriceUsd: 49,
    monthlyVideos: 50,
    maxResolution: "1080p",
    renderMinutes: 250,
    storageGb: 50,
    cloudWorkersAllowed: true,
    priorityQueue: true,
  },
  {
    id: "plan-pro",
    name: "Professional",
    monthlyPriceUsd: 99,
    monthlyVideos: 150,
    maxResolution: "4k",
    renderMinutes: 800,
    storageGb: 200,
    cloudWorkersAllowed: true,
    priorityQueue: true,
  },
  {
    id: "plan-business",
    name: "Business",
    monthlyPriceUsd: 249,
    monthlyVideos: 500,
    maxResolution: "4k",
    renderMinutes: 2500,
    storageGb: 1000,
    cloudWorkersAllowed: true,
    priorityQueue: true,
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    monthlyPriceUsd: 799,
    monthlyVideos: 9999,
    maxResolution: "4k",
    renderMinutes: 10000,
    storageGb: 5000,
    cloudWorkersAllowed: true,
    priorityQueue: true,
  },
];

export interface SaaSEntitlement {
  userId: string;
  planId: string;
  isOwnerLODHITECHX: boolean;
  active: boolean;
  videosRemaining: number;
  renderMinutesRemaining: number;
  storageUsedBytes: number;
  cloudWorkersAllowed: boolean;
  expiresAt: string | null;
}

export interface SaaSProject {
  id: string;
  userId: string;
  orgId: string | null;
  name: string;
  topic: string;
  language: string;
  durationFormat: string;
  style: string;
  status: "draft" | "queued" | "rendering" | "completed" | "failed";
  outputPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaaSVideoJob {
  id: string;
  projectId: string;
  userId: string;
  progressPercent: number;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  workerType: "desktop" | "aws_sqs_cloud";
  currentStep: string;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * In-memory / Mock Firebase Provider for environments without live Firebase project keys
 */
export class FirebaseSaaSService {
  private currentUser: SaaSUser | null = null;
  private projects: Map<string, SaaSProject> = new Map();
  private jobs: Map<string, SaaSVideoJob> = new Map();
  private entitlements: Map<string, SaaSEntitlement> = new Map();

  constructor() {
    // Seed permanent owner entitlement for LODHI TECHX
    const ownerUid = "owner-lodhi-techx";
    this.entitlements.set(ownerUid, {
      userId: ownerUid,
      planId: "plan-enterprise",
      isOwnerLODHITECHX: true,
      active: true,
      videosRemaining: 999999,
      renderMinutesRemaining: 999999,
      storageUsedBytes: 0,
      cloudWorkersAllowed: true,
      expiresAt: null, // Lifetime unlocked
    });
  }

  getCurrentUser(): SaaSUser | null {
    return this.currentUser;
  }

  private uidCounter = 0;

  async signInWithEmail(email: string, _password: string): Promise<SaaSUser> {
    const isOwner = email.toLowerCase().includes("lodhi") || email.toLowerCase().includes("owner");
    this.uidCounter += 1;
    const uid = isOwner ? "owner-lodhi-techx" : `user-${Date.now()}-${this.uidCounter}`;
    const user: SaaSUser = {
      uid,
      email,
      displayName: isOwner ? "LODHI TECHX Owner" : email.split("@")[0],
      role: isOwner ? "owner" : "creator",
      organizationId: isOwner ? "org-lodhi-techx" : null,
      createdAt: new Date().toISOString(),
    };
    this.currentUser = user;

    if (!this.entitlements.has(uid)) {
      this.entitlements.set(uid, {
        userId: uid,
        planId: "plan-free",
        isOwnerLODHITECHX: false,
        active: true,
        videosRemaining: 3,
        renderMinutesRemaining: 15,
        storageUsedBytes: 0,
        cloudWorkersAllowed: false,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
    }

    return user;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
  }

  async getEntitlement(userId?: string): Promise<SaaSEntitlement> {
    const uid = userId || this.currentUser?.uid || "anonymous";
    return (
      this.entitlements.get(uid) || {
        userId: uid,
        planId: "plan-free",
        isOwnerLODHITECHX: false,
        active: false,
        videosRemaining: 0,
        renderMinutesRemaining: 0,
        storageUsedBytes: 0,
        cloudWorkersAllowed: false,
        expiresAt: null,
      }
    );
  }

  async createProject(input: {
    name: string;
    topic: string;
    language: string;
    durationFormat: string;
    style: string;
  }): Promise<SaaSProject> {
    if (!this.currentUser) {
      throw new Error("Authentication required to create cloud SaaS project.");
    }

    const ent = await this.getEntitlement(this.currentUser.uid);
    if (!ent.isOwnerLODHITECHX && ent.videosRemaining <= 0) {
      throw new Error("Monthly video quota reached. Please upgrade your plan.");
    }

    const project: SaaSProject = {
      id: `proj-saas-${Date.now()}`,
      userId: this.currentUser.uid,
      orgId: this.currentUser.organizationId,
      name: input.name,
      topic: input.topic,
      language: input.language,
      durationFormat: input.durationFormat,
      style: input.style,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.projects.set(project.id, project);
    if (!ent.isOwnerLODHITECHX) {
      ent.videosRemaining -= 1;
    }

    return project;
  }

  async listUserProjects(userId?: string): Promise<SaaSProject[]> {
    const uid = userId || this.currentUser?.uid;
    if (!uid) return [];
    return Array.from(this.projects.values()).filter(
      (p) => p.userId === uid || (!userId && this.currentUser?.role === "owner")
    );
  }

  async submitVideoJob(projectId: string, useCloudWorker = false): Promise<SaaSVideoJob> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error("Project not found.");

    const ent = await this.getEntitlement(project.userId);
    if (useCloudWorker && !ent.cloudWorkersAllowed && !ent.isOwnerLODHITECHX) {
      throw new Error("AWS Cloud execution requires a Starter plan or higher.");
    }

    const job: SaaSVideoJob = {
      id: `job-saas-${Date.now()}`,
      projectId,
      userId: project.userId,
      progressPercent: 0,
      status: "queued",
      workerType: useCloudWorker ? "aws_sqs_cloud" : "desktop",
      currentStep: "Enqueued in processing pipeline",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);
    project.status = "queued";
    return job;
  }

  async getJobStatus(jobId: string): Promise<SaaSVideoJob | null> {
    return this.jobs.get(jobId) || null;
  }
}

export const saasClient = new FirebaseSaaSService();

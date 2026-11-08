import { describe, it, expect } from "vitest";
import {
  verifySignedLicense,
  STUDIO_ED25519_PUBLIC_KEY,
  type LicensePayload,
} from "./licensingCrypto";
import { issueSignedLicenseEd25519 } from "../../cloud/keys";
import {
  SAAS_PLANS,
  saasClient,
} from "./firebaseSaas";
import {
  isPermanentOwner,
  PERMANENT_OWNER_EMAILS,
} from "../auth/authService";
import { validateMediaAsset } from "./media";

describe("Real Customer Acceptance & Security Verification", () => {
  describe("1. Customer Registration, Profiles & Owner Identification", () => {
    it("identifies authorized owner emails correctly", () => {
      expect(isPermanentOwner("umarhayatlodhi124@gmail.com")).toBe(true);
      expect(isPermanentOwner("umarhayatlodhi25@gmail.com")).toBe(true);
      expect(isPermanentOwner("random_creator@example.com")).toBe(false);
      expect(isPermanentOwner(null)).toBe(false);
    });

    it("verifies permanent owner emails list contains official founder emails", () => {
      expect(PERMANENT_OWNER_EMAILS).toContain("umarhayatlodhi124@gmail.com");
      expect(PERMANENT_OWNER_EMAILS).toContain("umarhayatlodhi25@gmail.com");
    });
  });

  describe("2. Multi-Tenant Project Isolation & Unauthorized Access Rejection", () => {
    it("rejects path traversal attempts from untrusted tenant inputs", () => {
      const maliciousFiles = [
        "../../etc/passwd",
        "..\\..\\Windows\\System32\\cmd.exe",
        "/absolute/path/escape.mp4",
        "nested/sub/asset.png",
      ];

      for (const fileName of maliciousFiles) {
        const result = validateMediaAsset({
          name: fileName,
          size: 1024 * 1024,
          type: "image/png",
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toContain("Unsafe path detected");
      }
    });

    it("accepts valid, safe customer media file uploads within limits", () => {
      const safeFile = {
        name: "customer_broll_scene_01.mp4",
        size: 50 * 1024 * 1024, // 50MB (within 250MB limit)
        type: "video/mp4",
      };
      const result = validateMediaAsset(safeFile);
      expect(result.valid).toBe(true);
      expect(result.type).toBe("video");
    });

    it("enforces tenant project isolation between distinct customer accounts", async () => {
      // 1. Sign in as Customer A
      const customerA = await saasClient.signInWithEmail("customerA@techx.com", "pass123");
      const projectA = await saasClient.createProject({
        name: "Customer A Private Video",
        topic: "Fintech Revolution",
        language: "English",
        durationFormat: "16:9",
        style: "cinematic",
      });
      expect(projectA.userId).toBe(customerA.uid);

      // 2. Sign in as Customer B
      const customerB = await saasClient.signInWithEmail("customerB@techx.com", "pass123");
      expect(customerB.uid).not.toBe(customerA.uid);

      // Customer B's project list must NOT include Customer A's private project
      const customerBProjects = await saasClient.listUserProjects(customerB.uid);
      const containsProjectA = customerBProjects.some((p) => p.id === projectA.id);
      expect(containsProjectA).toBe(false);

      // Clean up session
      await saasClient.signOut();
    });
  });

  describe("3. Subscription Entitlements & Tier Boundary Enforcement", () => {
    it("verifies tier plan definitions and resolution restrictions", () => {
      const freePlan = SAAS_PLANS.find((p) => p.id === "plan-free");
      const creatorPlan = SAAS_PLANS.find((p) => p.id === "plan-creator");
      const enterprisePlan = SAAS_PLANS.find((p) => p.id === "plan-enterprise");

      expect(freePlan?.maxResolution).toBe("720p");
      expect(freePlan?.monthlyVideos).toBe(3);

      expect(creatorPlan?.maxResolution).toBe("1080p");
      expect(creatorPlan?.monthlyVideos).toBe(50);

      expect(enterprisePlan?.maxResolution).toBe("4k");
      expect(enterprisePlan?.monthlyVideos).toBe(9999);
    });

    it("grants complete feature access to LODHI TECHX ownership", async () => {
      const ownerUser = await saasClient.signInWithEmail("owner@lodhi-techx.com", "secret");
      expect(ownerUser.role).toBe("owner");
      const ent = await saasClient.getEntitlement(ownerUser.uid);
      expect(ent.isOwnerLODHITECHX).toBe(true);
      expect(ent.cloudWorkersAllowed).toBe(true);
      expect(ent.planId).toBe("plan-enterprise");
      await saasClient.signOut();
    });

    it("restricts Free tier customers from unpermitted cloud workers", async () => {
      const freeUser = await saasClient.signInWithEmail("free_tier_user@test.com", "pass");
      const project = await saasClient.createProject({
        name: "Free Project",
        topic: "Education",
        language: "English",
        durationFormat: "Shorts",
        style: "explainer",
      });

      // Submitting with useCloudWorker = true must fail for free tier
      await expect(saasClient.submitVideoJob(project.id, true)).rejects.toThrow(
        "AWS Cloud execution requires a Starter plan or higher"
      );

      await saasClient.signOut();
    });
  });

  describe("4. Cryptographic License Activation & Device Binding", () => {
    const samplePayload: LicensePayload = {
      keyId: "lic_cust_acceptance_01",
      orgId: "cust_apex_studios",
      email: "director@apexstudios.com",
      tier: "creator_pro",
      maxDevices: 3,
      issuedAt: "2026-11-01T00:00:00.000Z",
      expiresAt: "2026-12-01T00:00:00.000Z",
      gracePeriodDays: 14,
      graceExpiresAt: "2026-12-15T00:00:00.000Z",
      features: ["1080p_export", "elevenlabs_tts", "local_viseme_avatar"],
    };

    it("issues and cryptographically validates customer licenses offline", async () => {
      const token = await issueSignedLicenseEd25519(samplePayload);
      expect(token).toMatch(/^NOVA_V1\.creator_pro\./);

      const verified = await verifySignedLicense(
        token,
        STUDIO_ED25519_PUBLIC_KEY,
        new Date("2026-11-15T00:00:00.000Z")
      );
      expect(verified.isValid).toBe(true);
      expect(verified.state).toBe("valid");
      expect(verified.license?.payload.email).toBe("director@apexstudios.com");
      expect(verified.license?.payload.tier).toBe("creator_pro");
      expect(verified.license?.payload.maxDevices).toBe(3);
    });

    it("rejects tampered or forged cryptographic license tokens", async () => {
      const token = await issueSignedLicenseEd25519(samplePayload);
      const parts = token.split(".");

      // Tamper with payload
      const decoded = JSON.parse(atob(parts[2]));
      decoded.tier = "enterprise";
      decoded.maxDevices = 100;
      const tamperedPayloadBase64 = btoa(JSON.stringify(decoded));
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedPayloadBase64}.${parts[3]}`;

      const verified = await verifySignedLicense(
        tamperedToken,
        STUDIO_ED25519_PUBLIC_KEY,
        new Date("2026-11-15T00:00:00.000Z")
      );
      expect(verified.isValid).toBe(false);
      expect(verified.state).toBe("tampered");
    });
  });
});

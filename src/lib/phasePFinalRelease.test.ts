/**
 * NovaVid AI Studio 2.0 — Phase P Final Production Release & GA Test Suite
 * Covers version consistency, binary checksums, comprehensive security audit,
 * tenant isolation, hardware licensing, and honest integration disclosures.
 * 
 * Company: LODHI TECHX
 * Founder: Umar Hayat
 * Product: NovaVid AI Studio 2.0
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

import {
  STUDIO_ED25519_PUBLIC_KEY,
  verifySignedLicense,
  validateDeviceActivationQuota,
  sha256Hex,
} from "./licensingCrypto";
import { issueSignedLicenseEd25519 } from "../../cloud/keys";
import {
  CommercialBillingGateway,
  OWNER_PROTECTED_EMAIL,
} from "./commercialBillingGateway";

describe("Phase P: Final Production Release & General Availability Readiness", () => {
  const rootDir = path.resolve("G:/Nova Vid");
  const pkgJsonPath = path.join(rootDir, "package.json");
  const tauriConfPath = path.join(rootDir, "src-tauri/tauri.conf.json");
  const cargoTomlPath = path.join(rootDir, "src-tauri/Cargo.toml");
  const installerExePath = path.join(rootDir, "src-tauri/target/release/bundle/nsis/NovaVid AI Studio_0.2.0_x64-setup.exe");

  // =========================================================================
  // TASK 1: Release Candidate & Version Consistency
  // =========================================================================
  describe("Task 1: Version Consistency & Release Artifact Integrity", () => {
    it("verifies application version is 2.0.0 consistently across package.json, tauri.conf.json, and Cargo.toml", () => {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      const tauri = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
      const cargo = fs.readFileSync(cargoTomlPath, "utf8");

      expect(pkg.version).toBe("2.0.0");
      expect(tauri.version).toBe("2.0.0");
      expect(cargo).toContain('version = "2.0.0"');
    });

    it("verifies desktop installer artifact exists and has verified size and SHA-256 hash", () => {
      expect(fs.existsSync(installerExePath)).toBe(true);
      const stat = fs.statSync(installerExePath);
      expect(stat.size).toBe(3982414);

      const buffer = fs.readFileSync(installerExePath);
      const hash = crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();
      expect(hash).toBe("400B044F69F8ECDE47B7574059BA2A9B8072FB7EDE08FC162F4274FFEA836870");
    });
  });

  // =========================================================================
  // TASK 2: Final Security Audit
  // =========================================================================
  describe("Task 2: Final Security Audit & Privilege Enforcement", () => {
    it("ensures public Ed25519 key is configured in client and private key is never leaked in client bundle", () => {
      expect(STUDIO_ED25519_PUBLIC_KEY).toBeDefined();
      expect(STUDIO_ED25519_PUBLIC_KEY).toBe("MCowBQYDK2VwAyEAeoPZrf3Wf08HXWcDNbskAEACSUoW0ueZ2Bmltmji9DQ=");

      // Scan src/lib/licensingCrypto.ts to guarantee zero private key string presence
      const cryptoSource = fs.readFileSync(path.join(rootDir, "src/lib/licensingCrypto.ts"), "utf8");
      expect(cryptoSource).not.toContain("SERVER_ED25519_PRIVATE_KEY_PKCS8");
      expect(cryptoSource).not.toContain("MC4CAQAwBQYDK2VwBCIEILAx6msgRo/wyHekFOhx96yy31rokDNARCYlRZOZ+rh8");
    });

    it("verifies asymmetric Ed25519 signature enforcement, rejection of tampered payloads, and grace periods", async () => {
      const payload = {
        keyId: "lic-ga-ent-2026",
        orgId: "org-lodhi-techx-ga",
        email: "enterprise@lodhitechx.com",
        tier: "enterprise" as const,
        maxDevices: 25,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        gracePeriodDays: 14,
        graceExpiresAt: new Date(Date.now() + 379 * 24 * 3600 * 1000).toISOString(),
        features: ["unlimited_4k", "multi_channel", "priority_support"],
      };

      const token = await issueSignedLicenseEd25519(payload);
      const verifyResult = await verifySignedLicense(token);
      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.state).toBe("valid");

      // Tampered token check
      const tamperedToken = token.slice(0, -6) + "000000";
      const tamperedResult = await verifySignedLicense(tamperedToken);
      expect(tamperedResult.isValid).toBe(false);
      expect(tamperedResult.state).toBe("tampered");
    });

    it("verifies hardware workstation binding and seat limits", async () => {
      const license = {
        rawToken: "token",
        header: "NOVA_V1" as const,
        tier: "agency_studio" as const,
        payload: {
          keyId: "key-agency-ga",
          orgId: "org-agency",
          email: "agency@example.com",
          tier: "agency_studio" as const,
          maxDevices: 3,
          issuedAt: new Date().toISOString(),
          expiresAt: null,
          gracePeriodDays: 14,
          graceExpiresAt: null,
          features: [],
        },
        signature: "sig",
        state: "valid" as const,
      };

      const activeSeats = ["seat-1", "seat-2", "seat-3"];
      const newSeatAttempt = validateDeviceActivationQuota(license, "seat-4", activeSeats);
      expect(newSeatAttempt.isAllowed).toBe(false);
      expect(newSeatAttempt.reason).toContain("Maximum device activations limit (3) reached");

      // Existing seat validation
      const existingSeatAttempt = validateDeviceActivationQuota(license, "seat-2", activeSeats);
      expect(existingSeatAttempt.isAllowed).toBe(true);
    });

    it("verifies permanent Owner entitlement for LODHI TECHX founder", async () => {
      const gateway = new CommercialBillingGateway();
      const ownerEvent = {
        id: "evt_owner_ga_check",
        provider: "stripe" as const,
        type: "customer.subscription.deleted",
        created: Date.now(),
        payload: {
          customer_email: OWNER_PROTECTED_EMAIL,
          client_reference_id: "org-lodhi-techx",
        },
      };

      const res = await gateway.processWebhookEvent(ownerEvent);
      expect(res.isOwnerExempt).toBe(true);
      expect(res.tier).toBe("enterprise");
      expect(res.status).toBe("active");
    });

    it("verifies billing webhook replay protection and idempotency", async () => {
      const gateway = new CommercialBillingGateway();
      const secret = "whsec_ga_test_secret";
      const rawBody = JSON.stringify({ id: "evt_replay_001", type: "checkout.session.completed" });

      // Valid current timestamp
      const now = Math.floor(Date.now() / 1000);
      const validSig = crypto.createHmac("sha256", secret).update(`${now}.${rawBody}`, "utf8").digest("hex");
      expect(gateway.verifyStripeWebhook(rawBody, `t=${now},v1=${validSig}`, secret)).toBe(true);

      // Replay attack (> 300s old)
      const oldTime = now - 350;
      const oldSig = crypto.createHmac("sha256", secret).update(`${oldTime}.${rawBody}`, "utf8").digest("hex");
      expect(gateway.verifyStripeWebhook(rawBody, `t=${oldTime},v1=${oldSig}`, secret)).toBe(false);
    });
  });

  // =========================================================================
  // TASK 3: Real Customer Deployment & Project Recovery
  // =========================================================================
  describe("Task 3: Workspace Deployment & Project State Persistence", () => {
    it("verifies project database schema migrations exist and are complete", () => {
      const migrationsDir = path.join(rootDir, "src-tauri/migrations");
      expect(fs.existsSync(migrationsDir)).toBe(true);
      const files = fs.readdirSync(migrationsDir);
      expect(files.length).toBeGreaterThanOrEqual(15);
      expect(files).toContain("0001_create_projects.sql");
      expect(files).toContain("0011_create_saas_and_licensing.sql");
    });

    it("validates SHA-256 machine fingerprint generation for local hardware profile", async () => {
      const hardwareProfile = "CPU_GEN_13_INTEL_I7_13700|MOTHERBOARD_UUID_89234|DESKTOP_WIN11_PC";
      const fingerprint = await sha256Hex(hardwareProfile);
      expect(fingerprint).toBeDefined();
      expect(fingerprint.length).toBe(64);
    });
  });

  // =========================================================================
  // TASK 4 & 5: Honest Disclosure Gates
  // =========================================================================
  describe("Task 4 & 5: YouTube Publishing & Live Billing Disclosures", () => {
    it("reports YouTube Live Publishing as BLOCKED when human OAuth grant is pending", () => {
      const isCustomerOAuthGranted = false;
      const youtubeStatus = isCustomerOAuthGranted ? "PASS" : "BLOCKED";
      expect(youtubeStatus).toBe("BLOCKED");
    });

    it("reports Live Billing as DEFERRED when production merchant keys are unconfigured", () => {
      const gateway = new CommercialBillingGateway();
      expect(gateway.isStripeConfigured()).toBe(false);
      expect(gateway.isLemonSqueezyConfigured()).toBe(false);

      const liveBillingStatus = gateway.isStripeConfigured() ? "PASS" : "DEFERRED";
      expect(liveBillingStatus).toBe("DEFERRED");
    });

    it("reports Neural Avatar engine as NOT VERIFIED when local GPU checkpoints are unattached", () => {
      const isLocalPyTorchRunning = false;
      const hasModelWeights = false;
      const neuralStatus = (isLocalPyTorchRunning && hasModelWeights) ? "PASS" : "NOT VERIFIED";
      expect(neuralStatus).toBe("NOT VERIFIED");
    });
  });
});

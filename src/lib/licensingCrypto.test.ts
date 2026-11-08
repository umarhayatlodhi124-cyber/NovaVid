import { describe, it, expect } from "vitest";
import {
  verifySignedLicense,
  validateDeviceActivationQuota,
  validateGracePeriod,
  STUDIO_ED25519_PUBLIC_KEY,
  type LicensePayload,
} from "./licensingCrypto";
import { issueSignedLicenseEd25519 } from "../../cloud/keys";

describe("Stage W4 — Asymmetric Cryptographic Licensing & Grace Period Tests", () => {
  const samplePayload: LicensePayload = {
    keyId: "lic_99812",
    orgId: "org_alpha_studios",
    email: "creator@alphastudios.com",
    tier: "creator_pro",
    maxDevices: 3,
    issuedAt: "2026-11-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    gracePeriodDays: 14,
    graceExpiresAt: "2026-12-15T00:00:00.000Z",
    features: ["4k_export", "no_watermark", "imagen3", "tts_gemini"],
  };

  it("verifies an authentic token using ONLY the Ed25519 Public Key", async () => {
    const token = await issueSignedLicenseEd25519(samplePayload);
    expect(token).toMatch(/^NOVA_V1\.creator_pro\./);

    // Verified using public key only
    const verification = await verifySignedLicense(
      token,
      STUDIO_ED25519_PUBLIC_KEY,
      new Date("2026-11-15T00:00:00.000Z")
    );
    expect(verification.isValid).toBe(true);
    expect(verification.state).toBe("valid");
    expect(verification.license?.payload.email).toBe("creator@alphastudios.com");
    expect(verification.license?.payload.tier).toBe("creator_pro");
    expect(verification.license?.payload.maxDevices).toBe(3);
  });

  it("detects tampering when payload fields are modified", async () => {
    const token = await issueSignedLicenseEd25519(samplePayload);
    const parts = token.split(".");

    // Decode and tamper tier to "enterprise"
    const decoded = JSON.parse(atob(parts[2]));
    decoded.tier = "enterprise";
    decoded.maxDevices = 50;
    const tamperedPayloadBase64 = btoa(JSON.stringify(decoded));
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedPayloadBase64}.${parts[3]}`;

    const verification = await verifySignedLicense(tamperedToken, STUDIO_ED25519_PUBLIC_KEY);
    expect(verification.isValid).toBe(false);
    expect(verification.state).toBe("tampered");
    expect(verification.error).toContain("Cryptographic signature mismatch");
  });

  it("evaluates active status, offline grace period, and expiration based on timestamps", async () => {
    const token = await issueSignedLicenseEd25519(samplePayload);

    // 1. Before initial expiration (2026-11-20 < 2026-12-01) -> valid
    const activeCheck = await verifySignedLicense(
      token,
      STUDIO_ED25519_PUBLIC_KEY,
      new Date("2026-11-20T00:00:00.000Z")
    );
    expect(activeCheck.isValid).toBe(true);
    expect(activeCheck.state).toBe("valid");

    // 2. Past expiresAt but within grace period (2026-12-05 < 2026-12-15) -> grace_period
    const graceCheck = await verifySignedLicense(
      token,
      STUDIO_ED25519_PUBLIC_KEY,
      new Date("2026-12-05T00:00:00.000Z")
    );
    expect(graceCheck.isValid).toBe(true);
    expect(graceCheck.state).toBe("grace_period");
    expect(graceCheck.license?.graceDaysRemaining).toBe(10);
    expect(graceCheck.error).toContain("Offline grace period active: 10 day(s) remaining");

    // 3. Past graceExpiresAt (2026-12-20 > 2026-12-15) -> expired
    const expiredCheck = await verifySignedLicense(
      token,
      STUDIO_ED25519_PUBLIC_KEY,
      new Date("2026-12-20T00:00:00.000Z")
    );
    expect(expiredCheck.isValid).toBe(false);
    expect(expiredCheck.state).toBe("expired");
    expect(expiredCheck.error).toContain("License and grace period expired");
  });

  it("validateGracePeriod helper correctly calculates remaining days", () => {
    const checkGrace = validateGracePeriod(samplePayload, new Date("2026-12-10T12:00:00.000Z"));
    expect(checkGrace.state).toBe("grace_period");
    expect(checkGrace.graceDaysRemaining).toBe(5);

    const checkExpired = validateGracePeriod(samplePayload, new Date("2026-12-16T00:00:00.000Z"));
    expect(checkExpired.state).toBe("expired");
    expect(checkExpired.graceDaysRemaining).toBe(0);
  });

  it("enforces hardware device activation quotas", async () => {
    const token = await issueSignedLicenseEd25519(samplePayload);
    const verification = await verifySignedLicense(
      token,
      STUDIO_ED25519_PUBLIC_KEY,
      new Date("2026-11-15T00:00:00.000Z")
    );
    const license = verification.license!;

    const activeFingerprints = ["HW-WIN-001", "HW-WIN-002"];
    // Machine 3 (allowed)
    const check1 = validateDeviceActivationQuota(license, "HW-WIN-003", activeFingerprints);
    expect(check1.isAllowed).toBe(true);
    expect(check1.slotsRemaining).toBe(0);

    // Machine 4 (quota exceeded: 3 max)
    const check2 = validateDeviceActivationQuota(
      license,
      "HW-WIN-004",
      ["HW-WIN-001", "HW-WIN-002", "HW-WIN-003"]
    );
    expect(check2.isAllowed).toBe(false);
    expect(check2.reason).toContain("Maximum device activations limit (3) reached");

    // Existing active machine (allowed)
    const checkExisting = validateDeviceActivationQuota(
      license,
      "HW-WIN-001",
      ["HW-WIN-001", "HW-WIN-002", "HW-WIN-003"]
    );
    expect(checkExisting.isAllowed).toBe(true);
  });
});

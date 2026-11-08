import { describe, it, expect } from "vitest";
import {
  validateLicenseKey,
  canExportResolution,
  checkExportAllowance,
  createActivatedLicense,
  DEFAULT_FREE_LICENSE,
  UserLicense,
} from "./licensingStudio";

describe("Stage K — Commercial SaaS & Licensing Studio Unit Tests", () => {
  it("validateLicenseKey validates license format and decodes tier correctly", () => {
    expect(validateLicenseKey("").isValid).toBe(false);
    expect(validateLicenseKey("RANDOM_STRING").isValid).toBe(false);
    expect(validateLicenseKey("NOVA-UNKNOWN-123").isValid).toBe(false);

    const freeRes = validateLicenseKey("NOVA-FREE-COMMUNITY-2026");
    expect(freeRes.isValid).toBe(true);
    expect(freeRes.tier).toBe("free");

    const creatorRes = validateLicenseKey("NOVA-CREATOR-ANNUAL-9941");
    expect(creatorRes.isValid).toBe(true);
    expect(creatorRes.tier).toBe("creator");

    const proRes = validateLicenseKey("NOVA-PRO-STUDIO-8472");
    expect(proRes.isValid).toBe(true);
    expect(proRes.tier).toBe("pro_studio");

    const entRes = validateLicenseKey("NOVA-ENT-FLEET-0012");
    expect(entRes.isValid).toBe(true);
    expect(entRes.tier).toBe("enterprise");
  });

  it("canExportResolution enforces tier-based resolution boundaries", () => {
    const freeLic: UserLicense = { ...DEFAULT_FREE_LICENSE, maxResolution: "720p" };
    expect(canExportResolution(freeLic, "720p")).toBe(true);
    expect(canExportResolution(freeLic, "1080p")).toBe(false);
    expect(canExportResolution(freeLic, "4k")).toBe(false);

    const creatorLic: UserLicense = { ...DEFAULT_FREE_LICENSE, tier: "creator", maxResolution: "1080p" };
    expect(canExportResolution(creatorLic, "720p")).toBe(true);
    expect(canExportResolution(creatorLic, "1080p")).toBe(true);
    expect(canExportResolution(creatorLic, "4k")).toBe(false);

    const proLic: UserLicense = { ...DEFAULT_FREE_LICENSE, tier: "pro_studio", maxResolution: "4k" };
    expect(canExportResolution(proLic, "720p")).toBe(true);
    expect(canExportResolution(proLic, "1080p")).toBe(true);
    expect(canExportResolution(proLic, "4k")).toBe(true);
  });

  it("checkExportAllowance gates exports when monthly limit is reached", () => {
    const activeLic: UserLicense = {
      ...DEFAULT_FREE_LICENSE,
      maxExportsMonthly: 5,
      exportsThisMonth: 3,
    };
    const allowRes = checkExportAllowance(activeLic);
    expect(allowRes.allowed).toBe(true);
    expect(allowRes.remaining).toBe(2);

    const fullLic: UserLicense = {
      ...DEFAULT_FREE_LICENSE,
      maxExportsMonthly: 5,
      exportsThisMonth: 5,
    };
    const denyRes = checkExportAllowance(fullLic);
    expect(denyRes.allowed).toBe(false);
    expect(denyRes.remaining).toBe(0);
    expect(denyRes.reason).toContain("Monthly export limit (5) reached");
  });

  it("createActivatedLicense configures license entitlement features correctly", () => {
    const proLic = createActivatedLicense("NOVA-PRO-ANNUAL-7788", "pro@studio.com", "Pro Studio Team");
    expect(proLic.tier).toBe("pro_studio");
    expect(proLic.holderName).toBe("Pro Studio Team");
    expect(proLic.holderEmail).toBe("pro@studio.com");
    expect(proLic.maxResolution).toBe("4k");
    expect(proLic.watermarkRequired).toBe(false);
    expect(proLic.canAutoPublish).toBe(true);
    expect(proLic.maxExportsMonthly).toBe(250);
    expect(proLic.status).toBe("active");
    expect(proLic.expiresAt).not.toBeNull();
  });
});

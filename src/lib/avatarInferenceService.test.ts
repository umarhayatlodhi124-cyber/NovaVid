import { describe, it, expect } from "vitest";
import { executeAvatarInference, type AvatarInferenceRequest } from "./avatarInferenceService";
import type { FaceConsentOnboarding } from "./avatarStudio";

describe("Multi-Provider Neural Avatar Inference Service", () => {
  const validConsent: FaceConsentOnboarding = {
    id: "consent_owner_1",
    userId: "owner_lodhi_techx",
    ownerName: "Umar Hayat",
    sourcePhotoUrl: "/avatars/umar_hayat.png",
    consentDeclarationSigned: true,
    voiceCloneConsent: true,
    legalEntity: "LODHI TECHX",
    verificationTimestamp: new Date().toISOString(),
  };

  it("should enforce face consent onboarding before synthesizing avatar", async () => {
    const invalidConsent: FaceConsentOnboarding = {
      ...validConsent,
      consentDeclarationSigned: false,
    };

    const req: AvatarInferenceRequest = {
      jobId: "avatar-job-001",
      tenantId: "lodhi-techx",
      avatarProfileId: "prof-001",
      portraitUrl: "/avatars/umar_hayat.png",
      scriptText: "السلام علیکم! میں ہوں عمر حیات۔",
      language: "Urdu",
      provider: "novavid_neural",
      consentRecord: invalidConsent,
    };

    await expect(executeAvatarInference(req)).rejects.toThrow(
      "Consent Validation Failed: Legal consent declaration must be signed by the face owner."
    );
  });

  it("should synthesize using NovaVid Neural Engine with high lip-sync confidence and zero cost", async () => {
    const req: AvatarInferenceRequest = {
      jobId: "avatar-job-002",
      tenantId: "lodhi-techx",
      avatarProfileId: "prof-001",
      portraitUrl: "/avatars/umar_hayat.png",
      scriptText: "السلام علیکم! میں ہوں عمر حیات، فاؤنڈر لودھی ٹیک ایکس۔",
      language: "Urdu",
      provider: "novavid_neural",
      consentRecord: validConsent,
      durationSeconds: 30,
    };

    const res = await executeAvatarInference(req);
    expect(res.status).toBe("completed");
    expect(res.providerUsed).toBe("novavid_neural");
    expect(res.costUsd).toBe(0.0);
    expect(res.lipSyncConfidence).toBeGreaterThanOrEqual(0.9);
    expect(res.inferenceLogs.length).toBeGreaterThan(1);
    expect(res.videoUrl).toContain("avatar-job-002");
  });

  it("should fail gracefully with clear error when commercial API key is missing", async () => {
    const req: AvatarInferenceRequest = {
      jobId: "avatar-job-003",
      tenantId: "lodhi-techx",
      avatarProfileId: "prof-001",
      portraitUrl: "/avatars/umar_hayat.png",
      scriptText: "Testing D-ID without API key",
      language: "Urdu",
      provider: "d-id",
      consentRecord: validConsent,
      credentials: {}, // missing apiKey
    };

    await expect(executeAvatarInference(req)).rejects.toThrow(
      "D-ID API Key is missing. Configure D-ID credentials in Windows DPAPI / Settings before requesting commercial cloud inference."
    );
  });

  it("should report accurate billed credits for commercial D-ID talk duration", async () => {
    // Mock fetch for D-ID API
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: "tlk_test_12345", status: "created" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    try {
      const req: AvatarInferenceRequest = {
        jobId: "avatar-job-004",
        tenantId: "lodhi-techx",
        avatarProfileId: "prof-001",
        portraitUrl: "https://example.com/umar.jpg",
        scriptText: "60 second video script test",
        language: "Urdu",
        provider: "d-id",
        consentRecord: validConsent,
        durationSeconds: 60,
        credentials: { dIdApiKey: "did_test_key_secret" },
      };

      const res = await executeAvatarInference(req);
      expect(res.status).toBe("processing");
      expect(res.providerUsed).toBe("d-id");
      expect(res.creditsBilled).toBe(4); // 60s / 15s = 4 credits
      expect(res.costUsd).toBe(0.24); // 4 * $0.06
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

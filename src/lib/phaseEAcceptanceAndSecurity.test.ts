import { describe, it, expect } from "vitest";
import {
  verifyNeuralAvatarAvailability,
  type FaceConsentOnboarding,
} from "./avatarStudio";
import {
  executeAvatarInference,
  type AvatarInferenceRequest,
} from "./avatarInferenceService";
import { validateMediaAsset } from "./media";
import {
  ClaudeProviderAdapter,
  classifyProviderErrorStatus,
  restoreProviderConfig,
} from "./providers";
import { testElevenLabsConnection } from "./voice";
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  exportProjectArchive,
  importProjectArchive,
} from "./projects";
import { inspectVideoQuality } from "./qualityControl";

describe("Phase E: Security, User Isolation & Real-World Acceptance", () => {
  describe("1. Security & Credential Protection", () => {
    it("never stores plain-text API keys in provider config serialization", () => {
      const dirtyConfig = {
        provider: "claude",
        model: "claude-3-5-sonnet-20241022",
        apiKey: "sk-ant-secret-test-key-should-never-leak",
        temperature: 0.7,
      };

      const restored: any = restoreProviderConfig(dirtyConfig);
      expect(restored.apiKey).toBeUndefined();
      expect(restored.credentialConfigured).toBe(false);
      expect(JSON.stringify(restored)).not.toContain("sk-ant-secret-test-key-should-never-leak");
    });

    it("sanitizes file uploads and rejects path traversal attacks", () => {
      const maliciousFile = {
        name: "../../etc/shadow",
        size: 1024,
        type: "text/plain",
      };
      const result = validateMediaAsset(maliciousFile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Unsafe path detected");
    });

    it("enforces media size limits strictly across asset types", () => {
      // 30MB image should fail (limit 25MB)
      const oversizedImage = {
        name: "hero_banner.png",
        size: 30 * 1024 * 1024,
        type: "image/png",
      };
      expect(validateMediaAsset(oversizedImage).valid).toBe(false);

      // 10MB image should pass
      const validImage = {
        name: "hero_banner.png",
        size: 10 * 1024 * 1024,
        type: "image/png",
      };
      expect(validateMediaAsset(validImage).valid).toBe(true);

      // 300MB video should fail (limit 250MB)
      const oversizedVideo = {
        name: "clip.mp4",
        size: 300 * 1024 * 1024,
        type: "video/mp4",
      };
      expect(validateMediaAsset(oversizedVideo).valid).toBe(false);
    });
  });

  describe("2. Real AI Provider Acceptance & Granular Error Handling", () => {
    it("classifies provider error statuses accurately without exposing keys", () => {
      expect(classifyProviderErrorStatus("API key not valid. Please pass a valid API key.")).toBe("invalid_key");
      expect(classifyProviderErrorStatus("HTTP 401: Unauthorized")).toBe("invalid_key");
      expect(classifyProviderErrorStatus("HTTP 429: Rate limit exceeded / Quota exhausted")).toBe("quota_exceeded");
      expect(classifyProviderErrorStatus("Network timeout while contacting endpoint")).toBe("error");
    });

    it("handles Claude provider when unconfigured gracefully", async () => {
      const claude = new ClaudeProviderAdapter();
      const status = await claude.testConnection(false);
      expect(status.connected).toBe(false);
      expect(status.status).toBe("disconnected");
      expect(status.message).toContain("Save a Claude API key");
    });

    it("handles ElevenLabs connection when unconfigured", async () => {
      const res = await testElevenLabsConnection("");
      expect(res.connected).toBe(false);
      expect(res.status).toBe("disconnected");
    });
  });

  describe("3. Real AI Avatar Acceptance & Honesty Verification", () => {
    it("reports NOT VERIFIED when neural checkpoints or CUDA are absent", () => {
      const result = verifyNeuralAvatarAvailability({ liveportrait: false, sadtalker: false });
      expect(result.status).toBe("NOT VERIFIED");
      expect(result.fallbackActive).toBe(true);
      expect(result.reason).toContain("Heuristic 2D viseme fallback active");
    });

    it("enforces face consent onboarding before any avatar video synthesis", async () => {
      const unconsentedRecord: FaceConsentOnboarding = {
        id: "consent_999",
        userId: "user_a",
        ownerName: "Umar Hayat",
        sourcePhotoUrl: "https://example.com/photo.jpg",
        consentDeclarationSigned: false, // NOT signed!
        voiceCloneConsent: false,
        legalEntity: "LODHI TECHX",
        verificationTimestamp: new Date().toISOString(),
      };

      const req: AvatarInferenceRequest = {
        jobId: "job_unconsented",
        tenantId: "tenant_alpha",
        avatarProfileId: "prof_01",
        portraitUrl: "https://example.com/photo.jpg",
        scriptText: "Welcome to NovaVid AI Studio.",
        language: "Urdu",
        provider: "novavid_neural",
        consentRecord: unconsentedRecord,
      };

      await expect(executeAvatarInference(req)).rejects.toThrow("Consent Validation Failed");
    });

    it("truthfully identifies offline heuristic rig when running synthetic fallback", async () => {
      const validConsent: FaceConsentOnboarding = {
        id: "consent_valid",
        userId: "user_owner",
        ownerName: "Umar Hayat",
        sourcePhotoUrl: "https://example.com/owner.jpg",
        consentDeclarationSigned: true,
        voiceCloneConsent: true,
        legalEntity: "LODHI TECHX",
        verificationTimestamp: new Date().toISOString(),
      };

      const req: AvatarInferenceRequest = {
        jobId: "job_offline_01",
        tenantId: "tenant_owner",
        avatarProfileId: "prof_owner",
        portraitUrl: "https://example.com/owner.jpg",
        scriptText: "Taleemi Duniya Pro Software Overview",
        language: "Bilingual",
        provider: "novavid_neural",
        consentRecord: validConsent,
      };

      const res = await executeAvatarInference(req);
      expect(res.status).toBe("completed");
      expect(res.providerUsed).toBe("novavid_neural");
      // Logs must clearly disclose 2D synthetic viseme fallback
      const hasHeuristicMention = res.inferenceLogs.some((l) =>
        l.includes("2D Synthetic Viseme Rig (Offline Heuristic Fallback)")
      );
      expect(hasHeuristicMention).toBe(true);
    });
  });

  describe("4. End-to-End Creator Workflow (Save, Reload & QC)", () => {
    it("creates, populates, exports, deletes and restores project without data corruption", async () => {
      // 1. Create project
      const created = await createProject({
        name: "Phase E Creator Masterpiece",
        topic: "Artificial Intelligence in Modern Filmmaking",
        language: "English",
      });
      expect(created.id).toBeDefined();

      // 2. Fetch project
      const fetched = await getProject(created.id);
      expect(fetched?.name).toBe("Phase E Creator Masterpiece");

      // 3. Update project
      await updateProject(created.id, {
        name: "Phase E Creator Masterpiece (Final Cut)",
        topic: "Artificial Intelligence in Modern Filmmaking",
        language: "English",
      });
      const updated = await getProject(created.id);
      expect(updated?.name).toBe("Phase E Creator Masterpiece (Final Cut)");

      // 4. Export archive
      const archive = await exportProjectArchive(created.id);
      expect(archive.project.id).toBe(created.id);
      expect(archive.version).toBe("2.0");

      // 5. Delete project
      await deleteProject(created.id);
      const afterDelete = await getProject(created.id);
      expect(afterDelete).toBeNull();

      // 6. Import archive back
      const imported = await importProjectArchive(archive);
      expect(imported.name).toContain("Phase E Creator Masterpiece (Final Cut)");

      // Clean up
      await deleteProject(imported.id);
    });

    it("verifies QC analysis on standard compliant stream output", () => {
      const qc = inspectVideoQuality({
        projectId: "proj_qc_phase_e",
        videoPath: "dist/test_renders/novavid_phase_d_master_acceptance.mp4",
        durationSeconds: 4.0,
        width: 1920,
        height: 1080,
        fps: 30,
        videoCodec: "h264",
        audioCodec: "aac",
        audioSampleRate: 44100,
        audioBitrateKbps: 192,
        hasBlackFrames: false,
        hasAudioClipping: false,
        hasProlongedSilence: false,
        subtitlesCount: 4,
        thumbnailFilePath: "thumb.jpg",
        thumbnailWidth: 1280,
        thumbnailHeight: 720,
        thumbnailSizeKb: 150,
        title: "Phase E Creator Masterpiece",
        description: "Comprehensive AI production workflow that exceeds fifty characters of rich SEO description.",
        tagsCount: 5,
      });

      expect(qc.overallStatus).toBe("PASS");
      expect(qc.scorePercent).toBe(100);
      expect(qc.failedCount).toBe(0);
    });
  });
});

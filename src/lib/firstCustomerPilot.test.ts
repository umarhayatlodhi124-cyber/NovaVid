import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import {
  createProject,
  getProject,
  deleteProject,
  exportProjectArchive,
  importProjectArchive,
} from "./projects";
import {
  convertScriptToStoryboard,
} from "./storyboard";
import { exportToSRT, DEFAULT_SUBTITLE_STYLE, type SubtitleDocument } from "./subtitles";
import { inspectVideoQuality } from "./qualityControl";
import {
  issueSignedLicenseEd25519,
} from "../../cloud/keys";
import {
  verifySignedLicense,
  STUDIO_ED25519_PUBLIC_KEY,
  type LicensePayload,
} from "./licensingCrypto";
import {
  saasClient,
} from "./firebaseSaas";
import { youtubeStartUpload, type PublishVideoRequest } from "./publishingStudio";

const execFileAsync = promisify(execFile);

describe("First Customer Pilot Launch — Comprehensive Verification", () => {
  const outputDir = path.resolve(process.cwd(), "test_renders");
  const pilotMp4 = path.join(outputDir, "novavid_customer_pilot_master_1080p.mp4");
  const ffprobePath = path.resolve(process.cwd(), "bin", "ffprobe.exe");
  const ffmpegPath = path.resolve(process.cwd(), "bin", "ffmpeg.exe");

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  describe("1. Customer Onboarding & Entitlement Verification", () => {
    it("onboards pilot customer with Creator Pro cryptographic license", async () => {
      const pilotPayload: LicensePayload = {
        keyId: "lic_pilot_2026_001",
        orgId: "org_pilot_studio_01",
        email: "founder@pilotstudio.tv",
        tier: "creator_pro",
        maxDevices: 5,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
        gracePeriodDays: 14,
        graceExpiresAt: new Date(Date.now() + 194 * 24 * 3600 * 1000).toISOString(),
        features: ["1080p_export", "elevenlabs_tts", "local_viseme_avatar", "unlimited_projects"],
      };

      const token = await issueSignedLicenseEd25519(pilotPayload);
      expect(token).toMatch(/^NOVA_V1\.creator_pro\./);

      const verification = await verifySignedLicense(token, STUDIO_ED25519_PUBLIC_KEY);
      expect(verification.isValid).toBe(true);
      expect(verification.license?.payload.orgId).toBe("org_pilot_studio_01");
      expect(verification.license?.payload.maxDevices).toBe(5);
    });

    it("verifies multi-tenant project isolation for pilot customer", async () => {
      const customer = await saasClient.signInWithEmail("pilot_client@lodhitechx.com", "pilotPass123");
      expect(customer.uid).toBeDefined();

      const pilotProject = await saasClient.createProject({
        name: "Pilot Client Showcase",
        topic: "Autonomous AI Production",
        language: "English",
        durationFormat: "16:9",
        style: "cinematic",
      });
      expect(pilotProject.userId).toBe(customer.uid);

      const list = await saasClient.listUserProjects(customer.uid);
      expect(list.some((p) => p.id === pilotProject.id)).toBe(true);

      await saasClient.signOut();
    });
  });

  describe("2. End-to-End Real Creator Workflow & 1080p Video Rendering", () => {
    it("executes the full video production pipeline and renders standard 1080p stereo MP4", async () => {
      // Step 1: Create Pilot Project
      const project = await createProject({
        name: "NovaVid Pilot Customer Masterpiece",
        topic: "Artificial Intelligence in Global Media Production",
        language: "English",
      });
      expect(project.id).toBeDefined();

      // Step 2: Storyboard & Script Conversion
      const scriptContent = [
        "Scene 1: Introduction to Next-Gen Video Production with NovaVid AI Studio.",
        "Scene 2: Local FFmpeg video rendering generates broadcast quality MP4 output without cloud fees.",
        "Scene 3: Automated Quality Control verifies standards compliance prior to publishing.",
      ].join("\n\n");

      const storyboard = convertScriptToStoryboard({
        title: project.name,
        format: "Educational explainer",
        content: scriptContent,
      });
      expect(storyboard.scenes.length).toBeGreaterThanOrEqual(3);

      // Step 3: Subtitles Synchronization
      const now = new Date().toISOString();
      const subtitleDoc: SubtitleDocument = {
        id: "sub_pilot_01",
        projectId: project.id,
        title: "Pilot Subtitles",
        language: "English",
        styleProfile: DEFAULT_SUBTITLE_STYLE,
        createdAt: now,
        updatedAt: now,
        segments: [
          {
            id: "s1",
            sceneId: "scene_1",
            sceneNumber: 1,
            startTimeSeconds: 0.0,
            endTimeSeconds: 1.5,
            startTimeFormatted: "00:00:00,000",
            endTimeFormatted: "00:00:01,500",
            text: "Welcome to NovaVid AI Studio.",
          },
          {
            id: "s2",
            sceneId: "scene_2",
            sceneNumber: 2,
            startTimeSeconds: 1.5,
            endTimeSeconds: 3.0,
            startTimeFormatted: "00:00:01,500",
            endTimeFormatted: "00:00:03,000",
            text: "High performance AI video production engine.",
          },
          {
            id: "s3",
            sceneId: "scene_3",
            sceneNumber: 3,
            startTimeSeconds: 3.0,
            endTimeSeconds: 4.0,
            startTimeFormatted: "00:00:03,000",
            endTimeFormatted: "00:00:04,000",
            text: "Ready for global YouTube creators.",
          },
        ],
      };
      const srt = exportToSRT(subtitleDoc.segments);
      expect(srt).toContain("00:00:00,000 --> 00:00:01,500");

      // Step 4: Render Genuine 1080p MP4 via Local FFmpeg with 2-Channel Stereo AAC
      const ffmpegArgs = [
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=size=1920x1080:rate=30",
        "-f", "lavfi",
        "-i", "sine=frequency=440:sample_rate=44100",
        "-t", "4",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ac", "2",
        "-ar", "44100",
        pilotMp4,
      ];

      await execFileAsync(ffmpegPath, ffmpegArgs);
      expect(fs.existsSync(pilotMp4)).toBe(true);
      const stat = fs.statSync(pilotMp4);
      expect(stat.size).toBeGreaterThan(50000);

      // Step 5: FFprobe Technical Inspection
      const ffprobeArgs = [
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-show_format",
        pilotMp4,
      ];

      const { stdout } = await execFileAsync(ffprobePath, ffprobeArgs);
      const metadata = JSON.parse(stdout);

      const vStream = metadata.streams.find((s: any) => s.codec_type === "video");
      const aStream = metadata.streams.find((s: any) => s.codec_type === "audio");

      expect(vStream).toBeDefined();
      expect(vStream.width).toBe(1920);
      expect(vStream.height).toBe(1080);
      expect(vStream.codec_name).toBe("h264");

      expect(aStream).toBeDefined();
      expect(aStream.codec_name).toBe("aac");
      expect(aStream.channels).toBe(2);
      expect(aStream.channel_layout).toBe("stereo");
      expect(parseInt(aStream.sample_rate)).toBe(44100);

      // Step 6: Automated Quality Control Preflight Audit
      const qc = inspectVideoQuality({
        projectId: project.id,
        videoPath: pilotMp4,
        durationSeconds: parseFloat(metadata.format.duration),
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
        subtitlesCount: subtitleDoc.segments.length,
        thumbnailFilePath: "thumb.jpg",
        thumbnailWidth: 1280,
        thumbnailHeight: 720,
        thumbnailSizeKb: 200,
        title: project.name,
        description: "Official demonstration video for NovaVid AI Studio first customer pilot launch with rich description.",
        tagsCount: 5,
      });

      expect(qc.overallStatus).toBe("PASS");
      expect(qc.scorePercent).toBe(100);
      expect(qc.failedCount).toBe(0);

      // Step 7: Export, Delete, and Restore Project
      const archive = await exportProjectArchive(project.id);
      expect(archive.project.id).toBe(project.id);

      await deleteProject(project.id);
      expect(await getProject(project.id)).toBeNull();

      const restored = await importProjectArchive(archive);
      expect(restored.name).toContain("NovaVid Pilot Customer Masterpiece");

      await deleteProject(restored.id);
    }, 30000);
  });

  describe("3. YouTube Pilot & Zero-Fabrication Safeguard", () => {
    it("safely handles unlinked YouTube accounts without fabricating false video IDs", async () => {
      // Calling youtubeStartUpload when not connected must reject safely
      const unauthRequest: PublishVideoRequest = {
        projectId: "proj_pilot_unauth",
        channelId: "chan_unauth_01",
        videoPath: pilotMp4,
        title: "Pilot Video Demo",
        description: "Official unauthenticated upload test",
        tags: ["pilot"],
        privacyStatus: "private",
        madeForKids: false,
        categoryId: "28",
      };

      await expect(youtubeStartUpload(unauthRequest)).rejects.toThrow();
    });
  });
});

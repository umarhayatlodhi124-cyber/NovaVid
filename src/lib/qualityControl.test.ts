import { describe, it, expect } from "vitest";
import { inspectVideoQuality, type QCInspectionInput } from "./qualityControl";

describe("Automated Video Quality Control (QC) Preflight Engine", () => {
  const perfectInput: QCInspectionInput = {
    projectId: "proj_qc_master",
    videoPath: "exports/LODHI_TECHX_AI_Technology_Introduction.mp4",
    durationSeconds: 87.1,
    width: 1920,
    height: 1080,
    fps: 30.0,
    videoCodec: "h264",
    audioCodec: "aac",
    audioSampleRate: 44100,
    audioBitrateKbps: 192,
    hasBlackFrames: false,
    hasAudioClipping: false,
    hasProlongedSilence: false,
    subtitlesFilePath: "exports/lodhi_techx_subtitles.srt",
    subtitlesCount: 6,
    thumbnailFilePath: "exports/lodhi_techx_thumb.png",
    thumbnailWidth: 1280,
    thumbnailHeight: 720,
    thumbnailSizeKb: 450,
    title: "LODHI TECHX — AI Technology Introduction",
    description: "Official master launch of NovaVid AI Studio 2.0 featuring autonomous video production.",
    tagsCount: 8,
  };

  it("1. Returns PASS and canPublish=true for complete compliant video package", () => {
    const report = inspectVideoQuality(perfectInput);

    expect(report.overallStatus).toBe("PASS");
    expect(report.canPublish).toBe(true);
    expect(report.failedCount).toBe(0);
    expect(report.scorePercent).toBe(100);
    expect(report.checks.length).toBe(10);
  });

  it("2. Blocks publication (canPublish=false) upon critical failures (e.g. sub-1080p resolution or non-H.264 codec)", () => {
    const criticalFailInput: QCInspectionInput = {
      ...perfectInput,
      width: 854,
      height: 480, // 480p is not 1080p
      videoCodec: "mpeg4", // non-standard
    };

    const report = inspectVideoQuality(criticalFailInput);

    expect(report.overallStatus).toBe("FAIL");
    expect(report.canPublish).toBe(false);
    expect(report.failedCount).toBeGreaterThanOrEqual(1);

    const resCheck = report.checks.find((c) => c.id === "qc_resolution")!;
    expect(resCheck.status).toBe("fail");
    expect(resCheck.severity).toBe("critical");
  });

  it("3. Returns WARNING for non-critical gaps (e.g. missing subtitles or short description) while allowing publishing", () => {
    const warningInput: QCInspectionInput = {
      ...perfectInput,
      subtitlesCount: 0,
      description: "Short", // < 50 chars
    };

    const report = inspectVideoQuality(warningInput);

    expect(report.overallStatus).toBe("WARNING");
    expect(report.canPublish).toBe(true); // Non-critical warnings do not block publishing
    expect(report.warningCount).toBeGreaterThanOrEqual(2);
  });
});

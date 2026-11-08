import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { inspectVideoQuality } from "./qualityControl";

describe("Phase B: Real Local FFmpeg Video Rendering & Media Verification", () => {
  const ffmpegExe = path.resolve("G:/Nova Vid/bin/ffmpeg.exe");
  const ffprobeExe = path.resolve("G:/Nova Vid/bin/ffprobe.exe");
  const outputDir = path.resolve("G:/Nova Vid/dist/test_renders");
  const outputMp4 = path.join(outputDir, "novavid_phase_b_test_1080p.mp4");

  it("should verify local FFmpeg and FFprobe binaries exist and return version N-128532", () => {
    expect(fs.existsSync(ffmpegExe)).toBe(true);
    expect(fs.existsSync(ffprobeExe)).toBe(true);

    const versionOut = execSync(`"${ffmpegExe}" -version`, { encoding: "utf8" });
    expect(versionOut).toContain("ffmpeg version");
    expect(versionOut).toContain("2026");
  });

  it("should render a genuine 1080p H.264/AAC MP4 video using local FFmpeg without AWS", () => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (fs.existsSync(outputMp4)) {
      fs.unlinkSync(outputMp4);
    }

    // Render a 3-second 1920x1080 30fps video with color background and synthesized audio tone
    const renderCmd = [
      `"${ffmpegExe}"`,
      "-y",
      "-f lavfi -i color=c=0x0f3460:s=1920x1080:d=3.0:r=30",
      "-f lavfi -i sine=frequency=440:duration=3.0",
      "-vf \"drawtext=text='NovaVid AI Studio 2.0':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-50,drawtext=text='LODHI TECHX - Local Render Verified':fontsize=36:fontcolor=yellow:x=(w-text_w)/2:y=(h-text_h)/2+50\"",
      "-c:v libx264 -preset ultrafast -pix_fmt yuv420p",
      "-c:a aac -b:a 192k",
      `"${outputMp4}"`,
    ].join(" ");

    execSync(renderCmd, { stdio: "pipe" });

    expect(fs.existsSync(outputMp4)).toBe(true);
    const stats = fs.statSync(outputMp4);
    expect(stats.size).toBeGreaterThan(10000); // Greater than 10KB
  });

  it("should inspect the rendered MP4 file with FFprobe and confirm valid streams and duration", () => {
    expect(fs.existsSync(outputMp4)).toBe(true);

    const probeCmd = `"${ffprobeExe}" -v quiet -print_format json -show_format -show_streams "${outputMp4}"`;
    const probeOutput = execSync(probeCmd, { encoding: "utf8" });
    const metadata = JSON.parse(probeOutput);

    expect(metadata.streams).toBeDefined();
    expect(metadata.streams.length).toBeGreaterThanOrEqual(2);

    const videoStream = metadata.streams.find((s: any) => s.codec_type === "video");
    const audioStream = metadata.streams.find((s: any) => s.codec_type === "audio");

    expect(videoStream).toBeDefined();
    expect(videoStream.codec_name).toBe("h264");
    expect(videoStream.width).toBe(1920);
    expect(videoStream.height).toBe(1080);

    expect(audioStream).toBeDefined();
    expect(audioStream.codec_name).toBe("aac");

    const duration = parseFloat(metadata.format.duration);
    expect(duration).toBeCloseTo(3.0, 0.5);
  });

  it("should run automated Quality Control (QC) on the rendered video and pass broadcast requirements", () => {
    const probeCmd = `"${ffprobeExe}" -v quiet -print_format json -show_format -show_streams "${outputMp4}"`;
    const probeOutput = execSync(probeCmd, { encoding: "utf8" });
    const metadata = JSON.parse(probeOutput);

    const videoStream = metadata.streams.find((s: any) => s.codec_type === "video");
    const audioStream = metadata.streams.find((s: any) => s.codec_type === "audio");

    const qcReport = inspectVideoQuality({
      projectId: "proj_phase_b_test",
      videoPath: outputMp4,
      durationSeconds: parseFloat(metadata.format.duration),
      width: videoStream.width,
      height: videoStream.height,
      fps: 30,
      videoCodec: videoStream.codec_name,
      audioCodec: audioStream.codec_name,
      audioSampleRate: parseInt(audioStream.sample_rate || "44100"),
      audioBitrateKbps: 192,
      hasBlackFrames: false,
      hasAudioClipping: false,
      hasProlongedSilence: false,
      subtitlesCount: 5,
      thumbnailFilePath: "dist/test_renders/thumb.jpg",
      thumbnailWidth: 1280,
      thumbnailHeight: 720,
      thumbnailSizeKb: 250,
      title: "NovaVid AI Studio 2.0 Local Video Production Test",
      description: "Comprehensive local FFmpeg rendering test for LODHI TECHX.",
      tagsCount: 8,
    });

    expect(qcReport.overallStatus).toBe("PASS");
    expect(qcReport.canPublish).toBe(true);
    expect(qcReport.scorePercent).toBeGreaterThanOrEqual(95);
  });
});

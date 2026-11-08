import { describe, it, expect } from "vitest";
import { getFFmpegSetupInfo } from "./ffmpegSetup";

describe("Stage Q1 — FFmpeg Setup & Distribution Unit Tests", () => {
  it("provides safe fallback setup info when IPC is not connected", async () => {
    const info = await getFFmpegSetupInfo();
    expect(info).toBeDefined();
    expect(info.manifest.license).toContain("GPL");
    expect(info.manifest.primaryUrl).toMatch(/^https:\/\//);
    expect(info.manifest.trustedHosts).toContain("www.gyan.dev");
    expect(info.managedBinDir).toContain("ffmpeg");
  });

  it("manifest specifies trusted mirror URLs with HTTPS", async () => {
    const info = await getFFmpegSetupInfo();
    expect(info.manifest.primaryUrl.startsWith("https://")).toBe(true);
    expect(info.manifest.mirrorUrl.startsWith("https://")).toBe(true);
    expect(info.manifest.expectedArchiveFormat).toBe("zip");
  });

  it("checks disk space requirement defaults", async () => {
    const info = await getFFmpegSetupInfo();
    expect(info.availableDiskSpaceMb).toBeGreaterThanOrEqual(1024);
  });
});

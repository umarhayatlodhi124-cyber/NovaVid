import { describe, expect, it } from "vitest";
import {
  DEFAULT_DUCKING_CONFIG,
  formatDuration,
  formatFileSize,
  audioGetLibraryTracks,
} from "./audioStudio";

describe("Stage E — Audio Studio Unit Tests", () => {
  it("DEFAULT_DUCKING_CONFIG has YouTube broadcast compliant -14 LUFS and standard sidechain attenuation", () => {
    expect(DEFAULT_DUCKING_CONFIG.enabled).toBe(true);
    expect(DEFAULT_DUCKING_CONFIG.targetLufs).toBe(-14.0);
    expect(DEFAULT_DUCKING_CONFIG.duckingAmountDb).toBe(-14.0);
    expect(DEFAULT_DUCKING_CONFIG.musicVolume).toBe(0.25);
    expect(DEFAULT_DUCKING_CONFIG.voiceVolume).toBe(1.0);
    expect(DEFAULT_DUCKING_CONFIG.attackMs).toBe(100);
    expect(DEFAULT_DUCKING_CONFIG.releaseMs).toBe(400);
  });

  it("formatDuration formats seconds to MM:SS string correctly", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(45)).toBe("0:45");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(120)).toBe("2:00");
    expect(formatDuration(367)).toBe("6:07");
  });

  it("formatFileSize formats bytes into B, KB, and MB correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1024 * 50)).toBe("50.0 KB");
    expect(formatFileSize(1024 * 1024 * 5.25)).toBe("5.25 MB");
  });

  it("audioGetLibraryTracks provides royalty-free default tracks when offline", async () => {
    const tracks = await audioGetLibraryTracks();
    expect(tracks.length).toBeGreaterThanOrEqual(5);

    const cinematic = tracks.find((t) => t.category === "Cinematic");
    expect(cinematic).toBeDefined();
    expect(cinematic?.trackType).toBe("music");
    expect(cinematic?.commercialUse).toBe(true);
    expect(cinematic?.format).toBe("wav");

    const sfxImpact = tracks.find((t) => t.category === "Impacts");
    expect(sfxImpact).toBeDefined();
    expect(sfxImpact?.trackType).toBe("sfx");
  });
});

import { describe, expect, it } from "vitest";
import { validateMediaAsset } from "./media";

describe("media validation", () => {
  it("accepts supported media types and rejects unsafe or oversized imports", () => {
    expect(validateMediaAsset({ name: "shot.png", size: 250000, type: "image/png" }).valid).toBe(true);
    expect(validateMediaAsset({ name: "clip.mp4", size: 1500000, type: "video/mp4" }).valid).toBe(true);
    expect(validateMediaAsset({ name: "script.exe", size: 1000, type: "application/x-msdownload" }).valid).toBe(false);
    expect(validateMediaAsset({ name: "large.mov", size: 120 * 1024 * 1024, type: "video/quicktime" }).valid).toBe(false);
  });
});

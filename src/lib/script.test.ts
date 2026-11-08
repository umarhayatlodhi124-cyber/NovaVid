import { describe, expect, it } from "vitest";
import {
  createScriptVersion,
  restoreScriptVersion,
  regenerateScriptParagraph,
  type ScriptDocument,
} from "./scripts";

describe("script versioning & paragraph regeneration", () => {
  it("creates, stores, and restores versions", () => {
    const initial: ScriptDocument = {
      id: "script-1",
      title: "AI creator tools",
      language: "English",
      format: "Long-form",
      content: "Intro paragraph.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
      currentVersionId: "v1",
    };

    const versioned = createScriptVersion(initial, "A stronger intro and clearer CTA.");
    expect(versioned.versions.length).toBe(1);
    expect(versioned.content).toContain("A stronger intro");

    const restored = restoreScriptVersion(versioned, versioned.versions[0].id);
    expect(restored.content).toContain("A stronger intro");
  });

  it("regenerates a specific paragraph while preserving the rest of the script", () => {
    const initial: ScriptDocument = {
      id: "script-2",
      title: "Urdu Tech Tutorial",
      language: "Urdu",
      format: "YouTube Shorts",
      content: "First paragraph hook.\n\nOld middle paragraph.\n\nFinal CTA.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
      currentVersionId: "v1",
    };

    const updated = regenerateScriptParagraph(initial, 1, "New powerful middle paragraph explaining AI video rendering.");
    expect(updated.content).toContain("First paragraph hook.");
    expect(updated.content).toContain("New powerful middle paragraph explaining AI video rendering.");
    expect(updated.content).toContain("Final CTA.");
    expect(updated.content).not.toContain("Old middle paragraph.");
    expect(updated.versions.length).toBe(1);
  });
});

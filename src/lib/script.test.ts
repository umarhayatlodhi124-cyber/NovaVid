import { describe, expect, it } from "vitest";
import {
  createScriptVersion,
  restoreScriptVersion,
  type ScriptDocument,
} from "./scripts";

describe("script versioning", () => {
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
});

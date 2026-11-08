import { describe, expect, it } from "vitest";
import {
  createStoryboardDocument,
  createStoryboardVersion,
  createVisualStyleProfile,
  duplicateScene,
  mergeScenes,
  reorderScenes,
  restoreStoryboardVersion,
  splitScene,
  convertScriptToStoryboard,
} from "./storyboard";
import { createScriptDocument } from "./scripts";

describe("storyboard engine", () => {
  it("converts approved script content into editable scenes", () => {
    const script = createScriptDocument({
      title: "AI Tools for Creators",
      language: "English",
      format: "Long-form",
      content: [
        "Title: AI Tools for Creators",
        "",
        "Hook: AI tools can remove busywork from your content workflow.",
        "",
        "Main content:",
        "Creators need simple systems to stay consistent.",
        "",
        "Conclusion:",
        "Small changes in workflow create big gains over time.",
      ].join("\n"),
    });

    const storyboard = convertScriptToStoryboard(script);
    expect(storyboard.scenes.length).toBeGreaterThanOrEqual(2);
    expect(storyboard.scenes[0].narration).toContain("AI tools");
    expect(storyboard.scenes[0].visualPrompt.length).toBeGreaterThan(10);
  });

  it("supports splitting and merging scenes without losing narration", () => {
    const storyboard = createStoryboardDocument({
      title: "Split test",
      format: "Long-form",
      scenes: [
        {
          id: "scene-1",
          number: 1,
          title: "Intro",
          narration: "This is a long intro paragraph that should split into two scenes.",
          duration: 12,
          visualDescription: "Intro visual",
          visualPrompt: "Open with a creator desk still frame",
          cameraMotion: "Wide shot",
          transition: "Cut",
          audioSuggestion: "Bubbly synth intro",
          assetId: null,
          status: "pending",
        },
        {
          id: "scene-2",
          number: 2,
          title: "Body",
          narration: "The second scene explains the process.",
          duration: 10,
          visualDescription: "Process graphic",
          visualPrompt: "A workflow diagram",
          cameraMotion: "Push-in",
          transition: "Match cut",
          audioSuggestion: "Soft beat",
          assetId: null,
          status: "pending",
        },
      ],
    });

    const split = splitScene(storyboard, "scene-1");
    expect(split.scenes.length).toBe(3);

    const merged = mergeScenes(split, split.scenes[0].id, split.scenes[1].id);
    expect(merged.scenes.length).toBe(2);
    expect(merged.scenes[0].narration).toContain("This is a long intro paragraph");
  });

  it("supports ordering, duplication and version restore", () => {
    const storyboard = createStoryboardDocument({
      title: "Version test",
      format: "Shorts",
      scenes: [
        {
          id: "scene-1",
          number: 1,
          title: "A",
          narration: "First",
          duration: 5,
          visualDescription: "Scene A",
          visualPrompt: "Prompt A",
          cameraMotion: "Static",
          transition: "Cut",
          audioSuggestion: "Beat",
          assetId: null,
          status: "pending",
        },
        {
          id: "scene-2",
          number: 2,
          title: "B",
          narration: "Second",
          duration: 6,
          visualDescription: "Scene B",
          visualPrompt: "Prompt B",
          cameraMotion: "Push-in",
          transition: "Whip pan",
          audioSuggestion: "Rhythm",
          assetId: null,
          status: "pending",
        },
      ],
    });

    const reordered = reorderScenes(storyboard, "scene-2", "scene-1");
    expect(reordered.scenes[0].id).toBe("scene-2");

    const duplicated = duplicateScene(reordered, "scene-1");
    expect(duplicated.scenes.some((scene) => scene.title === "B")).toBe(true);

    const versioned = createStoryboardVersion(reordered, "Before restore");
    const restored = restoreStoryboardVersion(versioned, versioned.versions[0].id);
    expect(restored.scenes.length).toBeGreaterThan(0);
  });

  it("persists visual style profiles", () => {
    const profile = createVisualStyleProfile({
      name: "Creator look",
      artStyle: "cinematic",
      colorPalette: ["deep blue", "warm amber"],
      lighting: "soft daylight",
      environmentDescription: "Clean creator workspace",
      consistencyInstructions: "Keep warm tones and simple textures.",
    });

    expect(profile.artStyle).toBe("cinematic");
    expect(profile.colorPalette).toHaveLength(2);
  });
});

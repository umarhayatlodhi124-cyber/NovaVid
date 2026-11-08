export type SceneStatus = "pending" | "generated" | "imported" | "approved";

export interface StoryboardScene {
  id: string;
  number: number;
  title: string;
  narration: string;
  duration: number;
  visualDescription: string;
  visualPrompt: string;
  cameraMotion: string;
  transition: string;
  audioSuggestion: string;
  assetId: string | null;
  status: SceneStatus;
}

export interface StoryboardVersion {
  id: string;
  label: string;
  createdAt: string;
  scenes: StoryboardScene[];
}

export interface StoryboardDocument {
  id: string;
  title: string;
  format: "YouTube Shorts" | "Shorts" | "Long-form" | "Educational explainer";
  scenes: StoryboardScene[];
  versions: StoryboardVersion[];
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
  styleProfileId: string | null;
}

export interface VisualStyleProfile {
  id: string;
  name: string;
  artStyle: string;
  colorPalette: string[];
  lighting: string;
  characterDescription: string;
  environmentDescription: string;
  consistencyInstructions: string;
  locked: boolean;
  updatedAt: string;
}

export function createVisualStyleProfile(input: Partial<VisualStyleProfile> & {
  name?: string;
  artStyle?: string;
  colorPalette?: string[];
  lighting?: string;
  environmentDescription?: string;
  consistencyInstructions?: string;
}): VisualStyleProfile {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: input.name ?? "Default style",
    artStyle: input.artStyle ?? "cinematic",
    colorPalette: input.colorPalette && input.colorPalette.length > 0 ? input.colorPalette : ["deep blue", "warm amber"],
    lighting: input.lighting ?? "soft daylight",
    characterDescription: input.characterDescription ?? "Clean, relatable creator-focused figures",
    environmentDescription: input.environmentDescription ?? "Minimal studio or creator workspace with practical props",
    consistencyInstructions: input.consistencyInstructions ?? "Keep a consistent mood, color balance, and camera framing across scenes.",
    locked: input.locked ?? true,
    updatedAt: timestamp,
  };
}

function generateSceneFromNarration(narration: string, number: number): StoryboardScene {
  const trimmed = narration.trim().replace(/^AI\s+([A-Z])/, "AI $1").replace(/^([A-Z]{2,})\s+([A-Z])/, (_, first: string, next: string) => `${first} ${next.toLowerCase()}`);
  const title = trimmed.length > 40 ? `${trimmed.slice(0, 35).trim()}…` : trimmed || `Scene ${number}`;
  const duration = Math.max(5, Math.ceil((trimmed.length / 28) * 1.4));

  return {
    id: crypto.randomUUID(),
    number,
    title,
    narration: trimmed,
    duration,
    visualDescription: `A clean, engaging visual that supports the narration in scene ${number}.`,
    visualPrompt: `Create a polished scene showing ${trimmed.slice(0, 80).trim()} in a cinematic, creator-friendly frame.`,
    cameraMotion: "Wide shot with subtle push-in",
    transition: number % 2 === 0 ? "Match cut" : "Cut",
    audioSuggestion: "Light cinematic ambience with a confident rhythm",
    assetId: null,
    status: "pending",
  };
}

export function createStoryboardDocument(input: {
  title: string;
  format: StoryboardDocument["format"];
  scenes?: StoryboardScene[];
}): StoryboardDocument {
  const timestamp = new Date().toISOString();
  const sceneList: StoryboardScene[] = (input.scenes ?? []).map((scene, index) => ({
    ...scene,
    number: index + 1,
    status: scene.status ?? "pending",
  }));

  const initialVersion: StoryboardVersion = {
    id: `version-${crypto.randomUUID()}`,
    label: "Initial storyboard",
    createdAt: timestamp,
    scenes: sceneList,
  };

  return {
    id: crypto.randomUUID(),
    title: input.title.trim() || "Untitled storyboard",
    format: input.format,
    scenes: sceneList,
    versions: [initialVersion],
    currentVersionId: initialVersion.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    styleProfileId: null,
  };
}

export function createStoryboardVersion(document: StoryboardDocument, label: string): StoryboardDocument {
  const timestamp = new Date().toISOString();
  const version: StoryboardVersion = {
    id: `version-${crypto.randomUUID()}`,
    label: label.trim() || `Revision ${document.versions.length + 1}`,
    createdAt: timestamp,
    scenes: document.scenes.map((scene) => ({ ...scene })),
  };

  return {
    ...document,
    updatedAt: timestamp,
    currentVersionId: version.id,
    versions: [version, ...document.versions],
  };
}

export function restoreStoryboardVersion(document: StoryboardDocument, versionId: string): StoryboardDocument {
  const version = document.versions.find((item) => item.id === versionId);
  if (!version) {
    return document;
  }

  return {
    ...document,
    scenes: version.scenes.map((scene, index) => ({ ...scene, number: index + 1 })),
    updatedAt: new Date().toISOString(),
    currentVersionId: version.id,
  };
}

export function convertScriptToStoryboard(script: {
  title: string;
  format?: StoryboardDocument["format"];
  content: string;
}): StoryboardDocument {
  const contentBlocks = script.content
    .split(/\n{2,}/)
    .map((block) => block.replace(/^(Title:|Hook:|Introduction:|Main content:|Conclusion:|Transition:|Call to action:)/gm, "").trim())
    .filter((block) => block.length > 0);

  const scenes: StoryboardScene[] = (contentBlocks.length > 0 ? contentBlocks : [script.content]).map((narration, index) => {
    const scene = generateSceneFromNarration(narration, index + 1);
    return {
      id: scene.id,
      number: scene.number,
      title: scene.title || `Scene ${index + 1}`,
      narration: scene.narration,
      duration: narration.length > 120 ? 14 : 8,
      visualDescription: `Visualize ${narration.slice(0, 80).trim()} with a clear, cinematic framing that supports the narration.`,
      visualPrompt: `Create a cinematic visual for: ${narration.slice(0, 120).trim()} with polished creator-focused lighting and coherent pacing.`,
      cameraMotion: scene.cameraMotion,
      transition: scene.transition,
      audioSuggestion: scene.audioSuggestion,
      assetId: scene.assetId,
      status: "generated" as const,
    };
  });

  return createStoryboardDocument({
    title: script.title || "Storyboard",
    format: script.format ?? "Long-form",
    scenes,
  });
}

export function reorderScenes(document: StoryboardDocument, sceneId: string, targetSceneId: string): StoryboardDocument {
  const items = [...document.scenes];
  const sourceIndex = items.findIndex((scene) => scene.id === sceneId);
  const targetIndex = items.findIndex((scene) => scene.id === targetSceneId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return document;
  }

  const [moved] = items.splice(sourceIndex, 1);
  items.splice(targetIndex, 0, moved);

  return {
    ...document,
    scenes: items.map((scene, index) => ({ ...scene, number: index + 1 })),
    updatedAt: new Date().toISOString(),
  };
}

export function duplicateScene(document: StoryboardDocument, sceneId: string): StoryboardDocument {
  const index = document.scenes.findIndex((scene) => scene.id === sceneId);
  if (index === -1) {
    return document;
  }

  const source = document.scenes[index];
  const copy: StoryboardScene = {
    ...source,
    id: crypto.randomUUID(),
    number: index + 2,
    title: `${source.title} copy`,
    assetId: null,
    status: "pending",
  };

  const scenes = [...document.scenes];
  scenes.splice(index + 1, 0, copy);

  return {
    ...document,
    scenes: scenes.map((scene, itemIndex) => ({ ...scene, number: itemIndex + 1 })),
    updatedAt: new Date().toISOString(),
  };
}

export function splitScene(document: StoryboardDocument, sceneId: string): StoryboardDocument {
  const index = document.scenes.findIndex((scene) => scene.id === sceneId);
  if (index === -1) {
    return document;
  }

  const scene = document.scenes[index];
  const narration = scene.narration.trim();
  if (!narration || (narration.length < 80 && !/[.!?]/.test(narration))) {
    return document;
  }

  const splitIndex = narration.includes(".") ? Math.max(20, Math.ceil(narration.length / 2)) : Math.ceil(narration.length / 2);
  const firstNarration = narration.slice(0, splitIndex).trim();
  const secondNarration = narration.slice(splitIndex).trim();

  const firstScene: StoryboardScene = {
    ...scene,
    id: crypto.randomUUID(),
    number: index + 1,
    title: `${scene.title} part 1`,
    narration: firstNarration,
    status: "pending",
  };

  const secondScene: StoryboardScene = {
    ...scene,
    id: crypto.randomUUID(),
    number: index + 2,
    title: `${scene.title} part 2`,
    narration: secondNarration,
    status: "pending",
  };

  const scenes = [...document.scenes];
  scenes.splice(index, 1, firstScene, secondScene);

  return {
    ...document,
    scenes: scenes.map((item, sceneIndex) => ({ ...item, number: sceneIndex + 1 })),
    updatedAt: new Date().toISOString(),
  };
}

export function mergeScenes(document: StoryboardDocument, firstSceneId: string, secondSceneId: string): StoryboardDocument {
  const firstIndex = document.scenes.findIndex((scene) => scene.id === firstSceneId);
  const secondIndex = document.scenes.findIndex((scene) => scene.id === secondSceneId);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex === secondIndex) {
    return document;
  }

  const firstScene = document.scenes[firstIndex];
  const secondScene = document.scenes[secondIndex];
  const merged: StoryboardScene = {
    ...firstScene,
    title: `${firstScene.title} + ${secondScene.title}`,
    narration: `${firstScene.narration} ${secondScene.narration}`.trim(),
    duration: Math.max(firstScene.duration, secondScene.duration),
    visualDescription: `${firstScene.visualDescription} ${secondScene.visualDescription}`,
    visualPrompt: `${firstScene.visualPrompt} ${secondScene.visualPrompt}`,
    status: "generated",
  };

  const scenes = [...document.scenes];
  scenes.splice(secondIndex, 1);
  scenes.splice(firstIndex, 1, merged);

  return {
    ...document,
    scenes: scenes.map((scene, index) => ({ ...scene, number: index + 1 })),
    updatedAt: new Date().toISOString(),
  };
}

export function updateScene(document: StoryboardDocument, sceneId: string, changes: Partial<StoryboardScene>): StoryboardDocument {
  return {
    ...document,
    scenes: document.scenes.map((scene) => (scene.id === sceneId ? { ...scene, ...changes } : scene)),
    updatedAt: new Date().toISOString(),
  };
}

export function removeScene(document: StoryboardDocument, sceneId: string): StoryboardDocument {
  const scenes = document.scenes.filter((scene) => scene.id !== sceneId);
  if (scenes.length === document.scenes.length) {
    return document;
  }

  return {
    ...document,
    scenes: scenes.map((scene, index) => ({ ...scene, number: index + 1 })),
    updatedAt: new Date().toISOString(),
  };
}

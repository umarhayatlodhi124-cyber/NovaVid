import React, { useEffect, useState, useCallback } from "react";
import type { StoryboardDocument, StoryboardScene } from "../lib/storyboard";
import {
  type CharacterProfile,
  type VisualAsset,
  type ImageModelInfo,
  type ImageCostEstimate,
  VISUAL_STYLE_PRESETS,
  MOTION_PRESETS,
  getImageModels,
  estimateImageCost,
  generateVisualAsset,
  getImageDataUrl,
  deleteVisualAssetFile,
  constructScenePrompt,
} from "../lib/visuals";
import {
  CharacterProfileRepository,
  VisualAssetRepository,
  StoryboardRepository,
} from "../lib/repositories";

interface VisualStudioPageProps {
  projectId: string;
  projectTitle?: string;
  storyboard: StoryboardDocument | null;
  onNavigateToTimeline?: () => void;
}

export const VisualStudioPage: React.FC<VisualStudioPageProps> = ({
  projectId,
  projectTitle = "Project Visuals",
  storyboard,
  onNavigateToTimeline,
}) => {
  const [activeTab, setActiveTab] = useState<"scenes" | "characters" | "library">("scenes");
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Consistency & Characters
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState<boolean>(false);
  const [newCharName, setNewCharName] = useState<string>("");
  const [newCharRole, setNewCharRole] = useState<string>("Protagonist");
  const [newCharAppearance, setNewCharAppearance] = useState<string>("");
  const [newCharClothing, setNewCharClothing] = useState<string>("");

  // Generation Parameters
  const [models, setModels] = useState<ImageModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("imagen-3.0-generate-002");
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "local">("gemini");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("cinematic");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [motionPreset, setMotionPreset] = useState<"zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "static">("zoom_in");
  const [prompt, setPrompt] = useState<string>("");
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [isBRoll, setIsBRoll] = useState<boolean>(false);

  // Billing & Cost
  const [costEstimate, setCostEstimate] = useState<ImageCostEstimate | null>(null);
  const [billingConfirmed, setBillingConfirmed] = useState<boolean>(false);
  const [showBillingModal, setShowBillingModal] = useState<boolean>(false);

  // Asset State
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [assetDataUrls, setAssetDataUrls] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "scenes" | "b-roll" | "approved">("all");

  // Load Initial Data
  const loadInitialData = useCallback(async () => {
    try {
      const [availableModels, loadedCharacters, loadedAssets] = await Promise.all([
        getImageModels(),
        CharacterProfileRepository.listProfiles(projectId),
        VisualAssetRepository.listAssets(projectId),
      ]);

      setModels(availableModels);
      setCharacters(loadedCharacters);
      setAssets(loadedAssets);

      if (storyboard && storyboard.scenes.length > 0) {
        setScenes(storyboard.scenes);
        if (!selectedSceneId) {
          setSelectedSceneId(storyboard.scenes[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load visual studio data:", err);
      setStatusMessage("Error loading visual studio data: " + String(err));
    }
  }, [projectId, storyboard, selectedSceneId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load preview data URLs for existing assets
  useEffect(() => {
    let isCancelled = false;
    const fetchPreviews = async () => {
      for (const asset of assets) {
        if (!assetDataUrls[asset.id] && asset.relativePath) {
          try {
            const dataUrl = await getImageDataUrl(projectId, asset.relativePath);
            if (!isCancelled) {
              setAssetDataUrls((prev) => ({ ...prev, [asset.id]: dataUrl }));
            }
          } catch {
            // Ignore preview load failures
          }
        }
      }
    };
    if (assets.length > 0) {
      fetchPreviews();
    }
    return () => {
      isCancelled = true;
    };
  }, [assets, projectId, assetDataUrls]);

  // Sync prompt when scene, character, or style changes
  useEffect(() => {
    const activeScene = scenes.find((s) => s.id === selectedSceneId);
    const activeChar = characters.find((c) => c.id === selectedCharacterId);
    if (activeScene) {
      const constructed = constructScenePrompt(activeScene, activeChar, selectedStyleId);
      setPrompt(constructed);
    }
  }, [selectedSceneId, selectedCharacterId, selectedStyleId, scenes, characters]);

  // Update cost estimate when model changes
  useEffect(() => {
    estimateImageCost(1, selectedModelId).then((est) => setCostEstimate(est));
  }, [selectedModelId]);

  const activeScene = scenes.find((s) => s.id === selectedSceneId);
  const sceneAsset = assets.find((a) => a.sceneId === selectedSceneId);

  // Trigger Image Generation
  const handleGenerateClick = () => {
    if (!prompt.trim()) {
      setStatusMessage("Please enter or generate a visual prompt before generating.");
      return;
    }

    if (selectedProvider === "gemini" && !billingConfirmed) {
      setShowBillingModal(true);
      return;
    }

    executeGeneration();
  };

  const executeGeneration = async () => {
    setIsGenerating(true);
    setStatusMessage(`Generating visual asset using ${selectedModelId}...`);
    try {
      const result = await generateVisualAsset({
        projectId,
        sceneId: isBRoll ? null : selectedSceneId,
        characterId: selectedCharacterId,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        aspectRatio,
        stylePreset: selectedStyleId,
        provider: selectedProvider,
        model: selectedModelId,
        motionPreset,
        isBRoll,
        billingConfirmed,
      });

      // Save to SQLite
      const newAsset: VisualAsset = {
        id: result.id,
        projectId,
        sceneId: isBRoll ? null : selectedSceneId,
        characterId: selectedCharacterId,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        stylePreset: selectedStyleId,
        aspectRatio,
        provider: selectedProvider,
        model: selectedModelId,
        relativePath: result.relativePath,
        originalName: result.originalName,
        width: result.width,
        height: result.height,
        sizeBytes: result.sizeBytes,
        checksum: result.checksum,
        motionPreset,
        isBRoll,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await VisualAssetRepository.saveAsset(newAsset);

      // If tied to a scene, update scene's assetId in Storyboard
      if (!isBRoll && selectedSceneId && storyboard) {
        const updatedScenes = storyboard.scenes.map((sc) =>
          sc.id === selectedSceneId ? { ...sc, assetId: newAsset.id } : sc
        );
        await StoryboardRepository.saveStoryboard(projectId, {
          ...storyboard,
          scenes: updatedScenes,
          updatedAt: new Date().toISOString(),
        });
        setScenes(updatedScenes);
      }

      setAssets((prev) => [newAsset, ...prev]);

      // Load data URL for live preview
      try {
        const dataUrl = await getImageDataUrl(projectId, newAsset.relativePath);
        setAssetDataUrls((prev) => ({ ...prev, [newAsset.id]: dataUrl }));
      } catch {
        // Data URL will be picked up by effect
      }

      setStatusMessage(`Successfully generated visual: ${newAsset.originalName} (${newAsset.width}x${newAsset.height})`);
    } catch (err) {
      console.error("Image generation failed:", err);
      setStatusMessage("Image generation failed: " + String(err));
    } finally {
      setIsGenerating(false);
      setShowBillingModal(false);
    }
  };

  // Delete Visual Asset
  const handleDeleteAsset = async (asset: VisualAsset) => {
    try {
      await deleteVisualAssetFile(projectId, asset.relativePath);
      await VisualAssetRepository.deleteAsset(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      setStatusMessage(`Deleted asset: ${asset.originalName}`);
    } catch (err) {
      console.error("Failed to delete asset:", err);
      setStatusMessage("Failed to delete asset: " + String(err));
    }
  };

  // Assign Asset to Scene
  const handleAssignToScene = async (assetId: string, sceneId: string) => {
    try {
      await VisualAssetRepository.assignAssetToScene(assetId, sceneId);
      setAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, sceneId, isBRoll: false } : a))
      );
      if (storyboard) {
        const updatedScenes = storyboard.scenes.map((sc) =>
          sc.id === sceneId ? { ...sc, assetId } : sc
        );
        await StoryboardRepository.saveStoryboard(projectId, {
          ...storyboard,
          scenes: updatedScenes,
          updatedAt: new Date().toISOString(),
        });
        setScenes(updatedScenes);
      }
      setStatusMessage("Asset successfully assigned to scene.");
    } catch (err) {
      console.error("Failed to assign asset:", err);
      setStatusMessage("Failed to assign asset: " + String(err));
    }
  };

  // Save New Character Profile
  const handleSaveCharacter = async () => {
    if (!newCharName.trim() || !newCharAppearance.trim()) {
      setStatusMessage("Character name and appearance attributes are required.");
      return;
    }

    try {
      const charProfile: CharacterProfile = {
        id: `char-${Date.now()}`,
        projectId,
        name: newCharName.trim(),
        role: newCharRole.trim(),
        appearanceAttributes: newCharAppearance.trim(),
        clothingContinuity: newCharClothing.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await CharacterProfileRepository.saveProfile(charProfile);
      setCharacters((prev) => [charProfile, ...prev]);
      setSelectedCharacterId(charProfile.id);
      setIsCharacterModalOpen(false);
      setNewCharName("");
      setNewCharAppearance("");
      setNewCharClothing("");
      setStatusMessage(`Character profile "${charProfile.name}" saved.`);
    } catch (err) {
      console.error("Failed to save character profile:", err);
      setStatusMessage("Failed to save character: " + String(err));
    }
  };

  // Filtered library assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.originalName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (libraryFilter === "scenes") return !asset.isBRoll && asset.sceneId !== null;
    if (libraryFilter === "b-roll") return asset.isBRoll || asset.sceneId === null;
    if (libraryFilter === "approved") return asset.status === "approved";
    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header & Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎨 AI Visual Asset Studio — {projectTitle}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700">
              Stage D Visual Engine
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Generate style-consistent imagery, manage character continuity, and assemble B-Roll for timeline integration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab("scenes")}
              className={`px-3 py-1 rounded font-medium transition ${
                activeTab === "scenes" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              🎬 Scene Generator
            </button>
            <button
              onClick={() => setActiveTab("characters")}
              className={`px-3 py-1 rounded font-medium transition ${
                activeTab === "characters" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              👤 Character Consistency
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`px-3 py-1 rounded font-medium transition ${
                activeTab === "library" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              🖼 Asset & B-Roll Library ({assets.length})
            </button>
          </div>

          {onNavigateToTimeline && (
            <button
              onClick={onNavigateToTimeline}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
            >
              <span>🎞</span> Go to Timeline
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="px-3 py-2 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 flex justify-between items-center">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-zinc-500 hover:text-zinc-300 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: SCENE GENERATOR */}
      {activeTab === "scenes" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Scene Selector & Prompt Studio */}
          <div className="lg:col-span-2 space-y-4">
            {/* Scene Selector */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Target Storyboard Scene
                </h2>
                <div className="text-xs text-zinc-400">
                  Scene {activeScene?.number || 1} of {scenes.length}
                </div>
              </div>

              {scenes.length === 0 ? (
                <div className="text-xs text-zinc-500 py-3 text-center">
                  No storyboard scenes found. Create scenes in Storyboard Studio first.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {scenes.map((sc) => {
                    const isSelected = sc.id === selectedSceneId;
                    const hasAsset = assets.some((a) => a.sceneId === sc.id);
                    return (
                      <button
                        key={sc.id}
                        onClick={() => setSelectedSceneId(sc.id)}
                        className={`p-2.5 rounded text-left border transition text-xs flex flex-col justify-between ${
                          isSelected
                            ? "bg-blue-950/60 border-blue-500 ring-1 ring-blue-500 text-white"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold truncate">#{sc.number} {sc.title}</span>
                          {hasAsset && <span className="text-[10px] text-emerald-400 font-mono">✓</span>}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">{sc.duration}s</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prompt Formulation & Style Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Visual Prompt Studio
              </h2>

              {/* Character Reference Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1">Character Continuity Reference</label>
                  <select
                    value={selectedCharacterId || ""}
                    onChange={(e) => setSelectedCharacterId(e.target.value || null)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                  >
                    <option value="">No Character (Environment / Object)</option>
                    {characters.map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.name} ({char.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Motion Preset (Timeline Ken Burns)</label>
                  <select
                    value={motionPreset}
                    onChange={(e) => setMotionPreset(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                  >
                    {MOTION_PRESETS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Visual Style Preset Carousel/Grid */}
              <div>
                <label className="text-zinc-400 text-xs block mb-1.5">Art Direction & Visual Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VISUAL_STYLE_PRESETS.map((style) => {
                    const isSelected = style.id === selectedStyleId;
                    return (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyleId(style.id)}
                        className={`p-2 rounded text-left border text-xs transition ${
                          isSelected
                            ? "bg-purple-950/60 border-purple-500 ring-1 ring-purple-500 text-white"
                            : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-semibold text-[11px] truncate">{style.name}</div>
                        <div className="text-[10px] text-zinc-500 line-clamp-1">{style.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-400 text-xs">Prompt</label>
                  <span className="text-[10px] text-zinc-500 font-mono">{prompt.length} / 4000 chars</span>
                </div>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  placeholder="Enter visual prompt describing scene subjects, composition, and lighting..."
                />
              </div>

              {/* Negative Prompt & B-Roll Toggle */}
              <div className="space-y-2">
                <div>
                  <label className="text-zinc-400 text-xs block mb-1">Negative Prompt (Optional)</label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1 text-white text-xs focus:outline-none"
                    placeholder="blurry, distorted face, low quality, artifacts, watermark"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isBRoll}
                      onChange={(e) => setIsBRoll(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0"
                    />
                    <span>Save as standalone B-Roll asset (unlinked from scene)</span>
                  </label>
                </div>
              </div>

              {/* Aspect Ratio, Provider & Generation Action */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                  >
                    <option value="16:9">16:9 Landscape (1920x1080)</option>
                    <option value="9:16">9:16 Shorts Vertical (1080x1920)</option>
                    <option value="1:1">1:1 Square (1024x1024)</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">AI Provider & Model</label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedModelId(id);
                      const mod = models.find((m) => m.id === id);
                      if (mod) setSelectedProvider(mod.provider);
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} ({m.provider.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleGenerateClick}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg transition flex items-center justify-center gap-1.5"
                  >
                    {isGenerating ? (
                      <>
                        <span className="animate-spin">⏳</span> Synthesizing...
                      </>
                    ) : (
                      <>
                        <span>✨</span> Generate Visual ({costEstimate?.estimatedCost || "$0.03"})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Scene Asset Preview & Timeline Link */}
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                  Current Scene Visual Asset
                </h2>

                {sceneAsset ? (
                  <div className="space-y-3">
                    <div className="relative rounded overflow-hidden border border-zinc-800 bg-black aspect-video flex items-center justify-center">
                      {assetDataUrls[sceneAsset.id] ? (
                        <img
                          src={assetDataUrls[sceneAsset.id]}
                          alt={sceneAsset.prompt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs text-zinc-500">Loading preview...</div>
                      )}

                      <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 border border-zinc-700">
                        {sceneAsset.width}x{sceneAsset.height}
                      </div>

                      <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-purple-300 border border-purple-800">
                        {sceneAsset.motionPreset}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-zinc-200">{sceneAsset.originalName}</div>
                      <div className="text-[11px] text-zinc-400 line-clamp-2">{sceneAsset.prompt}</div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {sceneAsset.provider.toUpperCase()} • {sceneAsset.model} • {sceneAsset.aspectRatio}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => handleDeleteAsset(sceneAsset)}
                        className="px-3 py-1.5 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs transition"
                      >
                        🗑 Remove Asset
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded">
                    No visual asset assigned to Scene {activeScene?.number || 1}. Generate one on the left.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800 text-[11px] text-zinc-500">
                Visual assets assigned to scenes automatically sync to Timeline Video Track V1 and receive Ken Burns zoom/pan filters during video export.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHARACTER CONSISTENCY */}
      {activeTab === "characters" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <div>
              <h2 className="text-sm font-semibold text-white">Character Reference Profiles</h2>
              <p className="text-xs text-zinc-400">
                Preserve consistent character identities, facial features, and attire across every storyboard scene.
              </p>
            </div>
            <button
              onClick={() => setIsCharacterModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white shadow transition flex items-center gap-1.5"
            >
              <span>+</span> Create Character Profile
            </button>
          </div>

          {characters.length === 0 ? (
            <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-lg p-10 text-center text-xs text-zinc-500">
              No character profiles defined yet. Click "Create Character Profile" to maintain facial & clothing continuity.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((char) => (
                <div key={char.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{char.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {char.role}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300">
                    <span className="text-zinc-500 block mb-0.5">Appearance:</span>
                    {char.appearanceAttributes}
                  </div>

                  {char.clothingContinuity && (
                    <div className="text-xs text-zinc-300">
                      <span className="text-zinc-500 block mb-0.5">Clothing / Style:</span>
                      {char.clothingContinuity}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[10px] text-zinc-500">
                    <span>Created: {new Date(char.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={async () => {
                        await CharacterProfileRepository.deleteProfile(char.id);
                        setCharacters((prev) => prev.filter((c) => c.id !== char.id));
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ASSET & B-ROLL LIBRARY */}
      {activeTab === "library" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompt or filename..."
                className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none w-56"
              />
              <div className="flex text-xs bg-zinc-950 p-0.5 rounded border border-zinc-800">
                {(["all", "scenes", "b-roll", "approved"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLibraryFilter(filter)}
                    className={`px-2.5 py-1 rounded capitalize ${
                      libraryFilter === filter ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-zinc-400 font-mono">
              Total Assets: {filteredAssets.length}
            </div>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-lg p-12 text-center text-xs text-zinc-500">
              No visual assets found matching current filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => (
                <div key={asset.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col justify-between">
                  <div className="relative aspect-video bg-black flex items-center justify-center">
                    {assetDataUrls[asset.id] ? (
                      <img src={assetDataUrls[asset.id]} alt={asset.prompt} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-zinc-600">Loading...</div>
                    )}

                    <span className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-300">
                      {asset.aspectRatio}
                    </span>

                    <span className="absolute top-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-purple-300">
                      {asset.motionPreset}
                    </span>
                  </div>

                  <div className="p-2.5 space-y-1.5 text-xs">
                    <p className="text-[11px] text-zinc-300 line-clamp-2" title={asset.prompt}>
                      {asset.prompt}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>{asset.model}</span>
                      <span>{asset.width}x{asset.height}</span>
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <select
                        value={asset.sceneId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) handleAssignToScene(asset.id, val);
                        }}
                        className="bg-zinc-800 border border-zinc-700 rounded text-[10px] text-white px-1 py-0.5 focus:outline-none"
                      >
                        <option value="">{asset.isBRoll ? "B-Roll (No Scene)" : "Assign Scene..."}</option>
                        {scenes.map((s) => (
                          <option key={s.id} value={s.id}>
                            Scene #{s.number}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleDeleteAsset(asset)}
                        className="text-red-400 hover:text-red-300 text-[10px]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE CHARACTER MODAL */}
      {isCharacterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Create Character Reference Profile</h3>
            <p className="text-xs text-zinc-400">
              Provide specific facial, age, and clothing attributes that will be automatically infused into every scene prompt featuring this character.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Character Name</label>
                <input
                  type="text"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  placeholder="e.g. Maya Chen"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Role / Job Title</label>
                <input
                  type="text"
                  value={newCharRole}
                  onChange={(e) => setNewCharRole(e.target.value)}
                  placeholder="e.g. Lead Roboticist / Narrator"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Appearance Attributes (Face, Hair, Age, Build)</label>
                <textarea
                  rows={2}
                  value={newCharAppearance}
                  onChange={(e) => setNewCharAppearance(e.target.value)}
                  placeholder="e.g. 28-year-old Asian woman, shoulder-length straight black hair, sharp amber eyes, athletic build, confident expression"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Clothing & Accessories Continuity</label>
                <textarea
                  rows={2}
                  value={newCharClothing}
                  onChange={(e) => setNewCharClothing(e.target.value)}
                  placeholder="e.g. dark navy technical lab coat with cyan piping, silver digital wristwatch, black trousers"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setIsCharacterModalOpen(false)}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCharacter}
                disabled={!newCharName.trim() || !newCharAppearance.trim()}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow transition"
              >
                Save Character Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BILLING CONFIRMATION MODAL */}
      {showBillingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-600/60 rounded-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <span>⚠️</span> Explicit Billing Authorization Required
            </div>

            <div className="text-xs text-zinc-300 space-y-2">
              <p>
                You are about to invoke Google Imagen 3 (<span className="font-mono text-white">{selectedModelId}</span>).
              </p>
              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 font-mono text-[11px] text-zinc-400 space-y-1">
                <div>Images to Generate: 1</div>
                <div>Estimated Charge: {costEstimate?.estimatedCost || "$0.03 USD"}</div>
                <div>Target Scene: #{activeScene?.number || 1}</div>
              </div>
              <p className="text-[11px] text-zinc-400">
                Note: Developer API calls require Google Cloud / AI Studio project billing. Consumer subscriptions (Google One AI Premium) do not provide API credits.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={billingConfirmed}
                onChange={(e) => setBillingConfirmed(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-blue-600"
              />
              <span>I authorize this billable API request on my Google Cloud project</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setShowBillingModal(false)}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={executeGeneration}
                disabled={!billingConfirmed}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs shadow transition"
              >
                Proceed & Generate Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

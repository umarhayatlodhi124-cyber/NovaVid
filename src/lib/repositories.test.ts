import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ResearchRepository,
  ScriptRepository,
  StoryboardRepository,
  VisualStyleRepository,
  MediaRepository,
  ProviderConfigRepository,
  SettingsRepository,
  AudioClipRepository,
  SubtitleRepository,
  migrateBrowserDataToSQLite,
} from "./repositories";
import { resetDatabaseConnection, setDatabaseForTesting } from "./database";
import type { ResearchBrief } from "./research";
import type { ScriptDocument } from "./scripts";
import type { StoryboardDocument } from "./storyboard";
import type { MediaAsset } from "./media";
import type { GeneratedAudioClip } from "./voice";
import type { SubtitleDocument } from "./subtitles";

// In-memory mock database for testing repository queries and transactions
class MockDatabase {
  tables: Record<string, any[]> = {
    research_items: [],
    scripts: [],
    script_versions: [],
    storyboards: [],
    storyboard_versions: [],
    scenes: [],
    visual_style_profiles: [],
    media_assets: [],
    provider_configs: [],
    app_settings: [],
    audio_clips: [],
    subtitle_documents: [],
  };

  async execute(query: string, params: any[] = []): Promise<{ rowsAffected: number }> {
    const q = query.trim().toUpperCase();

    if (q.startsWith("BEGIN") || q.startsWith("COMMIT") || q.startsWith("ROLLBACK")) {
      return { rowsAffected: 0 };
    }

    if (q.startsWith("INSERT INTO RESEARCH_ITEMS")) {
      const [id, project_id, topic, language, payload_json, created_at] = params;
      const idx = this.tables.research_items.findIndex((r) => r.id === id);
      const row = { id, project_id, topic, language, payload_json, created_at };
      if (idx >= 0) this.tables.research_items[idx] = row;
      else this.tables.research_items.push(row);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO SCRIPTS")) {
      const [id, project_id, title, language, format, content, current_version_id, created_at, updated_at] = params;
      const idx = this.tables.scripts.findIndex((r) => r.id === id);
      const row = { id, project_id, title, language, format, content, current_version_id, created_at, updated_at };
      if (idx >= 0) this.tables.scripts[idx] = row;
      else this.tables.scripts.push(row);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO SCRIPT_VERSIONS")) {
      const [id, script_id, label, content, created_at] = params;
      this.tables.script_versions.push({ id, script_id, label, content, created_at });
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO STORYBOARDS")) {
      const [id, project_id, title, format, style_profile_id, current_version_id, created_at, updated_at] = params;
      const idx = this.tables.storyboards.findIndex((r) => r.id === id);
      const row = { id, project_id, title, format, style_profile_id, current_version_id, created_at, updated_at };
      if (idx >= 0) this.tables.storyboards[idx] = row;
      else this.tables.storyboards.push(row);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("DELETE FROM SCENES")) {
      const [storyboard_id] = params;
      this.tables.scenes = this.tables.scenes.filter((s) => s.storyboard_id !== storyboard_id);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO SCENES")) {
      const [id, storyboard_id, scene_number, title, narration, duration_seconds, visual_description, visual_prompt, camera_direction, transition_type, music_suggestion, _sound, status] = params;
      this.tables.scenes.push({ id, storyboard_id, scene_number, title, narration, duration_seconds, visual_description, visual_prompt, camera_direction, transition_type, music_suggestion, status });
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO VISUAL_STYLE_PROFILES")) {
      const [id, project_id, name, profile_json, locked, created_at, updated_at] = params;
      const idx = this.tables.visual_style_profiles.findIndex((r) => r.id === id);
      const row = { id, project_id, name, profile_json, locked, created_at, updated_at };
      if (idx >= 0) this.tables.visual_style_profiles[idx] = row;
      else this.tables.visual_style_profiles.push(row);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO MEDIA_ASSETS")) {
      const [id, project_id, original_name, relative_path, media_type, mime_type, size_bytes, width, height, duration_seconds, checksum, missing, _tags, imported_at] = params;
      const idx = this.tables.media_assets.findIndex((r) => r.id === id);
      const row = { id, project_id, original_name, relative_path, media_type, mime_type, size_bytes, width, height, duration_seconds, checksum, missing, imported_at };
      if (idx >= 0) this.tables.media_assets[idx] = row;
      else this.tables.media_assets.push(row);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO PROVIDER_CONFIGS")) {
      const [provider, model, enabled, updated_at] = params;
      const idx = this.tables.provider_configs.findIndex((r) => r.provider === provider);
      const row = { provider, model, enabled, updated_at };
      if (idx >= 0) this.tables.provider_configs[idx] = row;
      else this.tables.provider_configs.push(row);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO APP_SETTINGS")) {
      const [setting_key, setting_value_json, updated_at] = params;
      const idx = this.tables.app_settings.findIndex((r) => r.setting_key === setting_key);
      const row = { setting_key, setting_value_json, updated_at };
      if (idx >= 0) this.tables.app_settings[idx] = row;
      else this.tables.app_settings.push(row);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("DELETE FROM MEDIA_ASSETS")) {
      const [id] = params;
      this.tables.media_assets = this.tables.media_assets.filter((m) => m.id !== id);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("UPDATE MEDIA_ASSETS SET MISSING")) {
      const [missing, id] = params;
      const item = this.tables.media_assets.find((m) => m.id === id);
      if (item) item.missing = missing;
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO AUDIO_CLIPS")) {
      const [id, project_id, scene_id, original_name, relative_path, provider, voice_name, duration_seconds, size_bytes, checksum, waveform_json, status, created_at, updated_at] = params;
      const idx = this.tables.audio_clips.findIndex((a) => a.id === id);
      const row = { id, project_id, scene_id, original_name, relative_path, provider, voice_name, duration_seconds, size_bytes, checksum, waveform_json, status, created_at, updated_at };
      if (idx >= 0) this.tables.audio_clips[idx] = row;
      else this.tables.audio_clips.push(row);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("UPDATE AUDIO_CLIPS SET STATUS = 'APPROVED'")) {
      const [updated_at, id] = params;
      const row = this.tables.audio_clips.find((a) => a.id === id);
      if (row) {
        row.status = "approved";
        row.updated_at = updated_at;
      }
      return { rowsAffected: 1 };
    }

    if (q.startsWith("DELETE FROM AUDIO_CLIPS")) {
      const [id] = params;
      this.tables.audio_clips = this.tables.audio_clips.filter((a) => a.id !== id);
      return { rowsAffected: 1 };
    }

    if (q.startsWith("INSERT INTO SUBTITLE_DOCUMENTS")) {
      const [id, project_id, title, language, segments_json, style_profile_json, created_at, updated_at] = params;
      const idx = this.tables.subtitle_documents.findIndex((s) => s.id === id);
      const row = { id, project_id, title, language, segments_json, style_profile_json, created_at, updated_at };
      if (idx >= 0) this.tables.subtitle_documents[idx] = row;
      else this.tables.subtitle_documents.push(row);
      return { rowsAffected: 1 };
    }

    return { rowsAffected: 0 };
  }

  async select<T>(query: string, params: any[] = []): Promise<T> {
    const q = query.trim().toUpperCase();

    if (q.includes("FROM RESEARCH_ITEMS")) {
      const [project_id] = params;
      const rows = this.tables.research_items.filter((r) => r.project_id === project_id);
      return rows as unknown as T;
    }

    if (q.includes("FROM SCRIPTS")) {
      const [project_id] = params;
      const rows = this.tables.scripts.filter((r) => r.project_id === project_id);
      return rows as unknown as T;
    }

    if (q.includes("FROM SCRIPT_VERSIONS")) {
      const [script_id] = params;
      const rows = this.tables.script_versions.filter((r) => r.script_id === script_id);
      return rows as unknown as T;
    }

    if (q.includes("FROM STORYBOARDS")) {
      const [project_id] = params;
      const rows = this.tables.storyboards.filter((r) => r.project_id === project_id);
      return rows as unknown as T;
    }

    if (q.includes("FROM SCENES")) {
      const [storyboard_id] = params;
      const rows = this.tables.scenes.filter((r) => r.storyboard_id === storyboard_id);
      return rows as unknown as T;
    }

    if (q.includes("FROM STORYBOARD_VERSIONS")) {
      const [storyboard_id] = params;
      const rows = this.tables.storyboard_versions.filter((r) => r.storyboard_id === storyboard_id);
      return rows as unknown as T;
    }

    if (q.includes("FROM VISUAL_STYLE_PROFILES")) {
      const [project_id] = params;
      const rows = this.tables.visual_style_profiles.filter((r) => r.project_id === project_id);
      return rows as unknown as T;
    }

    if (q.includes("FROM MEDIA_ASSETS")) {
      const [project_id] = params;
      const rows = this.tables.media_assets.filter((r) => r.project_id === project_id);
      return rows as unknown as T;
    }

    if (q.includes("FROM PROVIDER_CONFIGS")) {
      const [provider] = params;
      const rows = this.tables.provider_configs.filter((r) => r.provider === provider);
      return rows as unknown as T;
    }

    if (q.includes("FROM APP_SETTINGS")) {
      const [setting_key] = params;
      const rows = this.tables.app_settings.filter((r) => r.setting_key === setting_key);
      return rows as unknown as T;
    }

    if (q.includes("FROM AUDIO_CLIPS")) {
      if (q.includes("WHERE PROJECT_ID = $1 AND SCENE_ID = $2")) {
        const [project_id, scene_id] = params;
        const rows = this.tables.audio_clips.filter((a) => a.project_id === project_id && a.scene_id === scene_id);
        return rows as unknown as T;
      }
      const [project_id] = params;
      const rows = this.tables.audio_clips.filter((a) => a.project_id === project_id);
      return rows as unknown as T;
    }

    if (q.includes("FROM SUBTITLE_DOCUMENTS")) {
      const [project_id] = params;
      const rows = this.tables.subtitle_documents.filter((s) => s.project_id === project_id);
      return rows as unknown as T;
    }

    return [] as unknown as T;
  }
}

describe("SQLite Production Repositories", () => {
  let mockDb: MockDatabase;

  beforeEach(() => {
    mockDb = new MockDatabase();
    setDatabaseForTesting(mockDb as any);
  });

  afterEach(() => {
    resetDatabaseConnection();
  });

  it("stores and retrieves project-scoped research briefs", async () => {
    const brief: ResearchBrief = {
      id: "brief-1",
      topic: "Quantum Computing Basics",
      language: "English",
      questions: ["What is a qubit?"],
      outline: ["Intro", "Qubits", "Applications"],
      keyPoints: ["Superposition"],
      structure: ["Hook", "Core", "Outro"],
      verifiedFacts: ["Facts verified"],
      assumptions: ["Beginner friendly"],
      limitations: "Web research limited",
      createdAt: new Date().toISOString(),
      providerName: "Google Gemini",
    };

    await ResearchRepository.saveResearch("proj-1", brief);
    const retrieved = await ResearchRepository.getResearch("proj-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.topic).toBe("Quantum Computing Basics");
    expect(retrieved?.questions).toEqual(["What is a qubit?"]);

    // Scoped check: proj-2 has no research
    const other = await ResearchRepository.getResearch("proj-2");
    expect(other).toBeNull();
  });

  it("stores scripts with version history atomically", async () => {
    const doc: ScriptDocument = {
      id: "script-1",
      title: "How GPU Shaders Work",
      language: "English",
      format: "Long-form",
      content: "Intro: What is a shader? ...",
      currentVersionId: "v-1",
      createdAt: "2026-11-06T10:00:00Z",
      updatedAt: "2026-11-06T10:00:00Z",
      versions: [
        {
          id: "v-1",
          label: "Initial draft",
          content: "Intro: What is a shader? ...",
          createdAt: "2026-11-06T10:00:00Z",
        },
      ],
    };

    await ScriptRepository.saveScript("proj-1", doc);
    const retrieved = await ScriptRepository.getScript("proj-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe("How GPU Shaders Work");
    expect(retrieved?.versions).toHaveLength(1);
    expect(retrieved?.versions[0].label).toBe("Initial draft");
  });

  it("stores storyboards and their constituent scenes", async () => {
    const sb: StoryboardDocument = {
      id: "sb-1",
      title: "Explainer Storyboard",
      format: "YouTube Shorts",
      styleProfileId: null,
      currentVersionId: "v-1",
      createdAt: "2026-11-06T10:00:00Z",
      updatedAt: "2026-11-06T10:00:00Z",
      scenes: [
        {
          id: "sc-1",
          number: 1,
          title: "Opening hook",
          narration: "Have you ever wondered...",
          duration: 5,
          visualDescription: "Close up of code",
          visualPrompt: "Cyberpunk screen code",
          cameraMotion: "Zoom in",
          transition: "Cut",
          audioSuggestion: "Synth beat",
          assetId: null,
          status: "pending",
        },
      ],
      versions: [],
    };

    await StoryboardRepository.saveStoryboard("proj-1", sb);
    const retrieved = await StoryboardRepository.getStoryboard("proj-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.scenes).toHaveLength(1);
    expect(retrieved?.scenes[0].title).toBe("Opening hook");
    expect(retrieved?.scenes[0].duration).toBe(5);
  });

  it("stores and lists media assets with checksum and dimensions", async () => {
    const asset: MediaAsset = {
      id: "media-1",
      name: "banner.png",
      type: "image",
      size: "1.2 MB",
      importedAt: "2026-11-06T12:00:00Z",
      projectId: "proj-1",
      relativePath: "projects/proj-1/media/banner.png",
      mimeType: "image/png",
      sizeBytes: 1258291,
      width: 1920,
      height: 1080,
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      missing: false,
    };

    await MediaRepository.addMediaAsset(asset);
    const list = await MediaRepository.listMediaAssets("proj-1");
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("banner.png");
    expect(list[0].width).toBe(1920);
    expect(list[0].checksum).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

    await MediaRepository.updateMediaAssetMissing("media-1", true);
    const updated = await MediaRepository.listMediaAssets("proj-1");
    expect(updated[0].missing).toBe(true);
  });

  it("stores and retrieves visual style profiles", async () => {
    const profile = {
      id: "vsp-1",
      name: "Cinematic Creator",
      artStyle: "cinematic",
      colorPalette: ["blue", "gold"],
      lighting: "moody",
      characterDescription: "creator in hoodie",
      environmentDescription: "neon backlit studio",
      consistencyInstructions: "preserve clothing and lighting",
      locked: true,
      updatedAt: "2026-11-06T12:00:00Z",
    };

    await VisualStyleRepository.saveVisualStyle("proj-1", profile);
    const retrieved = await VisualStyleRepository.getVisualStyle("proj-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("Cinematic Creator");
    expect(retrieved?.locked).toBe(true);
  });

  it("stores provider configs and studio settings safely", async () => {
    await ProviderConfigRepository.saveProviderConfig({
      provider: "gemini",
      model: "gemini-2.0-flash",
      enabled: true,
      credentialConfigured: false,
      status: "disconnected",
      lastError: null,
      usage: { requests: 0, estimatedCost: "0", lastUsed: null },
    });
    const cfg = await ProviderConfigRepository.getProviderConfig("gemini");
    expect(cfg).not.toBeNull();
    expect(cfg?.model).toBe("gemini-2.0-flash");
    expect(cfg?.enabled).toBe(true);

    await SettingsRepository.saveSettings({
      defaultLanguage: "English",
      contentCategory: "Technology",
      defaultFormat: "YouTube Shorts",
      theme: "dark",
      localOnlyMode: true,
    });
    const settings = await SettingsRepository.getSettings();
    expect(settings).not.toBeNull();
    expect(settings?.contentCategory).toBe("Technology");
  });

  it("safely migrates browser localStorage data without deleting original data", async () => {
    const fakeStorage: Record<string, string> = {
      "ai-youtube-studio.settings": JSON.stringify({
        defaultLanguage: "English",
        contentCategory: "Technology",
        defaultFormat: "YouTube Shorts",
        theme: "dark",
        localOnlyMode: true,
      }),
      "ai-youtube-studio.research": JSON.stringify({
        id: "legacy-brief",
        topic: "Legacy Topic",
        language: "English",
        questions: ["Q1"],
        outline: ["O1"],
        keyPoints: ["K1"],
        structure: ["S1"],
        verifiedFacts: [],
        assumptions: [],
        limitations: "None",
        createdAt: "2026-11-06T00:00:00Z",
        providerName: "Google Gemini",
      }),
    };

    const mockLocalStorage = {
      getItem: (k: string) => fakeStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        fakeStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete fakeStorage[k];
      },
      clear: () => {
        Object.keys(fakeStorage).forEach((k) => delete fakeStorage[k]);
      },
    } as unknown as Storage;

    const result = await migrateBrowserDataToSQLite("proj-1", mockLocalStorage);

    expect(result.migrated).toContain("settings");
    expect(result.migrated).toContain("research");

    // CRITICAL: Original localStorage entries must NOT have been deleted
    expect(mockLocalStorage.getItem("ai-youtube-studio.settings")).not.toBeNull();
    expect(mockLocalStorage.getItem("ai-youtube-studio.research")).not.toBeNull();
    expect(mockLocalStorage.getItem("ai-youtube-studio.migrated-at")).not.toBeNull();

    // Verify it reached SQLite mock
    const brief = await ResearchRepository.getResearch("proj-1");
    expect(brief?.topic).toBe("Legacy Topic");

    // Idempotent: second migration skips already migrated entities
    const secondResult = await migrateBrowserDataToSQLite("proj-1", mockLocalStorage);
    expect(secondResult.skipped.length).toBeGreaterThan(0);
  });

  it("handles AudioClipRepository CRUD, approval and project scoping", async () => {
    const clip1: GeneratedAudioClip = {
      id: "clip-101",
      projectId: "proj-1",
      sceneId: "scene-1",
      originalName: "audio_1.wav",
      relativePath: "projects/proj-1/audio/audio_1.wav",
      absolutePath: "",
      provider: "native",
      voiceName: "David",
      durationSeconds: 3.5,
      sizeBytes: 112000,
      checksum: "chk-101",
      waveform: [0.1, 0.5, 0.2],
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    const clip2: GeneratedAudioClip = {
      id: "clip-102",
      projectId: "proj-2", // different project
      sceneId: "scene-1",
      originalName: "audio_2.wav",
      relativePath: "projects/proj-2/audio/audio_2.wav",
      absolutePath: "",
      provider: "gemini",
      voiceName: "Kore",
      durationSeconds: 5.2,
      sizeBytes: 168000,
      checksum: "chk-102",
      waveform: [0.2, 0.8, 0.4],
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    await AudioClipRepository.saveAudioClip(clip1);
    await AudioClipRepository.saveAudioClip(clip2);

    // List clips isolated by project
    const proj1Clips = await AudioClipRepository.listAudioClips("proj-1");
    expect(proj1Clips.length).toBe(1);
    expect(proj1Clips[0].id).toBe("clip-101");

    // Get scene clip
    const sceneClip = await AudioClipRepository.getSceneAudioClip("proj-1", "scene-1");
    expect(sceneClip).not.toBeNull();
    expect(sceneClip?.status).toBe("draft");

    // Approve clip
    await AudioClipRepository.approveAudioClip("clip-101");
    const approvedClip = await AudioClipRepository.getSceneAudioClip("proj-1", "scene-1");
    expect(approvedClip?.status).toBe("approved");

    // Delete clip
    await AudioClipRepository.deleteAudioClip("clip-101");
    const afterDelete = await AudioClipRepository.listAudioClips("proj-1");
    expect(afterDelete.length).toBe(0);
  });

  it("handles SubtitleRepository saving and retrieval", async () => {
    const subDoc: SubtitleDocument = {
      id: "subdoc-1",
      projectId: "proj-1",
      title: "Test Subtitles",
      language: "Urdu",
      segments: [
        {
          id: "seg-1",
          sceneId: "scene-1",
          sceneNumber: 1,
          startTimeSeconds: 0,
          endTimeSeconds: 2.5,
          startTimeFormatted: "00:00:00,000",
          endTimeFormatted: "00:00:02,500",
          text: "خوش آمدید",
        },
      ],
      styleProfile: {
        id: "style-1",
        name: "Urdu Style",
        fontFamily: "'Noto Nastaliq Urdu'",
        fontSize: 24,
        textColor: "#FFFFFF",
        outlineColor: "#000000",
        outlineWidth: 2,
        backgroundColor: "rgba(0,0,0,0.8)",
        position: "bottom",
        alignment: "center",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await SubtitleRepository.saveSubtitles("proj-1", subDoc);
    const retrieved = await SubtitleRepository.getSubtitles("proj-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.language).toBe("Urdu");
    expect(retrieved?.segments.length).toBe(1);
    expect(retrieved?.segments[0].text).toBe("خوش آمدید");
  });
});

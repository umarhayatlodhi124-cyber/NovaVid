import { getDatabase, runInTransaction } from "./database";
import type { ResearchBrief } from "./research";
import type { ScriptDocument, ScriptFormat } from "./scripts";
import type { StoryboardDocument, StoryboardScene, VisualStyleProfile } from "./storyboard";
import type { CharacterProfile, VisualAsset } from "./visuals";
import type { AudioLibraryTrack, DuckingConfig } from "./audioStudio";
import { DEFAULT_DUCKING_CONFIG } from "./audioStudio";
import type { AgentWorkflow, AgentLogEntry } from "./agentEngine";
import type { SEOMetadata, ChannelCalendarEvent } from "./seoStudio";
import type { PublishJobStatus, PublishVideoRequest } from "./publishingStudio";
import type { AnalyticsSnapshot, RetentionCurveRecord } from "./analyticsStudio";
import type { UserLicense } from "./licensingStudio";
import { DEFAULT_FREE_LICENSE } from "./licensingStudio";
import type { CreatorProfile, CreatorPreset } from "./creatorWorkspace";
import { DEFAULT_LODHI_TECHX_PROFILE, BUILTIN_CREATOR_PRESETS } from "./creatorWorkspace";
import type { MediaAsset, MediaAssetType } from "./media";
import type { ProviderConfig, ProviderName } from "./providers";
import { restoreProviderConfig, serializeProviderConfig } from "./providers";
import type { StudioSettings } from "./settings";
import { normalizeStudioSettings } from "./settings";
import type { GeneratedAudioClip } from "./voice";
import type { SubtitleDocument } from "./subtitles";
import type {
  TimelineClip,
  TimelineTrack,
  TimelineDocument,
  RenderJobRecord,
} from "./timeline";
import { createDefaultTracks } from "./timeline";

// --- Research Repository ---
export class ResearchRepository {
  static async saveResearch(projectId: string, brief: ResearchBrief): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO research_items (id, project_id, topic, language, payload_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET
         topic = excluded.topic,
         language = excluded.language,
         payload_json = excluded.payload_json;`,
      [
        brief.id,
        projectId,
        brief.topic,
        brief.language,
        JSON.stringify(brief),
        brief.createdAt || new Date().toISOString(),
      ],
    );
  }

  static async getResearch(projectId: string): Promise<ResearchBrief | null> {
    const db = await getDatabase();
    const rows = await db.select<{ payload_json: string }[]>(
      `SELECT payload_json FROM research_items
       WHERE project_id = $1
       ORDER BY created_at DESC LIMIT 1;`,
      [projectId],
    );
    if (!rows || rows.length === 0) return null;
    try {
      return JSON.parse(rows[0].payload_json) as ResearchBrief;
    } catch {
      return null;
    }
  }

  static async listResearch(projectId: string): Promise<ResearchBrief[]> {
    const db = await getDatabase();
    const rows = await db.select<{ payload_json: string }[]>(
      `SELECT payload_json FROM research_items
       WHERE project_id = $1
       ORDER BY created_at DESC;`,
      [projectId],
    );
    return rows.map((r) => JSON.parse(r.payload_json) as ResearchBrief);
  }

  static async deleteResearch(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM research_items WHERE id = $1;", [id]);
  }
}

// --- Script Repository ---
export class ScriptRepository {
  static async saveScript(projectId: string, doc: ScriptDocument): Promise<void> {
    await runInTransaction(async (db) => {
      await db.execute(
        `INSERT INTO scripts (id, project_id, title, language, format, content, current_version_id, created_at, updated_at, model_used, fallback_occurred, attempts, fallback_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           language = excluded.language,
           format = excluded.format,
           content = excluded.content,
           current_version_id = excluded.current_version_id,
           updated_at = excluded.updated_at,
           model_used = excluded.model_used,
           fallback_occurred = excluded.fallback_occurred,
           attempts = excluded.attempts,
           fallback_reason = excluded.fallback_reason;`,
        [
          doc.id,
          projectId,
          doc.title,
          doc.language,
          doc.format,
          doc.content,
          doc.currentVersionId,
          doc.createdAt,
          doc.updatedAt || new Date().toISOString(),
          doc.modelUsed || null,
          doc.fallbackOccurred ? 1 : 0,
          doc.attempts || 1,
          doc.fallbackReason || null,
        ],
      );

      if (doc.versions && doc.versions.length > 0) {
        for (const v of doc.versions) {
          await db.execute(
            `INSERT INTO script_versions (id, script_id, label, content, created_at, model_used, fallback_occurred, attempts, fallback_reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT(id) DO UPDATE SET
               label = excluded.label,
               content = excluded.content,
               model_used = excluded.model_used,
               fallback_occurred = excluded.fallback_occurred,
               attempts = excluded.attempts,
               fallback_reason = excluded.fallback_reason;`,
            [
              v.id,
              doc.id,
              v.label,
              v.content,
              v.createdAt,
              v.modelUsed || null,
              v.fallbackOccurred ? 1 : 0,
              v.attempts || 1,
              v.fallbackReason || null,
            ],
          );
        }
      }
    });
  }

  static async getScript(projectId: string): Promise<ScriptDocument | null> {
    const db = await getDatabase();
    const scriptRows = await db.select<{
      id: string;
      project_id: string;
      title: string;
      language: string;
      format: string;
      content: string;
      current_version_id: string;
      created_at: string;
      updated_at: string;
      model_used: string | null;
      fallback_occurred: number | null;
      attempts: number | null;
      fallback_reason: string | null;
    }[]>(
      `SELECT id, project_id, title, language, format, content, current_version_id, created_at, updated_at, model_used, fallback_occurred, attempts, fallback_reason
       FROM scripts
       WHERE project_id = $1
       ORDER BY updated_at DESC LIMIT 1;`,
      [projectId],
    );

    if (!scriptRows || scriptRows.length === 0) return null;
    const script = scriptRows[0];

    const versionRows = await db.select<{
      id: string;
      label: string;
      content: string;
      created_at: string;
      model_used: string | null;
      fallback_occurred: number | null;
      attempts: number | null;
      fallback_reason: string | null;
    }[]>(
      `SELECT id, label, content, created_at, model_used, fallback_occurred, attempts, fallback_reason
       FROM script_versions
       WHERE script_id = $1
       ORDER BY created_at ASC;`,
      [script.id],
    );

    return {
      id: script.id,
      title: script.title,
      language: script.language,
      format: script.format as ScriptFormat,
      content: script.content,
      createdAt: script.created_at,
      updatedAt: script.updated_at,
      currentVersionId: script.current_version_id,
      modelUsed: script.model_used || undefined,
      fallbackOccurred: script.fallback_occurred === 1,
      attempts: script.attempts || undefined,
      fallbackReason: script.fallback_reason || undefined,
      versions: versionRows.map((v) => ({
        id: v.id,
        label: v.label,
        content: v.content,
        createdAt: v.created_at,
        modelUsed: v.model_used || undefined,
        fallbackOccurred: v.fallback_occurred === 1,
        attempts: v.attempts || undefined,
        fallbackReason: v.fallback_reason || undefined,
      })),
    };
  }
}

// --- Storyboard Repository ---
export class StoryboardRepository {
  static async saveStoryboard(projectId: string, doc: StoryboardDocument): Promise<void> {
    await runInTransaction(async (db) => {
      await db.execute(
        `INSERT INTO storyboards (id, project_id, title, format, style_profile_id, current_version_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           format = excluded.format,
           style_profile_id = excluded.style_profile_id,
           current_version_id = excluded.current_version_id,
           updated_at = excluded.updated_at;`,
        [
          doc.id,
          projectId,
          doc.title,
          doc.format,
          doc.styleProfileId,
          doc.currentVersionId,
          doc.createdAt,
          doc.updatedAt || new Date().toISOString(),
        ],
      );

      // Replace scenes for this storyboard
      await db.execute("DELETE FROM scenes WHERE storyboard_id = $1;", [doc.id]);

      if (doc.scenes && doc.scenes.length > 0) {
        for (const scene of doc.scenes) {
          await db.execute(
            `INSERT INTO scenes (id, storyboard_id, scene_number, title, narration, duration_seconds, visual_description, visual_prompt, camera_direction, transition_type, music_suggestion, sound_suggestion, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
            [
              scene.id,
              doc.id,
              scene.number,
              scene.title,
              scene.narration,
              scene.duration,
              scene.visualDescription,
              scene.visualPrompt,
              scene.cameraMotion,
              scene.transition,
              scene.audioSuggestion || "",
              "",
              scene.status,
            ],
          );
        }
      }

      if (doc.versions && doc.versions.length > 0) {
        for (const v of doc.versions) {
          await db.execute(
            `INSERT INTO storyboard_versions (id, storyboard_id, label, scene_snapshot_json, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT(id) DO UPDATE SET
               label = excluded.label,
               scene_snapshot_json = excluded.scene_snapshot_json;`,
            [v.id, doc.id, v.label, JSON.stringify(v.scenes), v.createdAt],
          );
        }
      }
    });
  }

  static async getStoryboard(projectId: string): Promise<StoryboardDocument | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      title: string;
      format: string;
      style_profile_id: string | null;
      current_version_id: string;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, title, format, style_profile_id, current_version_id, created_at, updated_at
       FROM storyboards
       WHERE project_id = $1
       ORDER BY updated_at DESC LIMIT 1;`,
      [projectId],
    );

    if (!rows || rows.length === 0) return null;
    const sb = rows[0];

    const sceneRows = await db.select<{
      id: string;
      scene_number: number;
      title: string;
      narration: string;
      duration_seconds: number;
      visual_description: string;
      visual_prompt: string;
      camera_direction: string;
      transition_type: string;
      music_suggestion: string;
      status: string;
    }[]>(
      `SELECT id, scene_number, title, narration, duration_seconds, visual_description, visual_prompt, camera_direction, transition_type, music_suggestion, status
       FROM scenes
       WHERE storyboard_id = $1
       ORDER BY scene_number ASC;`,
      [sb.id],
    );

    const versionRows = await db.select<{
      id: string;
      label: string;
      scene_snapshot_json: string;
      created_at: string;
    }[]>(
      `SELECT id, label, scene_snapshot_json, created_at
       FROM storyboard_versions
       WHERE storyboard_id = $1
       ORDER BY created_at ASC;`,
      [sb.id],
    );

    return {
      id: sb.id,
      title: sb.title,
      format: sb.format as StoryboardDocument["format"],
      styleProfileId: sb.style_profile_id,
      currentVersionId: sb.current_version_id,
      createdAt: sb.created_at,
      updatedAt: sb.updated_at,
      scenes: sceneRows.map((s) => ({
        id: s.id,
        number: s.scene_number,
        title: s.title,
        narration: s.narration,
        duration: s.duration_seconds,
        visualDescription: s.visual_description,
        visualPrompt: s.visual_prompt,
        cameraMotion: s.camera_direction,
        transition: s.transition_type,
        audioSuggestion: s.music_suggestion,
        assetId: null,
        status: s.status as StoryboardScene["status"],
      })),
      versions: versionRows.map((v) => {
        let scenes: StoryboardScene[] = [];
        try {
          scenes = JSON.parse(v.scene_snapshot_json) as StoryboardScene[];
        } catch {
          // ignore corrupted snapshot
        }
        return {
          id: v.id,
          label: v.label,
          createdAt: v.created_at,
          scenes,
        };
      }),
    };
  }
}

// --- Visual Style Repository ---
export class VisualStyleRepository {
  static async saveVisualStyle(projectId: string, profile: VisualStyleProfile): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO visual_style_profiles (id, project_id, name, profile_json, locked, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         profile_json = excluded.profile_json,
         locked = excluded.locked,
         updated_at = excluded.updated_at;`,
      [
        profile.id,
        projectId,
        profile.name,
        JSON.stringify(profile),
        profile.locked ? 1 : 0,
        profile.updatedAt || new Date().toISOString(),
        profile.updatedAt || new Date().toISOString(),
      ],
    );
  }

  static async getVisualStyle(projectId: string): Promise<VisualStyleProfile | null> {
    const db = await getDatabase();
    const rows = await db.select<{ profile_json: string }[]>(
      `SELECT profile_json FROM visual_style_profiles
       WHERE project_id = $1
       ORDER BY updated_at DESC LIMIT 1;`,
      [projectId],
    );
    if (!rows || rows.length === 0) return null;
    try {
      return JSON.parse(rows[0].profile_json) as VisualStyleProfile;
    } catch {
      return null;
    }
  }
}

// --- Media Repository ---
export class MediaRepository {
  static async addMediaAsset(asset: MediaAsset): Promise<void> {
    const db = await getDatabase();
    const sizeBytes = asset.sizeBytes ?? (parseSizeBytes(asset.size) || 0);
    const mediaType = asset.type || "document";
    const mimeType = asset.mimeType || inferMime(asset.name);
    const relativePath = asset.relativePath || `media/${asset.name}`;

    await db.execute(
      `INSERT INTO media_assets (
         id, project_id, original_name, relative_path, media_type, mime_type,
         size_bytes, width, height, duration_seconds, checksum, missing, tags_json, imported_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT(id) DO UPDATE SET
         original_name = excluded.original_name,
         relative_path = excluded.relative_path,
         size_bytes = excluded.size_bytes,
         width = excluded.width,
         height = excluded.height,
         duration_seconds = excluded.duration_seconds,
         missing = excluded.missing;`,
      [
        asset.id,
        asset.projectId || "default",
        asset.name,
        relativePath,
        mediaType,
        mimeType,
        sizeBytes,
        asset.width ?? null,
        asset.height ?? null,
        asset.durationSeconds ?? null,
        asset.checksum ?? null,
        asset.missing ? 1 : 0,
        "[]",
        asset.importedAt || new Date().toISOString(),
      ],
    );
  }

  static async listMediaAssets(projectId: string): Promise<MediaAsset[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      original_name: string;
      relative_path: string;
      media_type: string;
      mime_type: string;
      size_bytes: number;
      width: number | null;
      height: number | null;
      duration_seconds: number | null;
      checksum: string | null;
      missing: number;
      imported_at: string;
    }[]>(
      `SELECT id, project_id, original_name, relative_path, media_type, mime_type,
              size_bytes, width, height, duration_seconds, checksum, missing, imported_at
       FROM media_assets
       WHERE project_id = $1
       ORDER BY imported_at DESC;`,
      [projectId],
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.original_name,
      type: r.media_type as MediaAssetType,
      size: formatBytes(r.size_bytes),
      importedAt: r.imported_at,
      projectId: r.project_id,
      relativePath: r.relative_path,
      mimeType: r.mime_type,
      sizeBytes: r.size_bytes,
      width: r.width,
      height: r.height,
      durationSeconds: r.duration_seconds,
      checksum: r.checksum,
      missing: r.missing === 1,
    }));
  }

  static async deleteMediaAsset(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM media_assets WHERE id = $1;", [id]);
  }

  static async updateMediaAssetMissing(id: string, missing: boolean): Promise<void> {
    const db = await getDatabase();
    await db.execute("UPDATE media_assets SET missing = $1 WHERE id = $2;", [missing ? 1 : 0, id]);
  }
}

// --- Provider Config Repository ---
export class ProviderConfigRepository {
  static async saveProviderConfig(config: ProviderConfig): Promise<void> {
    const db = await getDatabase();
    const cleanConfig = serializeProviderConfig(config);
    await db.execute(
      `INSERT INTO provider_configs (provider, model, enabled, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(provider) DO UPDATE SET
         model = excluded.model,
         enabled = excluded.enabled,
         updated_at = excluded.updated_at;`,
      [cleanConfig.provider, cleanConfig.model, cleanConfig.enabled ? 1 : 0, new Date().toISOString()],
    );
  }

  static async getProviderConfig(provider: ProviderName): Promise<ProviderConfig | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      provider: string;
      model: string;
      enabled: number;
      updated_at: string;
    }[]>(
      `SELECT provider, model, enabled, updated_at
       FROM provider_configs
       WHERE provider = $1;`,
      [provider],
    );
    if (!rows || rows.length === 0) return null;
    return restoreProviderConfig({
      provider: rows[0].provider as ProviderName,
      model: rows[0].model,
      enabled: rows[0].enabled === 1,
    });
  }
}

// --- App Settings Repository ---
export class SettingsRepository {
  static async saveSettings(settings: StudioSettings): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO app_settings (setting_key, setting_value_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value_json = excluded.setting_value_json,
         updated_at = excluded.updated_at;`,
      ["studio_settings", JSON.stringify(settings), new Date().toISOString()],
    );
  }

  static async getSettings(): Promise<StudioSettings | null> {
    const db = await getDatabase();
    const rows = await db.select<{ setting_value_json: string }[]>(
      `SELECT setting_value_json FROM app_settings WHERE setting_key = $1;`,
      ["studio_settings"],
    );
    if (!rows || rows.length === 0) return null;
    try {
      return normalizeStudioSettings(JSON.parse(rows[0].setting_value_json));
    } catch {
      return null;
    }
  }
}

// --- Audio Clip Repository ---
export class AudioClipRepository {
  static async saveAudioClip(clip: GeneratedAudioClip): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO audio_clips (
         id, project_id, scene_id, original_name, relative_path, provider, voice_name,
         duration_seconds, size_bytes, checksum, waveform_json, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT(id) DO UPDATE SET
         scene_id = excluded.scene_id,
         duration_seconds = excluded.duration_seconds,
         size_bytes = excluded.size_bytes,
         checksum = excluded.checksum,
         waveform_json = excluded.waveform_json,
         status = excluded.status,
         updated_at = excluded.updated_at;`,
      [
        clip.id,
        clip.projectId,
        clip.sceneId,
        clip.originalName,
        clip.relativePath,
        clip.provider,
        clip.voiceName,
        clip.durationSeconds,
        clip.sizeBytes,
        clip.checksum,
        JSON.stringify(clip.waveform),
        clip.status,
        clip.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
  }

  static async getClipsForProject(projectId: string): Promise<GeneratedAudioClip[]> {
    return this.listAudioClips(projectId);
  }

  static async listAudioClips(projectId: string): Promise<GeneratedAudioClip[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      scene_id: string | null;
      original_name: string;
      relative_path: string;
      provider: string;
      voice_name: string;
      duration_seconds: number;
      size_bytes: number;
      checksum: string;
      waveform_json: string;
      status: string;
      created_at: string;
    }[]>(
      `SELECT id, project_id, scene_id, original_name, relative_path, provider, voice_name,
              duration_seconds, size_bytes, checksum, waveform_json, status, created_at
       FROM audio_clips
       WHERE project_id = $1
       ORDER BY updated_at DESC;`,
      [projectId],
    );

    return rows.map((r) => {
      let waveform: number[] = [];
      try {
        waveform = JSON.parse(r.waveform_json);
      } catch {
        waveform = [];
      }
      return {
        id: r.id,
        projectId: r.project_id,
        sceneId: r.scene_id,
        originalName: r.original_name,
        relativePath: r.relative_path,
        absolutePath: "",
        provider: r.provider,
        voiceName: r.voice_name,
        durationSeconds: r.duration_seconds,
        sizeBytes: r.size_bytes,
        checksum: r.checksum,
        waveform,
        status: (r.status as "draft" | "approved") || "draft",
        createdAt: r.created_at,
      };
    });
  }

  static async getSceneAudioClip(projectId: string, sceneId: string): Promise<GeneratedAudioClip | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      scene_id: string | null;
      original_name: string;
      relative_path: string;
      provider: string;
      voice_name: string;
      duration_seconds: number;
      size_bytes: number;
      checksum: string;
      waveform_json: string;
      status: string;
      created_at: string;
    }[]>(
      `SELECT id, project_id, scene_id, original_name, relative_path, provider, voice_name,
              duration_seconds, size_bytes, checksum, waveform_json, status, created_at
       FROM audio_clips
       WHERE project_id = $1 AND scene_id = $2
       ORDER BY updated_at DESC LIMIT 1;`,
      [projectId, sceneId],
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    let waveform: number[] = [];
    try {
      waveform = JSON.parse(r.waveform_json);
    } catch {
      waveform = [];
    }
    return {
      id: r.id,
      projectId: r.project_id,
      sceneId: r.scene_id,
      originalName: r.original_name,
      relativePath: r.relative_path,
      absolutePath: "",
      provider: r.provider,
      voiceName: r.voice_name,
      durationSeconds: r.duration_seconds,
      sizeBytes: r.size_bytes,
      checksum: r.checksum,
      waveform,
      status: (r.status as "draft" | "approved") || "draft",
      createdAt: r.created_at,
    };
  }

  static async deleteAudioClip(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM audio_clips WHERE id = $1;", [id]);
  }

  static async approveAudioClip(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("UPDATE audio_clips SET status = 'approved', updated_at = $1 WHERE id = $2;", [new Date().toISOString(), id]);
  }
}

// --- Subtitle Repository ---
export class SubtitleRepository {
  static async saveSubtitles(projectId: string, doc: SubtitleDocument): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO subtitle_documents (id, project_id, title, language, segments_json, style_profile_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         language = excluded.language,
         segments_json = excluded.segments_json,
         style_profile_json = excluded.style_profile_json,
         updated_at = excluded.updated_at;`,
      [
        doc.id,
        projectId,
        doc.title,
        doc.language,
        JSON.stringify(doc.segments),
        JSON.stringify(doc.styleProfile),
        doc.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
  }

  static async getSubtitleDocument(projectId: string): Promise<SubtitleDocument | null> {
    return this.getSubtitles(projectId);
  }

  static async getSubtitles(projectId: string): Promise<SubtitleDocument | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      title: string;
      language: string;
      segments_json: string;
      style_profile_json: string;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, project_id, title, language, segments_json, style_profile_json, created_at, updated_at
       FROM subtitle_documents
       WHERE project_id = $1
       ORDER BY updated_at DESC LIMIT 1;`,
      [projectId],
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      projectId: r.project_id,
      title: r.title,
      language: r.language,
      segments: JSON.parse(r.segments_json),
      styleProfile: JSON.parse(r.style_profile_json),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}

// --- Timeline Repository ---
export class TimelineRepository {
  static async saveTimeline(projectId: string, tracks: TimelineTrack[], clips: TimelineClip[]): Promise<void> {
    await runInTransaction(async (db) => {
      // 1. Save tracks
      for (const track of tracks) {
        await db.execute(
          `INSERT INTO timeline_tracks (id, project_id, track_type, name, track_index, is_visible, is_locked, is_muted, volume, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             track_index = excluded.track_index,
             is_visible = excluded.is_visible,
             is_locked = excluded.is_locked,
             is_muted = excluded.is_muted,
             volume = excluded.volume,
             updated_at = excluded.updated_at;`,
          [
            track.id,
            projectId,
            track.trackType,
            track.name,
            track.trackIndex,
            track.isVisible ? 1 : 0,
            track.isLocked ? 1 : 0,
            track.isMuted ? 1 : 0,
            track.volume,
            track.createdAt || new Date().toISOString(),
            new Date().toISOString(),
          ],
        );
      }

      // 2. Clear previous clips for project and insert fresh clips
      await db.execute("DELETE FROM timeline_clips WHERE project_id = $1;", [projectId]);

      for (const clip of clips) {
        await db.execute(
          `INSERT INTO timeline_clips (id, project_id, track_id, scene_id, name, start_seconds, duration_seconds, source_start_seconds, media_type, asset_id, relative_path, color, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
          [
            clip.id,
            projectId,
            clip.trackId,
            clip.sceneId,
            clip.name,
            clip.startSeconds,
            clip.durationSeconds,
            clip.sourceStartSeconds,
            clip.mediaType,
            clip.assetId,
            clip.relativePath,
            clip.color,
            clip.createdAt || new Date().toISOString(),
            new Date().toISOString(),
          ],
        );
      }
    });
  }

  static async getTimelineDocument(projectId: string): Promise<TimelineDocument> {
    return this.getTimeline(projectId);
  }

  static async saveTracks(tracks: TimelineTrack[]): Promise<void> {
    if (tracks.length === 0) return;
    const projectId = tracks[0].projectId;
    const existing = await this.getTimeline(projectId);
    return this.saveTimeline(projectId, tracks, existing.clips);
  }

  static async saveClips(projectId: string, clips: TimelineClip[]): Promise<void> {
    const existing = await this.getTimeline(projectId);
    return this.saveTimeline(projectId, existing.tracks, clips);
  }

  static async getTimeline(projectId: string): Promise<TimelineDocument> {
    const db = await getDatabase();
    const trackRows = await db.select<{
      id: string;
      project_id: string;
      track_type: string;
      name: string;
      track_index: number;
      is_visible: number;
      is_locked: number;
      is_muted: number;
      volume: number;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, project_id, track_type, name, track_index, is_visible, is_locked, is_muted, volume, created_at, updated_at
       FROM timeline_tracks
       WHERE project_id = $1
       ORDER BY track_index ASC;`,
      [projectId],
    );

    let tracks: TimelineTrack[] = [];
    if (!trackRows || trackRows.length === 0) {
      tracks = createDefaultTracks(projectId);
      await this.saveTimeline(projectId, tracks, []);
    } else {
      tracks = trackRows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        trackType: r.track_type as any,
        name: r.name,
        trackIndex: r.track_index,
        isVisible: r.is_visible === 1,
        isLocked: r.is_locked === 1,
        isMuted: r.is_muted === 1,
        volume: r.volume,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }

    const clipRows = await db.select<{
      id: string;
      project_id: string;
      track_id: string;
      scene_id: string | null;
      name: string;
      start_seconds: number;
      duration_seconds: number;
      source_start_seconds: number;
      media_type: string;
      asset_id: string | null;
      relative_path: string | null;
      color: string;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, project_id, track_id, scene_id, name, start_seconds, duration_seconds, source_start_seconds, media_type, asset_id, relative_path, color, created_at, updated_at
       FROM timeline_clips
       WHERE project_id = $1
       ORDER BY start_seconds ASC;`,
      [projectId],
    );

    const clips: TimelineClip[] = (clipRows || []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      trackId: r.track_id,
      sceneId: r.scene_id,
      name: r.name,
      startSeconds: r.start_seconds,
      durationSeconds: r.duration_seconds,
      sourceStartSeconds: r.source_start_seconds,
      mediaType: r.media_type as any,
      assetId: r.asset_id,
      relativePath: r.relative_path,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const totalDurationSeconds = clips.length > 0
      ? Math.max(...clips.map((c) => c.startSeconds + c.durationSeconds))
      : 0.0;

    return {
      projectId,
      tracks,
      clips,
      totalDurationSeconds,
    };
  }
}

// --- Render Job Repository ---
export class RenderJobRepository {
  static async saveJob(job: RenderJobRecord): Promise<void> {
    return this.saveRenderJob(job);
  }

  static async getJobsForProject(projectId: string): Promise<RenderJobRecord[]> {
    return this.listRenderJobs(projectId);
  }

  static async updateJobStatus(jobId: string, status: "pending" | "rendering" | "completed" | "failed" | "cancelled", progress: number, errorMessage?: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `UPDATE render_jobs SET status = $1, progress = $2, error_message = $3, updated_at = $4 WHERE id = $5;`,
      [status, progress, errorMessage || null, new Date().toISOString(), jobId]
    );
  }

  static async saveRenderJob(job: RenderJobRecord): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO render_jobs (id, project_id, preset, resolution, fps, aspect_ratio, video_codec, audio_codec, output_path, status, progress, duration_seconds, file_size_bytes, error_message, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         progress = excluded.progress,
         duration_seconds = excluded.duration_seconds,
         file_size_bytes = excluded.file_size_bytes,
         error_message = excluded.error_message,
         updated_at = excluded.updated_at;`,
      [
        job.id,
        job.projectId,
        job.preset,
        job.resolution,
        job.fps,
        job.aspectRatio,
        job.videoCodec,
        job.audioCodec,
        job.outputPath,
        job.status,
        job.progress,
        job.durationSeconds,
        job.fileSizeBytes,
        job.errorMessage || null,
        job.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
  }

  static async listRenderJobs(projectId: string): Promise<RenderJobRecord[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      preset: string;
      resolution: string;
      fps: number;
      aspect_ratio: string;
      video_codec: string;
      audio_codec: string;
      output_path: string;
      status: string;
      progress: number;
      duration_seconds: number;
      file_size_bytes: number;
      error_message: string | null;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, project_id, preset, resolution, fps, aspect_ratio, video_codec, audio_codec, output_path, status, progress, duration_seconds, file_size_bytes, error_message, created_at, updated_at
       FROM render_jobs
       WHERE project_id = $1
       ORDER BY updated_at DESC;`,
      [projectId],
    );

    return (rows || []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      preset: r.preset,
      resolution: r.resolution,
      fps: r.fps,
      aspectRatio: r.aspect_ratio,
      videoCodec: r.video_codec,
      audioCodec: r.audio_codec,
      outputPath: r.output_path,
      status: r.status as any,
      progress: r.progress,
      durationSeconds: r.duration_seconds,
      fileSizeBytes: r.file_size_bytes,
      errorMessage: r.error_message || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
}


export class CharacterProfileRepository {
  static async saveProfile(profile: CharacterProfile): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO character_profiles (id, project_id, name, role, appearance_attributes, clothing_continuity, reference_image_path, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         role = excluded.role,
         appearance_attributes = excluded.appearance_attributes,
         clothing_continuity = excluded.clothing_continuity,
         reference_image_path = excluded.reference_image_path,
         updated_at = excluded.updated_at;`,
      [
        profile.id,
        profile.projectId,
        profile.name,
        profile.role,
        profile.appearanceAttributes,
        profile.clothingContinuity,
        profile.referenceImagePath || null,
        profile.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
  }

  static async listProfiles(projectId: string): Promise<CharacterProfile[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      name: string;
      role: string;
      appearance_attributes: string;
      clothing_continuity: string;
      reference_image_path: string | null;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, project_id, name, role, appearance_attributes, clothing_continuity, reference_image_path, created_at, updated_at
       FROM character_profiles
       WHERE project_id = $1
       ORDER BY updated_at DESC;`,
      [projectId],
    );

    return (rows || []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      role: r.role,
      appearanceAttributes: r.appearance_attributes,
      clothingContinuity: r.clothing_continuity,
      referenceImagePath: r.reference_image_path || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  static async deleteProfile(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM character_profiles WHERE id = $1;", [id]);
  }
}

export class VisualAssetRepository {
  static async saveAsset(asset: VisualAsset): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO visual_assets (id, project_id, scene_id, character_id, prompt, negative_prompt, style_preset, aspect_ratio, provider, model, relative_path, original_name, width, height, size_bytes, checksum, motion_preset, is_b_roll, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       ON CONFLICT(id) DO UPDATE SET
         scene_id = excluded.scene_id,
         character_id = excluded.character_id,
         prompt = excluded.prompt,
         negative_prompt = excluded.negative_prompt,
         style_preset = excluded.style_preset,
         aspect_ratio = excluded.aspect_ratio,
         motion_preset = excluded.motion_preset,
         is_b_roll = excluded.is_b_roll,
         status = excluded.status,
         updated_at = excluded.updated_at;`,
      [
        asset.id,
        asset.projectId,
        asset.sceneId || null,
        asset.characterId || null,
        asset.prompt,
        asset.negativePrompt || null,
        asset.stylePreset,
        asset.aspectRatio,
        asset.provider,
        asset.model,
        asset.relativePath,
        asset.originalName,
        asset.width,
        asset.height,
        asset.sizeBytes,
        asset.checksum,
        asset.motionPreset,
        asset.isBRoll ? 1 : 0,
        asset.status,
        asset.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
  }

  static async listAssets(projectId: string): Promise<VisualAsset[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      scene_id: string | null;
      character_id: string | null;
      prompt: string;
      negative_prompt: string | null;
      style_preset: string;
      aspect_ratio: string;
      provider: string;
      model: string;
      relative_path: string;
      original_name: string;
      width: number;
      height: number;
      size_bytes: number;
      checksum: string;
      motion_preset: string;
      is_b_roll: number;
      status: string;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, project_id, scene_id, character_id, prompt, negative_prompt, style_preset, aspect_ratio, provider, model, relative_path, original_name, width, height, size_bytes, checksum, motion_preset, is_b_roll, status, created_at, updated_at
       FROM visual_assets
       WHERE project_id = $1
       ORDER BY updated_at DESC;`,
      [projectId],
    );

    return (rows || []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      sceneId: r.scene_id,
      characterId: r.character_id,
      prompt: r.prompt,
      negativePrompt: r.negative_prompt || undefined,
      stylePreset: r.style_preset,
      aspectRatio: r.aspect_ratio as any,
      provider: r.provider as any,
      model: r.model,
      relativePath: r.relative_path,
      originalName: r.original_name,
      width: r.width,
      height: r.height,
      sizeBytes: r.size_bytes,
      checksum: r.checksum,
      motionPreset: r.motion_preset as any,
      isBRoll: r.is_b_roll === 1,
      status: r.status as any,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  static async getSceneAsset(projectId: string, sceneId: string): Promise<VisualAsset | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      scene_id: string | null;
      character_id: string | null;
      prompt: string;
      negative_prompt: string | null;
      style_preset: string;
      aspect_ratio: string;
      provider: string;
      model: string;
      relative_path: string;
      original_name: string;
      width: number;
      height: number;
      size_bytes: number;
      checksum: string;
      motion_preset: string;
      is_b_roll: number;
      status: string;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, project_id, scene_id, character_id, prompt, negative_prompt, style_preset, aspect_ratio, provider, model, relative_path, original_name, width, height, size_bytes, checksum, motion_preset, is_b_roll, status, created_at, updated_at
       FROM visual_assets
       WHERE project_id = $1 AND scene_id = $2
       ORDER BY updated_at DESC
       LIMIT 1;`,
      [projectId, sceneId],
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      projectId: r.project_id,
      sceneId: r.scene_id,
      characterId: r.character_id,
      prompt: r.prompt,
      negativePrompt: r.negative_prompt || undefined,
      stylePreset: r.style_preset,
      aspectRatio: r.aspect_ratio as any,
      provider: r.provider as any,
      model: r.model,
      relativePath: r.relative_path,
      originalName: r.original_name,
      width: r.width,
      height: r.height,
      sizeBytes: r.size_bytes,
      checksum: r.checksum,
      motionPreset: r.motion_preset as any,
      isBRoll: r.is_b_roll === 1,
      status: r.status as any,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  static async deleteAsset(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM visual_assets WHERE id = $1;", [id]);
  }

  static async assignAssetToScene(assetId: string, sceneId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      "UPDATE visual_assets SET scene_id = $1, updated_at = $2 WHERE id = $3;",
      [sceneId, new Date().toISOString(), assetId]
    );
  }

  static async approveAsset(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      "UPDATE visual_assets SET status = 'approved', updated_at = $1 WHERE id = $2;",
      [new Date().toISOString(), id]
    );
  }
}

// --- Audio Studio Repositories ---
export class AudioLibraryRepository {
  static async saveTrack(track: AudioLibraryTrack): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO audio_library_tracks (
        id, project_id, name, track_type, category, mood, tempo,
        duration_seconds, relative_path, original_name, format,
        license_type, attribution, commercial_use, size_bytes, checksum,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        mood = excluded.mood,
        tempo = excluded.tempo,
        duration_seconds = excluded.duration_seconds,
        relative_path = excluded.relative_path,
        license_type = excluded.license_type,
        attribution = excluded.attribution,
        commercial_use = excluded.commercial_use,
        size_bytes = excluded.size_bytes,
        checksum = excluded.checksum,
        updated_at = excluded.updated_at;`,
      [
        track.id,
        track.projectId || null,
        track.name,
        track.trackType,
        track.category,
        track.mood,
        track.tempo,
        track.durationSeconds,
        track.relativePath,
        track.originalName,
        track.format,
        track.licenseType,
        track.attribution,
        track.commercialUse ? 1 : 0,
        track.sizeBytes,
        track.checksum,
        now,
        now,
      ]
    );
  }

  static async listTracks(projectId?: string): Promise<AudioLibraryTrack[]> {
    const db = await getDatabase();
    let query = `SELECT id, project_id, name, track_type, category, mood, tempo,
                        duration_seconds, relative_path, original_name, format,
                        license_type, attribution, commercial_use, size_bytes, checksum
                 FROM audio_library_tracks`;
    const params: unknown[] = [];
    if (projectId) {
      query += ` WHERE project_id = $1 OR project_id IS NULL ORDER BY updated_at DESC;`;
      params.push(projectId);
    } else {
      query += ` WHERE project_id IS NULL ORDER BY updated_at DESC;`;
    }

    const rows = await db.select<{
      id: string;
      project_id: string | null;
      name: string;
      track_type: string;
      category: string;
      mood: string;
      tempo: string;
      duration_seconds: number;
      relative_path: string;
      original_name: string;
      format: string;
      license_type: string;
      attribution: string;
      commercial_use: number;
      size_bytes: number;
      checksum: string;
    }[]>(query, params);

    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      trackType: r.track_type as any,
      category: r.category as any,
      mood: r.mood,
      tempo: r.tempo as any,
      durationSeconds: r.duration_seconds,
      relativePath: r.relative_path,
      originalName: r.original_name,
      format: r.format,
      licenseType: r.license_type,
      attribution: r.attribution,
      commercialUse: r.commercial_use === 1,
      sizeBytes: r.size_bytes,
      checksum: r.checksum,
    }));
  }

  static async deleteTrack(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM audio_library_tracks WHERE id = $1;", [id]);
  }
}

export class AudioDuckingRepository {
  static async getConfig(projectId: string): Promise<DuckingConfig> {
    const db = await getDatabase();
    const rows = await db.select<{
      project_id: string;
      enabled: number;
      ducking_amount_db: number;
      music_volume: number;
      voice_volume: number;
      sfx_volume: number;
      fade_in_seconds: number;
      fade_out_seconds: number;
      attack_ms: number;
      release_ms: number;
      target_lufs: number;
    }[]>(
      `SELECT project_id, enabled, ducking_amount_db, music_volume, voice_volume, sfx_volume,
              fade_in_seconds, fade_out_seconds, attack_ms, release_ms, target_lufs
       FROM audio_ducking_profiles
       WHERE project_id = $1 LIMIT 1;`,
      [projectId]
    );

    if (!rows || rows.length === 0) {
      return DEFAULT_DUCKING_CONFIG;
    }

    const r = rows[0];
    return {
      enabled: r.enabled === 1,
      duckingAmountDb: r.ducking_amount_db,
      musicVolume: r.music_volume,
      voiceVolume: r.voice_volume,
      sfxVolume: r.sfx_volume,
      fadeInSeconds: r.fade_in_seconds,
      fadeOutSeconds: r.fade_out_seconds,
      attackMs: r.attack_ms,
      releaseMs: r.release_ms,
      targetLufs: r.target_lufs,
    };
  }

  static async saveConfig(projectId: string, config: DuckingConfig): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO audio_ducking_profiles (
        project_id, enabled, ducking_amount_db, music_volume, voice_volume,
        sfx_volume, fade_in_seconds, fade_out_seconds, attack_ms, release_ms,
        target_lufs, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT(project_id) DO UPDATE SET
        enabled = excluded.enabled,
        ducking_amount_db = excluded.ducking_amount_db,
        music_volume = excluded.music_volume,
        voice_volume = excluded.voice_volume,
        sfx_volume = excluded.sfx_volume,
        fade_in_seconds = excluded.fade_in_seconds,
        fade_out_seconds = excluded.fade_out_seconds,
        attack_ms = excluded.attack_ms,
        release_ms = excluded.release_ms,
        target_lufs = excluded.target_lufs,
        updated_at = excluded.updated_at;`,
      [
        projectId,
        config.enabled ? 1 : 0,
        config.duckingAmountDb,
        config.musicVolume,
        config.voiceVolume,
        config.sfxVolume,
        config.fadeInSeconds,
        config.fadeOutSeconds,
        config.attackMs,
        config.releaseMs,
        config.targetLufs,
        new Date().toISOString(),
      ]
    );
  }
}

export class AgentWorkflowRepository {
  static async saveWorkflow(wf: AgentWorkflow): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO agent_workflows (
        id, project_id, title, mode, status, current_step,
        progress_percent, plan_json, step_history_json, last_error,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        mode = excluded.mode,
        status = excluded.status,
        current_step = excluded.current_step,
        progress_percent = excluded.progress_percent,
        plan_json = excluded.plan_json,
        step_history_json = excluded.step_history_json,
        last_error = excluded.last_error,
        updated_at = excluded.updated_at;`,
      [
        wf.id,
        wf.projectId,
        wf.title,
        wf.mode,
        wf.status,
        wf.currentStep,
        wf.progressPercent,
        JSON.stringify(wf.plan),
        JSON.stringify(wf.stepHistory),
        wf.lastError || null,
        wf.createdAt,
        new Date().toISOString(),
      ]
    );
  }

  static async getWorkflow(projectId: string): Promise<AgentWorkflow | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      title: string;
      mode: string;
      status: string;
      current_step: string;
      progress_percent: number;
      plan_json: string;
      step_history_json: string;
      last_error: string | null;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, project_id, title, mode, status, current_step,
              progress_percent, plan_json, step_history_json, last_error,
              created_at, updated_at
       FROM agent_workflows
       WHERE project_id = $1
       ORDER BY updated_at DESC LIMIT 1;`,
      [projectId]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      projectId: r.project_id,
      title: r.title,
      mode: r.mode as any,
      status: r.status as any,
      currentStep: r.current_step as any,
      progressPercent: r.progress_percent,
      plan: JSON.parse(r.plan_json),
      stepHistory: JSON.parse(r.step_history_json),
      lastError: r.last_error || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  static async saveLog(log: AgentLogEntry): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO agent_workflow_logs (id, workflow_id, step, level, message, metadata_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        log.id,
        log.workflowId,
        log.step,
        log.level,
        log.message,
        log.metadata ? JSON.stringify(log.metadata) : null,
        log.createdAt,
      ]
    );
  }

  static async listLogs(workflowId: string): Promise<AgentLogEntry[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      workflow_id: string;
      step: string;
      level: string;
      message: string;
      metadata_json: string | null;
      created_at: string;
    }[]>(
      `SELECT id, workflow_id, step, level, message, metadata_json, created_at
       FROM agent_workflow_logs
       WHERE workflow_id = $1
       ORDER BY created_at ASC;`,
      [workflowId]
    );

    return rows.map((r) => ({
      id: r.id,
      workflowId: r.workflow_id,
      step: r.step as any,
      level: r.level as any,
      message: r.message,
      metadata: r.metadata_json ? JSON.parse(r.metadata_json) : undefined,
      createdAt: r.created_at,
    }));
  }
}

// --- YouTube SEO & Channel Calendar Repositories ---
export class SEORepository {
  static async saveMetadata(meta: SEOMetadata): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO seo_metadata (
        id, project_id, selected_title, title_candidates_json, description,
        chapters_json, tags_json, hashtags_json, thumbnail_text_json,
        urdu_title, urdu_description, target_audience, category_id,
        scheduled_release_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT(project_id) DO UPDATE SET
        selected_title = excluded.selected_title,
        title_candidates_json = excluded.title_candidates_json,
        description = excluded.description,
        chapters_json = excluded.chapters_json,
        tags_json = excluded.tags_json,
        hashtags_json = excluded.hashtags_json,
        thumbnail_text_json = excluded.thumbnail_text_json,
        urdu_title = excluded.urdu_title,
        urdu_description = excluded.urdu_description,
        target_audience = excluded.target_audience,
        category_id = excluded.category_id,
        scheduled_release_at = excluded.scheduled_release_at,
        updated_at = excluded.updated_at;`,
      [
        meta.id,
        meta.projectId,
        meta.selectedTitle,
        JSON.stringify(meta.titleCandidates),
        meta.description,
        JSON.stringify(meta.chapters),
        JSON.stringify(meta.tags),
        JSON.stringify(meta.hashtags),
        JSON.stringify(meta.thumbnailTexts),
        meta.urduTitle || null,
        meta.urduDescription || null,
        meta.targetAudience,
        meta.categoryId,
        meta.scheduledReleaseAt || null,
        meta.createdAt,
        now,
      ]
    );
  }

  static async getMetadata(projectId: string): Promise<SEOMetadata | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      selected_title: string;
      title_candidates_json: string;
      description: string;
      chapters_json: string;
      tags_json: string;
      hashtags_json: string;
      thumbnail_text_json: string;
      urdu_title: string | null;
      urdu_description: string | null;
      target_audience: string;
      category_id: string;
      scheduled_release_at: string | null;
      created_at: string;
      updated_at: string;
    }[]>(
      `SELECT id, project_id, selected_title, title_candidates_json, description,
              chapters_json, tags_json, hashtags_json, thumbnail_text_json,
              urdu_title, urdu_description, target_audience, category_id,
              scheduled_release_at, created_at, updated_at
       FROM seo_metadata
       WHERE project_id = $1 LIMIT 1;`,
      [projectId]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      projectId: r.project_id,
      selectedTitle: r.selected_title,
      titleCandidates: JSON.parse(r.title_candidates_json || "[]"),
      description: r.description,
      chapters: JSON.parse(r.chapters_json || "[]"),
      tags: JSON.parse(r.tags_json || "[]"),
      hashtags: JSON.parse(r.hashtags_json || "[]"),
      thumbnailTexts: JSON.parse(r.thumbnail_text_json || "[]"),
      urduTitle: r.urdu_title || undefined,
      urduDescription: r.urdu_description || undefined,
      targetAudience: r.target_audience,
      categoryId: r.category_id,
      scheduledReleaseAt: r.scheduled_release_at || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}

export class ChannelCalendarRepository {
  static async saveEvent(event: ChannelCalendarEvent): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO channel_calendar_events (
        id, project_id, title, format, status, scheduled_date,
        optimal_time_slot, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        format = excluded.format,
        status = excluded.status,
        scheduled_date = excluded.scheduled_date,
        optimal_time_slot = excluded.optimal_time_slot,
        notes = excluded.notes,
        updated_at = excluded.updated_at;`,
      [
        event.id,
        event.projectId || null,
        event.title,
        event.format,
        event.status,
        event.scheduledDate,
        event.optimalTimeSlot,
        event.notes || null,
        event.createdAt,
        now,
      ]
    );
  }

  static async listEvents(projectId?: string): Promise<ChannelCalendarEvent[]> {
    const db = await getDatabase();
    let query = `SELECT id, project_id, title, format, status, scheduled_date,
                        optimal_time_slot, notes, created_at, updated_at
                 FROM channel_calendar_events`;
    const params: unknown[] = [];
    if (projectId) {
      query += ` WHERE project_id = $1 ORDER BY scheduled_date ASC;`;
      params.push(projectId);
    } else {
      query += ` ORDER BY scheduled_date ASC;`;
    }

    const rows = await db.select<{
      id: string;
      project_id: string | null;
      title: string;
      format: string;
      status: string;
      scheduled_date: string;
      optimal_time_slot: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }[]>(query, params);

    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id || undefined,
      title: r.title,
      format: r.format as any,
      status: r.status as any,
      scheduledDate: r.scheduled_date,
      optimalTimeSlot: r.optimal_time_slot,
      notes: r.notes || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  static async deleteEvent(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM channel_calendar_events WHERE id = $1;", [id]);
  }
}

export class PublishingRepository {
  static async saveJob(job: PublishJobStatus, meta?: PublishVideoRequest): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO publishing_jobs (
        id, project_id, channel_id, video_path, thumbnail_path, title,
        description, privacy_status, tags_json, made_for_kids, category_id,
        youtube_video_id, status, progress_percent, bytes_uploaded, total_bytes,
        error_message, published_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        progress_percent = excluded.progress_percent,
        bytes_uploaded = excluded.bytes_uploaded,
        total_bytes = excluded.total_bytes,
        youtube_video_id = excluded.youtube_video_id,
        error_message = excluded.error_message,
        published_at = excluded.published_at,
        updated_at = excluded.updated_at;`,
      [
        job.id,
        job.projectId,
        job.channelId,
        meta?.videoPath || "",
        meta?.thumbnailPath || null,
        meta?.title || "Untitled Video",
        meta?.description || "",
        meta?.privacyStatus || "private",
        JSON.stringify(meta?.tags || []),
        meta?.madeForKids ? 1 : 0,
        meta?.categoryId || "28",
        job.youtubeVideoId || null,
        job.status,
        job.progressPercent,
        job.bytesUploaded,
        job.totalBytes,
        job.errorMessage || null,
        job.publishedAt || null,
        now,
        now,
      ]
    );
  }

  static async listJobs(projectId: string): Promise<PublishJobStatus[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      channel_id: string;
      status: string;
      progress_percent: number;
      bytes_uploaded: number;
      total_bytes: number;
      youtube_video_id: string | null;
      error_message: string | null;
      published_at: string | null;
    }[]>(
      `SELECT id, project_id, channel_id, status, progress_percent,
              bytes_uploaded, total_bytes, youtube_video_id, error_message, published_at
       FROM publishing_jobs
       WHERE project_id = $1
       ORDER BY updated_at DESC;`,
      [projectId]
    );

    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      channelId: r.channel_id,
      status: r.status as any,
      progressPercent: r.progress_percent,
      bytesUploaded: r.bytes_uploaded,
      totalBytes: r.total_bytes,
      youtubeVideoId: r.youtube_video_id || undefined,
      errorMessage: r.error_message || undefined,
      publishedAt: r.published_at || undefined,
    }));
  }

  static async listAllJobs(limit: number = 20): Promise<PublishJobStatus[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      channel_id: string;
      status: string;
      progress_percent: number;
      bytes_uploaded: number;
      total_bytes: number;
      youtube_video_id: string | null;
      error_message: string | null;
      published_at: string | null;
    }[]>(
      `SELECT id, project_id, channel_id, status, progress_percent,
              bytes_uploaded, total_bytes, youtube_video_id, error_message, published_at
       FROM publishing_jobs
       ORDER BY updated_at DESC
       LIMIT $1;`,
      [limit]
    );

    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      channelId: r.channel_id,
      status: r.status as any,
      progressPercent: r.progress_percent,
      bytesUploaded: r.bytes_uploaded,
      totalBytes: r.total_bytes,
      youtubeVideoId: r.youtube_video_id || undefined,
      errorMessage: r.error_message || undefined,
      publishedAt: r.published_at || undefined,
    }));
  }
}

// --- Analytics Repository ---
export class AnalyticsRepository {
  static async saveSnapshot(snapshot: AnalyticsSnapshot): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO analytics_snapshots (id, project_id, youtube_video_id, views, watch_time_hours, avg_view_duration_seconds, ctr_percent, impressions, likes, comments, shares, subscribers_gained, recorded_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT(id) DO UPDATE SET
         views = excluded.views,
         watch_time_hours = excluded.watch_time_hours,
         avg_view_duration_seconds = excluded.avg_view_duration_seconds,
         ctr_percent = excluded.ctr_percent,
         impressions = excluded.impressions,
         likes = excluded.likes,
         comments = excluded.comments,
         shares = excluded.shares,
         subscribers_gained = excluded.subscribers_gained,
         recorded_at = excluded.recorded_at;`,
      [
        snapshot.id,
        snapshot.projectId,
        snapshot.youtubeVideoId,
        snapshot.views,
        snapshot.watchTimeHours,
        snapshot.avgViewDurationSeconds,
        snapshot.ctrPercent,
        snapshot.impressions,
        snapshot.likes,
        snapshot.comments,
        snapshot.shares,
        snapshot.subscribersGained,
        snapshot.recordedAt,
        snapshot.createdAt,
      ]
    );
  }

  static async getLatestSnapshot(projectId: string): Promise<AnalyticsSnapshot | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      youtube_video_id: string;
      views: number;
      watch_time_hours: number;
      avg_view_duration_seconds: number;
      ctr_percent: number;
      impressions: number;
      likes: number;
      comments: number;
      shares: number;
      subscribers_gained: number;
      recorded_at: string;
      created_at: string;
    }[]>(
      `SELECT id, project_id, youtube_video_id, views, watch_time_hours,
              avg_view_duration_seconds, ctr_percent, impressions, likes,
              comments, shares, subscribers_gained, recorded_at, created_at
       FROM analytics_snapshots
       WHERE project_id = $1
       ORDER BY recorded_at DESC LIMIT 1;`,
      [projectId]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      projectId: r.project_id,
      youtubeVideoId: r.youtube_video_id,
      views: r.views,
      watchTimeHours: r.watch_time_hours,
      avgViewDurationSeconds: r.avg_view_duration_seconds,
      ctrPercent: r.ctr_percent,
      impressions: r.impressions,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      subscribersGained: r.subscribers_gained,
      recordedAt: r.recorded_at,
      createdAt: r.created_at,
    };
  }

  static async saveRetentionCurve(curve: RetentionCurveRecord): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO video_retention_curves (id, snapshot_id, youtube_video_id, retention_points_json, drop_off_points_json, recommendations_json, retention_score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET
         retention_points_json = excluded.retention_points_json,
         drop_off_points_json = excluded.drop_off_points_json,
         recommendations_json = excluded.recommendations_json,
         retention_score = excluded.retention_score;`,
      [
        curve.id,
        curve.snapshotId,
        curve.youtubeVideoId,
        JSON.stringify(curve.retentionPoints),
        JSON.stringify(curve.dropOffPoints),
        JSON.stringify(curve.recommendations),
        curve.retentionScore,
        curve.createdAt,
      ]
    );
  }

  static async getRetentionCurve(videoId: string): Promise<RetentionCurveRecord | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      snapshot_id: string;
      youtube_video_id: string;
      retention_points_json: string;
      drop_off_points_json: string;
      recommendations_json: string;
      retention_score: number;
      created_at: string;
    }[]>(
      `SELECT id, snapshot_id, youtube_video_id, retention_points_json,
              drop_off_points_json, recommendations_json, retention_score, created_at
       FROM video_retention_curves
       WHERE youtube_video_id = $1
       ORDER BY created_at DESC LIMIT 1;`,
      [videoId]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      snapshotId: r.snapshot_id,
      youtubeVideoId: r.youtube_video_id,
      retentionPoints: JSON.parse(r.retention_points_json || "[]"),
      dropOffPoints: JSON.parse(r.drop_off_points_json || "[]"),
      recommendations: JSON.parse(r.recommendations_json || "[]"),
      retentionScore: r.retention_score,
      createdAt: r.created_at,
    };
  }
}

// --- Licensing Repository ---
export class LicensingRepository {
  static async getCurrentLicense(): Promise<UserLicense> {
    try {
      const db = await getDatabase();
      const rows = await db.select<{
        id: string;
        license_key: string;
        tier: string;
        status: string;
        holder_name: string;
        holder_email: string;
        device_id: string;
        max_exports_monthly: number;
        exports_this_month: number;
        max_resolution: string;
        watermark_required: number;
        can_auto_publish: number;
        expires_at: string | null;
        created_at: string;
        updated_at: string;
      }[]>(
        `SELECT id, license_key, tier, status, holder_name, holder_email, device_id,
                max_exports_monthly, exports_this_month, max_resolution, watermark_required,
                can_auto_publish, expires_at, created_at, updated_at
         FROM user_licenses ORDER BY updated_at DESC LIMIT 1;`
      );
      if (!rows || rows.length === 0) {
        return DEFAULT_FREE_LICENSE;
      }
      const r = rows[0];
      return {
        id: r.id,
        licenseKey: r.license_key,
        tier: r.tier as any,
        status: r.status as any,
        holderName: r.holder_name,
        holderEmail: r.holder_email,
        deviceId: r.device_id,
        maxExportsMonthly: r.max_exports_monthly,
        exportsThisMonth: r.exports_this_month,
        maxResolution: r.max_resolution as any,
        watermarkRequired: r.watermark_required === 1,
        canAutoPublish: r.can_auto_publish === 1,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    } catch {
      return DEFAULT_FREE_LICENSE;
    }
  }

  static async saveLicense(license: UserLicense): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO user_licenses (id, license_key, tier, status, holder_name, holder_email, device_id, max_exports_monthly, exports_this_month, max_resolution, watermark_required, can_auto_publish, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT(id) DO UPDATE SET
         license_key = excluded.license_key,
         tier = excluded.tier,
         status = excluded.status,
         holder_name = excluded.holder_name,
         holder_email = excluded.holder_email,
         max_exports_monthly = excluded.max_exports_monthly,
         exports_this_month = excluded.exports_this_month,
         max_resolution = excluded.max_resolution,
         watermark_required = excluded.watermark_required,
         can_auto_publish = excluded.can_auto_publish,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at;`,
      [
        license.id,
        license.licenseKey,
        license.tier,
        license.status,
        license.holderName,
        license.holderEmail,
        license.deviceId,
        license.maxExportsMonthly,
        license.exportsThisMonth,
        license.maxResolution,
        license.watermarkRequired ? 1 : 0,
        license.canAutoPublish ? 1 : 0,
        license.expiresAt,
        license.createdAt,
        license.updatedAt,
      ]
    );
  }

  static async recordUsage(
    metricType: "video_render" | "ai_token" | "tts_second" | "image_gen",
    quantity: number,
    projectId?: string,
  ): Promise<void> {
    const db = await getDatabase();
    const id = `use_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO usage_metering (id, project_id, metric_type, quantity, cost_credits, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [id, projectId || null, metricType, quantity, 0.0, now]
    );
  }
}

// --- Creator Workspace & Channel Profiles Repository ---
export class CreatorWorkspaceRepository {
  static async listProfiles(): Promise<CreatorProfile[]> {
    try {
      const db = await getDatabase();
      const rows = await db.select<{
        id: string;
        name: string;
        handle: string;
        description: string;
        logo_url: string | null;
        banner_url: string | null;
        brand_colors_json: string;
        intro_outro_json: string;
        voice_defaults_json: string;
        video_defaults_json: string;
        seo_defaults_json: string;
        thumbnail_defaults_json: string;
        language_config_json: string;
        is_default: number;
        created_at: string;
        updated_at: string;
      }[]>(`SELECT * FROM creator_profiles ORDER BY is_default DESC, updated_at DESC;`);

      if (rows.length === 0) {
        await this.saveProfile(DEFAULT_LODHI_TECHX_PROFILE);
        return [DEFAULT_LODHI_TECHX_PROFILE];
      }

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        handle: r.handle,
        description: r.description,
        logoUrl: r.logo_url || undefined,
        bannerUrl: r.banner_url || undefined,
        brandColors: JSON.parse(r.brand_colors_json || "{}"),
        introOutro: JSON.parse(r.intro_outro_json || "{}"),
        voiceDefaults: JSON.parse(r.voice_defaults_json || "{}"),
        videoDefaults: JSON.parse(r.video_defaults_json || "{}"),
        seoDefaults: JSON.parse(r.seo_defaults_json || "{}"),
        thumbnailDefaults: JSON.parse(r.thumbnail_defaults_json || "{}"),
        languageConfig: JSON.parse(r.language_config_json || "{}"),
        isDefault: r.is_default === 1,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      return [DEFAULT_LODHI_TECHX_PROFILE];
    }
  }

  static async getProfile(id: string): Promise<CreatorProfile | null> {
    try {
      const db = await getDatabase();
      const rows = await db.select<{
        id: string;
        name: string;
        handle: string;
        description: string;
        logo_url: string | null;
        banner_url: string | null;
        brand_colors_json: string;
        intro_outro_json: string;
        voice_defaults_json: string;
        video_defaults_json: string;
        seo_defaults_json: string;
        thumbnail_defaults_json: string;
        language_config_json: string;
        is_default: number;
        created_at: string;
        updated_at: string;
      }[]>(`SELECT * FROM creator_profiles WHERE id = $1 LIMIT 1;`, [id]);

      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        handle: r.handle,
        description: r.description,
        logoUrl: r.logo_url || undefined,
        bannerUrl: r.banner_url || undefined,
        brandColors: JSON.parse(r.brand_colors_json || "{}"),
        introOutro: JSON.parse(r.intro_outro_json || "{}"),
        voiceDefaults: JSON.parse(r.voice_defaults_json || "{}"),
        videoDefaults: JSON.parse(r.video_defaults_json || "{}"),
        seoDefaults: JSON.parse(r.seo_defaults_json || "{}"),
        thumbnailDefaults: JSON.parse(r.thumbnail_defaults_json || "{}"),
        languageConfig: JSON.parse(r.language_config_json || "{}"),
        isDefault: r.is_default === 1,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    } catch {
      return id === DEFAULT_LODHI_TECHX_PROFILE.id ? DEFAULT_LODHI_TECHX_PROFILE : null;
    }
  }

  static async getDefaultProfile(): Promise<CreatorProfile> {
    const profiles = await this.listProfiles();
    return profiles.find((p) => p.isDefault) || profiles[0] || DEFAULT_LODHI_TECHX_PROFILE;
  }

  static async saveProfile(profile: CreatorProfile): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO creator_profiles (
        id, name, handle, description, logo_url, banner_url,
        brand_colors_json, intro_outro_json, voice_defaults_json,
        video_defaults_json, seo_defaults_json, thumbnail_defaults_json,
        language_config_json, is_default, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        handle = excluded.handle,
        description = excluded.description,
        logo_url = excluded.logo_url,
        banner_url = excluded.banner_url,
        brand_colors_json = excluded.brand_colors_json,
        intro_outro_json = excluded.intro_outro_json,
        voice_defaults_json = excluded.voice_defaults_json,
        video_defaults_json = excluded.video_defaults_json,
        seo_defaults_json = excluded.seo_defaults_json,
        thumbnail_defaults_json = excluded.thumbnail_defaults_json,
        language_config_json = excluded.language_config_json,
        is_default = excluded.is_default,
        updated_at = excluded.updated_at;`,
      [
        profile.id,
        profile.name,
        profile.handle,
        profile.description,
        profile.logoUrl || null,
        profile.bannerUrl || null,
        JSON.stringify(profile.brandColors),
        JSON.stringify(profile.introOutro),
        JSON.stringify(profile.voiceDefaults),
        JSON.stringify(profile.videoDefaults),
        JSON.stringify(profile.seoDefaults),
        JSON.stringify(profile.thumbnailDefaults),
        JSON.stringify(profile.languageConfig),
        profile.isDefault ? 1 : 0,
        profile.createdAt || now,
        now,
      ]
    );
  }

  static async setDefaultProfile(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`UPDATE creator_profiles SET is_default = 0;`);
    await db.execute(`UPDATE creator_profiles SET is_default = 1, updated_at = $1 WHERE id = $2;`, [
      new Date().toISOString(),
      id,
    ]);
  }

  static async deleteProfile(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM creator_profiles WHERE id = $1;`, [id]);
  }

  static async listPresets(profileId?: string): Promise<CreatorPreset[]> {
    try {
      const db = await getDatabase();
      const sql = profileId
        ? `SELECT * FROM creator_presets WHERE profile_id = $1 OR profile_id IS NULL ORDER BY created_at ASC;`
        : `SELECT * FROM creator_presets ORDER BY created_at ASC;`;
      const params = profileId ? [profileId] : [];
      const rows = await db.select<{
        id: string;
        profile_id: string | null;
        name: string;
        category: string;
        format: string;
        default_duration_seconds: number;
        prompt_template: string;
        style_preset: string;
        target_audience: string;
        language_config_json: string;
        created_at: string;
        updated_at: string;
      }[]>(sql, params);

      if (rows.length === 0) {
        return BUILTIN_CREATOR_PRESETS;
      }

      return rows.map((r) => ({
        id: r.id,
        profileId: r.profile_id || undefined,
        name: r.name,
        category: r.category as any,
        format: r.format as any,
        defaultDurationSeconds: r.default_duration_seconds,
        promptTemplate: r.prompt_template,
        stylePreset: r.style_preset,
        targetAudience: r.target_audience,
        languageConfig: JSON.parse(r.language_config_json || "{}"),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      return BUILTIN_CREATOR_PRESETS;
    }
  }

  static async savePreset(preset: CreatorPreset): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO creator_presets (
        id, profile_id, name, category, format, default_duration_seconds,
        prompt_template, style_preset, target_audience, language_config_json,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        format = excluded.format,
        default_duration_seconds = excluded.default_duration_seconds,
        prompt_template = excluded.prompt_template,
        style_preset = excluded.style_preset,
        target_audience = excluded.target_audience,
        language_config_json = excluded.language_config_json,
        updated_at = excluded.updated_at;`,
      [
        preset.id,
        preset.profileId || null,
        preset.name,
        preset.category,
        preset.format,
        preset.defaultDurationSeconds,
        preset.promptTemplate,
        preset.stylePreset,
        preset.targetAudience,
        JSON.stringify(preset.languageConfig),
        preset.createdAt || now,
        now,
      ]
    );
  }

  static async deletePreset(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM creator_presets WHERE id = $1;`, [id]);
  }
}

// --- Safe Browser Data Migration ---
// Migrates existing browser localStorage data to SQLite WITHOUT deleting original localStorage data.
export async function migrateBrowserDataToSQLite(
  projectId: string,
  storage: Storage = window.localStorage,
): Promise<{ migrated: string[]; skipped: string[] }> {
  const migrated: string[] = [];
  const skipped: string[] = [];

  // 1. Settings
  try {
    const rawSettings = storage.getItem("ai-youtube-studio.settings");
    if (rawSettings) {
      const existing = await SettingsRepository.getSettings();
      if (!existing) {
        const settings = normalizeStudioSettings(JSON.parse(rawSettings));
        await SettingsRepository.saveSettings(settings);
        migrated.push("settings");
      } else {
        skipped.push("settings (already in SQLite)");
      }
    }
  } catch {
    skipped.push("settings (failed parse)");
  }

  // 2. Providers
  try {
    const rawProvider = storage.getItem("ai-youtube-studio.providers");
    if (rawProvider) {
      const parsed = restoreProviderConfig(JSON.parse(rawProvider));
      const existing = await ProviderConfigRepository.getProviderConfig(parsed.provider);
      if (!existing) {
        await ProviderConfigRepository.saveProviderConfig(parsed);
        migrated.push(`provider:${parsed.provider}`);
      } else {
        skipped.push(`provider:${parsed.provider} (already in SQLite)`);
      }
    }
  } catch {
    skipped.push("providers (failed parse)");
  }

  // If a project is selected, migrate project-scoped data
  if (projectId) {
    // 3. Research
    try {
      const rawResearch = storage.getItem("ai-youtube-studio.research");
      if (rawResearch) {
        const existing = await ResearchRepository.getResearch(projectId);
        if (!existing) {
          const brief = JSON.parse(rawResearch) as ResearchBrief;
          await ResearchRepository.saveResearch(projectId, brief);
          migrated.push("research");
        } else {
          skipped.push("research (already in SQLite)");
        }
      }
    } catch {
      skipped.push("research (failed parse)");
    }

    // 4. Script
    try {
      const rawScript = storage.getItem("ai-youtube-studio.script");
      if (rawScript) {
        const existing = await ScriptRepository.getScript(projectId);
        if (!existing) {
          const doc = JSON.parse(rawScript) as ScriptDocument;
          await ScriptRepository.saveScript(projectId, doc);
          migrated.push("script");
        } else {
          skipped.push("script (already in SQLite)");
        }
      }
    } catch {
      skipped.push("script (failed parse)");
    }

    // 5. Storyboard
    try {
      const rawSb = storage.getItem("ai-youtube-studio.storyboard");
      if (rawSb) {
        const existing = await StoryboardRepository.getStoryboard(projectId);
        if (!existing) {
          const doc = JSON.parse(rawSb) as StoryboardDocument;
          await StoryboardRepository.saveStoryboard(projectId, doc);
          migrated.push("storyboard");
        } else {
          skipped.push("storyboard (already in SQLite)");
        }
      }
    } catch {
      skipped.push("storyboard (failed parse)");
    }

    // 6. Visual style
    try {
      const rawStyle = storage.getItem("ai-youtube-studio.visual-style");
      if (rawStyle) {
        const existing = await VisualStyleRepository.getVisualStyle(projectId);
        if (!existing) {
          const profile = JSON.parse(rawStyle) as VisualStyleProfile;
          await VisualStyleRepository.saveVisualStyle(projectId, profile);
          migrated.push("visual_style");
        } else {
          skipped.push("visual_style (already in SQLite)");
        }
      }
    } catch {
      skipped.push("visual_style (failed parse)");
    }

    // 7. Media
    try {
      const rawMedia = storage.getItem("ai-youtube-studio.media");
      if (rawMedia) {
        const assets = JSON.parse(rawMedia) as MediaAsset[];
        if (Array.isArray(assets) && assets.length > 0) {
          const existingMedia = await MediaRepository.listMediaAssets(projectId);
          const existingIds = new Set(existingMedia.map((m) => m.id));
          let count = 0;
          for (const asset of assets) {
            if (!existingIds.has(asset.id)) {
              await MediaRepository.addMediaAsset({ ...asset, projectId });
              count++;
            }
          }
          if (count > 0) {
            migrated.push(`media (${count} assets)`);
          } else {
            skipped.push("media (all assets already exist)");
          }
        }
      }
    } catch {
      skipped.push("media (failed parse)");
    }
  }

  // Stamp migration record in storage WITHOUT deleting original data!
  storage.setItem("ai-youtube-studio.migrated-at", new Date().toISOString());

  return { migrated, skipped };
}

// Helpers
function parseSizeBytes(str?: string): number {
  if (!str) return 0;
  const match = str.match(/([\d.]+)\s*(B|KB|MB|GB)/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "GB") return Math.round(num * 1024 * 1024 * 1024);
  if (unit === "MB") return Math.round(num * 1024 * 1024);
  if (unit === "KB") return Math.round(num * 1024);
  return Math.round(num);
}

function inferMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "text/plain";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

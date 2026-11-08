# Database schema

Schema changes are versioned and registered with the Tauri SQL plugin. Migration SQL lives in `src-tauri/migrations`.

## Migration 1: projects

| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | Primary key, required |
| `name` | TEXT | Required, trimmed length 1–100 |
| `topic` | TEXT | Required, trimmed length 1–500 |
| `language` | TEXT | Required |
| `status` | TEXT | `draft`, `in_progress`, or `completed`; defaults to `draft` |
| `created_at` | TEXT | Required ISO-8601 timestamp |
| `updated_at` | TEXT | Required ISO-8601 timestamp |

An index orders projects by `updated_at` descending.

## Migration 2: project production data

Migration `0002_create_production_data.sql` adds the project-scoped tables:
- `research_items`: Project-scoped research briefs with structured JSON payload and timestamp.
- `scripts`: Script metadata, title, language, format, current version pointer, and timestamps.
- `script_versions`: Immutable revision history for each script with cascade delete on parent script.
- `visual_style_profiles`: Project-scoped visual art styles, palettes, character descriptions, and locking constraints.
- `media_assets`: Physical media records with original filename, relative path, MIME type, byte size, width/height dimensions, SHA-256 checksum, missing flags, and tags. Enforces unique constraint on `(project_id, checksum)`.
- `storyboards`: Storyboard metadata, format, style profile link (`ON DELETE SET NULL`), and current version pointer.
- `storyboard_versions`: Immutable scene snapshot revisions for storyboards.
- `scenes`: Ordered scene sequence with scene numbers, visual prompts, narrations, directions, and statuses. Enforces unique `(storyboard_id, scene_number)`.
- `scene_assets`: Many-to-many relationship linking scenes to media assets with role definitions.
- `workflow_jobs`: Background jobs and task tracking.
- `provider_configs`: Global AI provider configuration (model, enabled) strictly excluding secrets.
- `app_settings`: Global application settings.

## Production Repositories & Transaction Boundaries

The following project-scoped CRUD repositories are fully implemented and verified in `src/lib/repositories.ts`:
- `ResearchRepository`: Project-scoped brief saving, retrieval, listing, and deletion.
- `ScriptRepository`: Atomic script and version history persistence inside `BEGIN TRANSACTION ... COMMIT/ROLLBACK`.
- `StoryboardRepository`: Atomic multi-entity storyboard, scene list, and snapshot version persistence within transaction boundaries.
- `VisualStyleRepository`: Visual style profile management with project scoping.
- `MediaRepository`: Native media asset tracking, disk existence verification, duplicate detection by SHA-256 checksum, and missing flag updates.
- `ProviderConfigRepository`: Non-secret AI provider configuration.
- `SettingsRepository`: Studio configuration persistence.
- `AudioClipRepository`: Scene-wise and full narration audio clip persistence with waveform, checksum, duration, and approval status tracking.
- `SubtitleRepository`: Project subtitle documents persistence with timed segments, style profiles, and version snapshots.

## Migration 3: voice and subtitles

Migration `0003_create_voice_and_subtitles.sql` adds tables for Stage B Voice and Subtitle Studios:
- `audio_clips`:
  - `id`: TEXT PRIMARY KEY NOT NULL
  - `project_id`: TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  - `scene_id`: TEXT REFERENCES scenes(id) ON DELETE SET NULL
  - `original_name`: TEXT NOT NULL
  - `relative_path`: TEXT NOT NULL
  - `provider`: TEXT NOT NULL (`gemini` or `native`)
  - `voice_name`: TEXT NOT NULL
  - `duration_seconds`: REAL NOT NULL CHECK (duration_seconds >= 0)
  - `size_bytes`: INTEGER NOT NULL CHECK (size_bytes >= 0)
  - `checksum`: TEXT NOT NULL (SHA-256)
  - `waveform_json`: TEXT NOT NULL DEFAULT '[]'
  - `status`: TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved'))
  - `created_at`: TEXT NOT NULL ISO-8601
  - `updated_at`: TEXT NOT NULL ISO-8601
  - Composite Index: `idx_audio_clips_project_scene` ON `audio_clips (project_id, scene_id, updated_at DESC)`.

- `subtitle_documents`:
  - `id`: TEXT PRIMARY KEY NOT NULL
  - `project_id`: TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  - `title`: TEXT NOT NULL
  - `language`: TEXT NOT NULL
  - `segments_json`: TEXT NOT NULL
  - `style_profile_json`: TEXT NOT NULL
  - `created_at`: TEXT NOT NULL ISO-8601
  - `updated_at`: TEXT NOT NULL ISO-8601
  - Composite Index: `idx_subtitles_project_updated` ON `subtitle_documents (project_id, updated_at DESC)`.

## Safe Browser Data Migration

A non-destructive migration utility `migrateBrowserDataToSQLite(projectId, storage)` is integrated:
- Detects legacy browser `localStorage` records for research, scripts, storyboards, styles, media, provider configs, and settings.
- Inserts existing records into SQLite scoped to the active project.
- **Safety guarantee:** Leaves the original `localStorage` data completely intact (does not delete original browser data).
- Idempotent: checks SQLite existence before writing, preventing duplication or constraint violations.
- Records migration completion with timestamp `ai-youtube-studio.migrated-at`.

## Migration 4: timeline and video render jobs

Migration `0004_create_timeline_and_render.sql` adds tables for Stage C Professional Video Timeline & FFmpeg Engine:
- `timeline_tracks`:
  - `id`: TEXT PRIMARY KEY NOT NULL
  - `project_id`: TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  - `track_type`: TEXT NOT NULL CHECK (track_type IN ('video', 'image', 'voice', 'music', 'sfx', 'subtitle', 'overlay'))
  - `name`: TEXT NOT NULL
  - `track_index`: INTEGER NOT NULL DEFAULT 0
  - `is_visible`: INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1))
  - `is_locked`: INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1))
  - `is_muted`: INTEGER NOT NULL DEFAULT 0 CHECK (is_muted IN (0, 1))
  - `volume`: REAL NOT NULL DEFAULT 1.0 CHECK (volume >= 0.0 AND volume <= 2.0)
  - `created_at`: TEXT NOT NULL ISO-8601
  - `updated_at`: TEXT NOT NULL ISO-8601
  - Composite Index: `idx_timeline_tracks_project_index` ON `timeline_tracks (project_id, track_index ASC)`.

- `timeline_clips`:
  - `id`: TEXT PRIMARY KEY NOT NULL
  - `project_id`: TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  - `track_id`: TEXT NOT NULL REFERENCES timeline_tracks(id) ON DELETE CASCADE
  - `scene_id`: TEXT REFERENCES scenes(id) ON DELETE SET NULL
  - `name`: TEXT NOT NULL
  - `start_seconds`: REAL NOT NULL DEFAULT 0.0 CHECK (start_seconds >= 0.0)
  - `duration_seconds`: REAL NOT NULL CHECK (duration_seconds > 0.0)
  - `source_start_seconds`: REAL NOT NULL DEFAULT 0.0 CHECK (source_start_seconds >= 0.0)
  - `media_type`: TEXT NOT NULL CHECK (media_type IN ('video', 'image', 'audio', 'subtitle', 'color'))
  - `asset_id`: TEXT REFERENCES media_assets(id) ON DELETE SET NULL
  - `relative_path`: TEXT
  - `color`: TEXT NOT NULL DEFAULT '#3b82f6'
  - `created_at`: TEXT NOT NULL ISO-8601
  - `updated_at`: TEXT NOT NULL ISO-8601
  - Composite Index: `idx_timeline_clips_project_track_start` ON `timeline_clips (project_id, track_id, start_seconds ASC)`.

- `render_jobs`:
  - `id`: TEXT PRIMARY KEY NOT NULL
  - `project_id`: TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  - `preset`: TEXT NOT NULL
  - `resolution`: TEXT NOT NULL
  - `fps`: INTEGER NOT NULL
  - `aspect_ratio`: TEXT NOT NULL
  - `video_codec`: TEXT NOT NULL
  - `audio_codec`: TEXT NOT NULL
  - `output_path`: TEXT NOT NULL
  - `status`: TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rendering', 'completed', 'failed', 'cancelled'))
  - `progress`: REAL NOT NULL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 100.0)
  - `duration_seconds`: REAL NOT NULL DEFAULT 0.0
  - `file_size_bytes`: INTEGER NOT NULL DEFAULT 0
  - `error_message`: TEXT
  - `created_at`: TEXT NOT NULL ISO-8601
  - `updated_at`: TEXT NOT NULL ISO-8601
  - Composite Index: `idx_render_jobs_project_created` ON `render_jobs (project_id, created_at DESC)`.

## Migration 5: visual asset studio and character consistency

Migration `0005_create_visual_studio.sql` adds tables for Stage D AI Visual Asset Studio:
- `character_profiles`:
  - `id`: TEXT PRIMARY KEY NOT NULL
  - `project_id`: TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  - `name`: TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100)
  - `role`: TEXT NOT NULL DEFAULT 'Protagonist'
  - `appearance_attributes`: TEXT NOT NULL
  - `clothing_continuity`: TEXT NOT NULL
  - `reference_image_path`: TEXT
  - `created_at`: TEXT NOT NULL ISO-8601
  - `updated_at`: TEXT NOT NULL ISO-8601
  - Index: `idx_character_profiles_project` ON `character_profiles (project_id, updated_at DESC)`.

- `visual_assets`:
  - `id`: TEXT PRIMARY KEY NOT NULL
  - `project_id`: TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  - `scene_id`: TEXT REFERENCES scenes(id) ON DELETE SET NULL
  - `character_id`: TEXT REFERENCES character_profiles(id) ON DELETE SET NULL
  - `prompt`: TEXT NOT NULL
  - `negative_prompt`: TEXT
  - `style_preset`: TEXT NOT NULL DEFAULT 'cinematic'
  - `aspect_ratio`: TEXT NOT NULL DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16', '1:1'))
  - `provider`: TEXT NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini', 'local'))
  - `model`: TEXT NOT NULL DEFAULT 'imagen-3.0-generate-002'
  - `relative_path`: TEXT NOT NULL
  - `original_name`: TEXT NOT NULL
  - `width`: INTEGER NOT NULL CHECK (width > 0)
  - `height`: INTEGER NOT NULL CHECK (height > 0)
  - `size_bytes`: INTEGER NOT NULL CHECK (size_bytes >= 0)
  - `checksum`: TEXT NOT NULL
  - `motion_preset`: TEXT NOT NULL DEFAULT 'zoom_in' CHECK (motion_preset IN ('zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'static'))
  - `is_b_roll`: INTEGER NOT NULL DEFAULT 0 CHECK (is_b_roll IN (0, 1))
  - `status`: TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved'))
  - `created_at`: TEXT NOT NULL ISO-8601
  - `updated_at`: TEXT NOT NULL ISO-8601
  - Unique Constraint: `UNIQUE (project_id, checksum)`
  - Composite Indexes:
    - `idx_visual_assets_project_scene` ON `visual_assets (project_id, scene_id, updated_at DESC)`
    - `idx_visual_assets_project_b_roll` ON `visual_assets (project_id, is_b_roll, updated_at DESC)`

## Remaining entities

Channels, upload history, analytics snapshots, audio tracks (music/sfx), publishing records, and detailed workflow events remain for subsequent stages. Credentials must remain outside SQLite fields at all times in Windows Credential Manager.

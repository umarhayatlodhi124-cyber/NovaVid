-- Migration 4: Timeline tracks, clips, and render jobs for Stage C

CREATE TABLE IF NOT EXISTS timeline_tracks (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    track_type TEXT NOT NULL CHECK (track_type IN ('video', 'image', 'voice', 'music', 'sfx', 'subtitle', 'overlay')),
    name TEXT NOT NULL,
    track_index INTEGER NOT NULL,
    is_visible INTEGER NOT NULL DEFAULT 1,
    is_locked INTEGER NOT NULL DEFAULT 0,
    is_muted INTEGER NOT NULL DEFAULT 0,
    volume REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timeline_tracks_project
    ON timeline_tracks (project_id, track_index ASC);

CREATE TABLE IF NOT EXISTS timeline_clips (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL REFERENCES timeline_tracks(id) ON DELETE CASCADE,
    scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    start_seconds REAL NOT NULL CHECK (start_seconds >= 0),
    duration_seconds REAL NOT NULL CHECK (duration_seconds > 0),
    source_start_seconds REAL NOT NULL DEFAULT 0 CHECK (source_start_seconds >= 0),
    media_type TEXT NOT NULL CHECK (media_type IN ('video', 'image', 'audio', 'subtitle', 'color')),
    asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
    relative_path TEXT,
    color TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timeline_clips_project_track
    ON timeline_clips (project_id, track_id, start_seconds ASC);

CREATE TABLE IF NOT EXISTS render_jobs (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    preset TEXT NOT NULL,
    resolution TEXT NOT NULL,
    fps INTEGER NOT NULL,
    aspect_ratio TEXT NOT NULL,
    video_codec TEXT NOT NULL,
    audio_codec TEXT NOT NULL,
    output_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rendering', 'completed', 'failed', 'cancelled')),
    progress REAL NOT NULL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 100.0),
    duration_seconds REAL DEFAULT 0.0,
    file_size_bytes INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_project
    ON render_jobs (project_id, updated_at DESC);

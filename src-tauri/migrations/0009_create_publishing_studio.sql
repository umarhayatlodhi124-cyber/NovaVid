-- Migration 0009: YouTube OAuth 2.0, Channels, and Publishing Upload Jobs

CREATE TABLE IF NOT EXISTS youtube_channels (
    id TEXT PRIMARY KEY NOT NULL,
    channel_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    custom_url TEXT,
    avatar_url TEXT,
    subscriber_count INTEGER NOT NULL DEFAULT 0,
    video_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_active
    ON youtube_channels (is_active, updated_at DESC);

CREATE TABLE IF NOT EXISTS publishing_jobs (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    video_path TEXT NOT NULL,
    thumbnail_path TEXT,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
    description TEXT NOT NULL DEFAULT '',
    privacy_status TEXT NOT NULL CHECK (privacy_status IN ('private', 'unlisted', 'public')),
    tags_json TEXT NOT NULL DEFAULT '[]',
    made_for_kids INTEGER NOT NULL DEFAULT 0 CHECK (made_for_kids IN (0, 1)),
    category_id TEXT NOT NULL DEFAULT '28',
    youtube_video_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percent REAL NOT NULL DEFAULT 0.0 CHECK (progress_percent >= 0.0 AND progress_percent <= 100.0),
    bytes_uploaded INTEGER NOT NULL DEFAULT 0,
    total_bytes INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publishing_jobs_project
    ON publishing_jobs (project_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_publishing_jobs_status
    ON publishing_jobs (status, updated_at DESC);

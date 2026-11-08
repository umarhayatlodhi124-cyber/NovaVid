-- Migration 0010: Analytics Snapshots and Video Audience Retention Intelligence

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL,
    views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
    watch_time_hours REAL NOT NULL DEFAULT 0.0 CHECK (watch_time_hours >= 0.0),
    avg_view_duration_seconds REAL NOT NULL DEFAULT 0.0 CHECK (avg_view_duration_seconds >= 0.0),
    ctr_percent REAL NOT NULL DEFAULT 0.0 CHECK (ctr_percent >= 0.0 AND ctr_percent <= 100.0),
    impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
    likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
    comments INTEGER NOT NULL DEFAULT 0 CHECK (comments >= 0),
    shares INTEGER NOT NULL DEFAULT 0 CHECK (shares >= 0),
    subscribers_gained INTEGER NOT NULL DEFAULT 0,
    recorded_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_project
    ON analytics_snapshots (project_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_video
    ON analytics_snapshots (youtube_video_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS video_retention_curves (
    id TEXT PRIMARY KEY NOT NULL,
    snapshot_id TEXT NOT NULL REFERENCES analytics_snapshots(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL,
    retention_points_json TEXT NOT NULL DEFAULT '[]',
    drop_off_points_json TEXT NOT NULL DEFAULT '[]',
    recommendations_json TEXT NOT NULL DEFAULT '[]',
    retention_score REAL NOT NULL DEFAULT 0.0 CHECK (retention_score >= 0.0 AND retention_score <= 100.0),
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retention_curves_video
    ON video_retention_curves (youtube_video_id, created_at DESC);

-- Migration 0008: YouTube SEO, Metadata, Chapters, and Channel Calendar

CREATE TABLE IF NOT EXISTS seo_metadata (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    selected_title TEXT NOT NULL CHECK (length(trim(selected_title)) BETWEEN 1 AND 100),
    title_candidates_json TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL CHECK (length(description) <= 5000),
    chapters_json TEXT NOT NULL DEFAULT '[]',
    tags_json TEXT NOT NULL DEFAULT '[]',
    hashtags_json TEXT NOT NULL DEFAULT '[]',
    thumbnail_text_json TEXT NOT NULL DEFAULT '[]',
    urdu_title TEXT,
    urdu_description TEXT,
    target_audience TEXT NOT NULL DEFAULT 'general',
    category_id TEXT NOT NULL DEFAULT '28',
    scheduled_release_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seo_metadata_project
    ON seo_metadata (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS channel_calendar_events (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
    format TEXT NOT NULL CHECK (format IN ('Shorts', 'Long-form', 'Explainer')),
    status TEXT NOT NULL CHECK (status IN ('planned', 'in_production', 'ready', 'published')),
    scheduled_date TEXT NOT NULL,
    optimal_time_slot TEXT NOT NULL DEFAULT '18:00',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_scheduled_date
    ON channel_calendar_events (scheduled_date ASC);

-- Migration 0012: Creator Workspace, Multi-Channel Profiles, and Production Presets

CREATE TABLE IF NOT EXISTS creator_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    handle TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    logo_url TEXT,
    banner_url TEXT,
    brand_colors_json TEXT NOT NULL DEFAULT '{"primary":"#3b82f6","accent":"#10b981","background":"#0f172a"}',
    intro_outro_json TEXT NOT NULL DEFAULT '{"hasIntro":false,"hasOutro":false,"introDurationSeconds":0,"outroDurationSeconds":0}',
    voice_defaults_json TEXT NOT NULL DEFAULT '{"voiceId":"default","pace":1.0,"pitch":1.0,"provider":"sapi"}',
    video_defaults_json TEXT NOT NULL DEFAULT '{"format":"Long-form","aspectRatio":"16:9","resolution":"1080p","fps":60,"defaultDurationSeconds":300}',
    seo_defaults_json TEXT NOT NULL DEFAULT '{"defaultTags":[],"categoryId":"28","defaultDescriptionTemplate":"","callToAction":""}',
    thumbnail_defaults_json TEXT NOT NULL DEFAULT '{"style":"Cinematic","overlayTextPattern":"{title}","primaryColor":"#ffffff","accentColor":"#f59e0b"}',
    language_config_json TEXT NOT NULL DEFAULT '{"research":"English","script":"English","voice":"English","subtitles":"English","titleDescription":"English","thumbnailText":"English"}',
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_default
    ON creator_profiles (is_default, updated_at DESC);

CREATE TABLE IF NOT EXISTS creator_presets (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT REFERENCES creator_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    category TEXT NOT NULL CHECK (category IN ('tech_tutorial', 'ai_tools', 'software_demo', 'educational', 'product_review', 'news_updates', 'explainer')),
    format TEXT NOT NULL CHECK (format IN ('Shorts', 'Long-form', 'Explainer')),
    default_duration_seconds INTEGER NOT NULL DEFAULT 60,
    prompt_template TEXT NOT NULL DEFAULT '',
    style_preset TEXT NOT NULL DEFAULT 'Cinematic Cinema',
    target_audience TEXT NOT NULL DEFAULT 'tech_enthusiasts',
    language_config_json TEXT NOT NULL DEFAULT '{"research":"English","script":"English","voice":"English","subtitles":"English","titleDescription":"English","thumbnailText":"English"}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_presets_profile
    ON creator_presets (profile_id, category);

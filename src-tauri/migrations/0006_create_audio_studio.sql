-- Migration 0006: Audio Studio, Background Music Library, SFX, and Dynamic Ducking Profiles

CREATE TABLE IF NOT EXISTS audio_library_tracks (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
    track_type TEXT NOT NULL CHECK (track_type IN ('music', 'sfx', 'ambient')),
    category TEXT NOT NULL CHECK (category IN ('Cinematic', 'Documentary', 'Technology', 'Emotional', 'Inspirational', 'Educational', 'Ambient', 'Corporate', 'Transitions', 'Impacts', 'UI')),
    mood TEXT NOT NULL DEFAULT 'neutral',
    tempo TEXT NOT NULL DEFAULT 'medium' CHECK (tempo IN ('slow', 'medium', 'fast')),
    duration_seconds REAL NOT NULL CHECK (duration_seconds > 0),
    relative_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'wav',
    license_type TEXT NOT NULL DEFAULT 'Creative Commons / Royalty-Free',
    attribution TEXT NOT NULL DEFAULT 'NovaVid Audio Studio',
    commercial_use INTEGER NOT NULL DEFAULT 1 CHECK (commercial_use IN (0, 1)),
    size_bytes INTEGER NOT NULL DEFAULT 0,
    checksum TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audio_library_type_category
    ON audio_library_tracks (track_type, category, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_library_project
    ON audio_library_tracks (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS audio_ducking_profiles (
    project_id TEXT PRIMARY KEY NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    ducking_amount_db REAL NOT NULL DEFAULT -14.0,
    music_volume REAL NOT NULL DEFAULT 0.25 CHECK (music_volume >= 0.0 AND music_volume <= 2.0),
    voice_volume REAL NOT NULL DEFAULT 1.0 CHECK (voice_volume >= 0.0 AND voice_volume <= 2.0),
    sfx_volume REAL NOT NULL DEFAULT 0.8 CHECK (sfx_volume >= 0.0 AND sfx_volume <= 2.0),
    fade_in_seconds REAL NOT NULL DEFAULT 1.0 CHECK (fade_in_seconds >= 0.0),
    fade_out_seconds REAL NOT NULL DEFAULT 2.0 CHECK (fade_out_seconds >= 0.0),
    attack_ms INTEGER NOT NULL DEFAULT 100 CHECK (attack_ms >= 10),
    release_ms INTEGER NOT NULL DEFAULT 400 CHECK (release_ms >= 50),
    target_lufs REAL NOT NULL DEFAULT -14.0,
    updated_at TEXT NOT NULL
);

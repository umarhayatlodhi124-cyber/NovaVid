-- Migration 0005: Visual Asset Studio and Character Consistency Profiles

CREATE TABLE IF NOT EXISTS character_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    role TEXT NOT NULL DEFAULT 'Protagonist',
    appearance_attributes TEXT NOT NULL,
    clothing_continuity TEXT NOT NULL,
    reference_image_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_character_profiles_project
    ON character_profiles (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS visual_assets (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
    character_id TEXT REFERENCES character_profiles(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    style_preset TEXT NOT NULL DEFAULT 'cinematic',
    aspect_ratio TEXT NOT NULL DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16', '1:1')),
    provider TEXT NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini', 'local')),
    model TEXT NOT NULL DEFAULT 'imagen-3.0-generate-002',
    relative_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    checksum TEXT NOT NULL,
    motion_preset TEXT NOT NULL DEFAULT 'zoom_in' CHECK (motion_preset IN ('zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'static')),
    is_b_roll INTEGER NOT NULL DEFAULT 0 CHECK (is_b_roll IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (project_id, checksum)
);

CREATE INDEX IF NOT EXISTS idx_visual_assets_project_scene
    ON visual_assets (project_id, scene_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_visual_assets_project_b_roll
    ON visual_assets (project_id, is_b_roll, updated_at DESC);

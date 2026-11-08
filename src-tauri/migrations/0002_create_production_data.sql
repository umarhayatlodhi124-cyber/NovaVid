CREATE TABLE IF NOT EXISTS research_items (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    topic TEXT NOT NULL CHECK (length(trim(topic)) BETWEEN 1 AND 500),
    language TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_research_project_created
    ON research_items (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
    language TEXT NOT NULL,
    format TEXT NOT NULL,
    content TEXT NOT NULL,
    current_version_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scripts_project_updated
    ON scripts (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS script_versions (
    id TEXT PRIMARY KEY NOT NULL,
    script_id TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_script_versions_script_created
    ON script_versions (script_id, created_at DESC);

CREATE TABLE IF NOT EXISTS visual_style_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    profile_json TEXT NOT NULL,
    locked INTEGER NOT NULL DEFAULT 1 CHECK (locked IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visual_styles_project_updated
    ON visual_style_profiles (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'document')),
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    width INTEGER,
    height INTEGER,
    duration_seconds REAL,
    checksum TEXT,
    missing INTEGER NOT NULL DEFAULT 0 CHECK (missing IN (0, 1)),
    tags_json TEXT NOT NULL DEFAULT '[]',
    imported_at TEXT NOT NULL,
    UNIQUE (project_id, checksum)
);

CREATE INDEX IF NOT EXISTS idx_media_assets_project_type
    ON media_assets (project_id, media_type, imported_at DESC);

CREATE TABLE IF NOT EXISTS storyboards (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    format TEXT NOT NULL,
    style_profile_id TEXT REFERENCES visual_style_profiles(id) ON DELETE SET NULL,
    current_version_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_storyboards_project_updated
    ON storyboards (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS storyboard_versions (
    id TEXT PRIMARY KEY NOT NULL,
    storyboard_id TEXT NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    scene_snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_storyboard_versions_storyboard_created
    ON storyboard_versions (storyboard_id, created_at DESC);

CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY NOT NULL,
    storyboard_id TEXT NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL CHECK (scene_number > 0),
    title TEXT NOT NULL,
    narration TEXT NOT NULL,
    duration_seconds REAL NOT NULL CHECK (duration_seconds > 0),
    visual_description TEXT NOT NULL,
    visual_prompt TEXT NOT NULL,
    camera_direction TEXT NOT NULL,
    transition_type TEXT NOT NULL,
    music_suggestion TEXT NOT NULL DEFAULT '',
    sound_suggestion TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('pending', 'generated', 'imported', 'approved')),
    UNIQUE (storyboard_id, scene_number)
);

CREATE INDEX IF NOT EXISTS idx_scenes_storyboard_order
    ON scenes (storyboard_id, scene_number);

CREATE TABLE IF NOT EXISTS scene_assets (
    scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'visual',
    assigned_at TEXT NOT NULL,
    PRIMARY KEY (scene_id, asset_id, role)
);

CREATE TABLE IF NOT EXISTS provider_configs (
    provider TEXT PRIMARY KEY NOT NULL CHECK (provider IN ('gemini', 'claude')),
    model TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_jobs (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    state TEXT NOT NULL,
    progress REAL NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 1),
    payload_json TEXT NOT NULL DEFAULT '{}',
    error_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_project_state
    ON workflow_jobs (project_id, state, updated_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key TEXT PRIMARY KEY NOT NULL,
    setting_value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

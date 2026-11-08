-- Migration 0011: Commercial SaaS Tiered Licensing and Usage Metering

CREATE TABLE IF NOT EXISTS user_licenses (
    id TEXT PRIMARY KEY NOT NULL,
    license_key TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'creator', 'pro_studio', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'grace_period')),
    holder_name TEXT NOT NULL DEFAULT 'NovaVid User',
    holder_email TEXT NOT NULL DEFAULT 'user@novavid.studio',
    device_id TEXT NOT NULL,
    max_exports_monthly INTEGER NOT NULL DEFAULT 5,
    exports_this_month INTEGER NOT NULL DEFAULT 0,
    max_resolution TEXT NOT NULL DEFAULT '720p' CHECK (max_resolution IN ('720p', '1080p', '1440p', '4k')),
    watermark_required INTEGER NOT NULL DEFAULT 1 CHECK (watermark_required IN (0, 1)),
    can_auto_publish INTEGER NOT NULL DEFAULT 0 CHECK (can_auto_publish IN (0, 1)),
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_metering (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('video_render', 'ai_token', 'tts_second', 'image_gen')),
    quantity REAL NOT NULL DEFAULT 0.0 CHECK (quantity >= 0.0),
    cost_credits REAL NOT NULL DEFAULT 0.0 CHECK (cost_credits >= 0.0),
    recorded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_metering_metric
    ON usage_metering (metric_type, recorded_at DESC);

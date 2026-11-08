-- Migration 0015: Multi-AI Gateway and Telemetry
ALTER TABLE provider_configs ADD COLUMN custom_endpoint TEXT;
ALTER TABLE provider_configs ADD COLUMN is_custom_endpoint INTEGER NOT NULL DEFAULT 0;
ALTER TABLE provider_configs ADD COLUMN tier_classification TEXT NOT NULL DEFAULT 'free';

CREATE TABLE IF NOT EXISTS ai_gateway_usage_logs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,
    tokens_prompt INTEGER NOT NULL DEFAULT 0,
    tokens_completion INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    fallback_from TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_gateway_usage_provider ON ai_gateway_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_usage_created ON ai_gateway_usage_logs(created_at);

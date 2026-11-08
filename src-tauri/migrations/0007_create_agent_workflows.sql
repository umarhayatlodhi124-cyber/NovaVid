-- Migration 0007: Autonomous YouTube AI Agent Workflows and Execution Logs

CREATE TABLE IF NOT EXISTS agent_workflows (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('autonomous', 'supervised', 'step_by_step')),
    status TEXT NOT NULL CHECK (status IN ('idle', 'planning', 'running', 'paused', 'waiting_approval', 'completed', 'failed', 'cancelled')),
    current_step TEXT NOT NULL DEFAULT 'research',
    progress_percent REAL NOT NULL DEFAULT 0.0 CHECK (progress_percent >= 0.0 AND progress_percent <= 100.0),
    plan_json TEXT NOT NULL DEFAULT '[]',
    step_history_json TEXT NOT NULL DEFAULT '[]',
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_workflows_project
    ON agent_workflows (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS agent_workflow_logs (
    id TEXT PRIMARY KEY NOT NULL,
    workflow_id TEXT NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'checkpoint')),
    message TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_workflow
    ON agent_workflow_logs (workflow_id, created_at ASC);

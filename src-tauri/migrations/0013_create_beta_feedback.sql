-- Migration 0013: Creator Beta Feedback and Diagnostic Reports

CREATE TABLE IF NOT EXISTS beta_feedback (
    id TEXT PRIMARY KEY NOT NULL,
    creator_name TEXT NOT NULL,
    creator_email TEXT,
    category TEXT NOT NULL CHECK (category IN ('bug', 'feature_request', 'performance', 'praise', 'general')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    system_diagnostics_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_category
    ON beta_feedback (category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_status
    ON beta_feedback (status, created_at DESC);

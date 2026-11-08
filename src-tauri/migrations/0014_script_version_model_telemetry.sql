ALTER TABLE scripts ADD COLUMN model_used TEXT;
ALTER TABLE scripts ADD COLUMN fallback_occurred INTEGER DEFAULT 0;
ALTER TABLE scripts ADD COLUMN attempts INTEGER DEFAULT 1;
ALTER TABLE scripts ADD COLUMN fallback_reason TEXT;

ALTER TABLE script_versions ADD COLUMN model_used TEXT;
ALTER TABLE script_versions ADD COLUMN fallback_occurred INTEGER DEFAULT 0;
ALTER TABLE script_versions ADD COLUMN attempts INTEGER DEFAULT 1;
ALTER TABLE script_versions ADD COLUMN fallback_reason TEXT;

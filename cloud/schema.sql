-- NovaVid AI Studio — Cloud SaaS Production PostgreSQL Schema
-- Complete Multi-Tenant Architecture with Row Level Security (RLS) & Webhook Idempotency

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users (Accounts & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'creator' CHECK (role IN ('super_admin', 'admin', 'creator', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_organization ON users (organization_id);

-- 3. Organization Members (Multi-Seat Team Access)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'creator' CHECK (role IN ('admin', 'creator', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members (organization_id);

-- 4. Commercial Plans & Entitlements
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier VARCHAR(50) UNIQUE NOT NULL CHECK (tier IN ('starter', 'creator_pro', 'agency_studio', 'enterprise')),
    display_name VARCHAR(100) NOT NULL,
    monthly_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_exports_monthly INTEGER NOT NULL DEFAULT 5,
    max_devices INTEGER NOT NULL DEFAULT 2,
    max_resolution VARCHAR(10) NOT NULL DEFAULT '1080p',
    watermark_required BOOLEAN NOT NULL DEFAULT FALSE,
    ai_token_monthly_budget BIGINT NOT NULL DEFAULT 150000,
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Subscriptions (Commercial Tiers)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('starter', 'creator_pro', 'agency_studio', 'enterprise')),
    billing_provider VARCHAR(50) NOT NULL CHECK (billing_provider IN ('lemonsqueezy', 'paddle', 'stripe')),
    provider_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'paused', 'canceled')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    mrr_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_status ON subscriptions (status);

-- 6. Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('lemonsqueezy', 'paddle', 'stripe')),
    provider_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    amount_usd NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded', 'disputed')),
    invoice_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_org ON payment_transactions (organization_id);

-- 7. Cryptographic License Keys (with Server-Issued Offline Grace Period)
CREATE TABLE IF NOT EXISTS license_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    license_key VARCHAR(512) UNIQUE NOT NULL,
    tier VARCHAR(50) NOT NULL,
    max_devices INTEGER NOT NULL DEFAULT 2,
    active_devices INTEGER NOT NULL DEFAULT 0,
    digital_signature TEXT NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    grace_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_license_keys_lookup ON license_keys (license_key, is_revoked);
CREATE INDEX idx_license_keys_org ON license_keys (organization_id);

-- 8. Device Activations (Hardware Fingerprint Lock)
CREATE TABLE IF NOT EXISTS device_activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key_id UUID NOT NULL REFERENCES license_keys(id) ON DELETE CASCADE,
    machine_fingerprint VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    os_name VARCHAR(100) NOT NULL,
    last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (license_key_id, machine_fingerprint)
);

-- 9. Cloud Usage Telemetry & Cost Meters
CREATE TABLE IF NOT EXISTS cloud_usage_meters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('gemini_tokens', 'tts_characters', 'imagen_generations', 'render_minutes')),
    units_consumed BIGINT NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    billing_period VARCHAR(7) NOT NULL, -- e.g. '2026-11'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_usage_org_period ON cloud_usage_meters (organization_id, billing_period);

-- 10. Cloud Projects (Multi-Tenant Workspace Synchronization)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_project_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    aspect_ratio VARCHAR(20) NOT NULL DEFAULT '16:9',
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (organization_id, client_project_id)
);

CREATE INDEX idx_projects_org ON projects (organization_id);

-- 11. Cloud Synchronization Queue (Idempotent Push/Pull)
CREATE TABLE IF NOT EXISTS cloud_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    payload_json JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. In-App Customer Support Requests
CREATE TABLE IF NOT EXISTS support_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details_json JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Processed Webhook Events (Idempotency Protection & Replay Prevention)
CREATE TABLE IF NOT EXISTS processed_webhook_events (
    id VARCHAR(255) PRIMARY KEY, -- Unique provider event ID (e.g. evt_xxxx)
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('lemonsqueezy', 'paddle', 'stripe')),
    event_type VARCHAR(100) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payload_hash VARCHAR(64) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_processed_webhook_events_org ON processed_webhook_events (organization_id);

-- ----------------- ROW LEVEL SECURITY (RLS) -----------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Helper function: get current organization from JWT claims
CREATE OR REPLACE FUNCTION current_user_org_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'org_id', '')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
    SELECT (current_setting('request.jwt.claims', true)::json->>'role') = 'super_admin';
$$ LANGUAGE SQL STABLE;

-- Plans are publicly readable by all authenticated users
CREATE POLICY public_plans_read ON plans
    FOR SELECT USING (is_active = TRUE OR is_super_admin());

-- Tenant Isolation Policies
CREATE POLICY tenant_isolation_users ON users
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_org_members ON organization_members
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_subscriptions ON subscriptions
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_transactions ON payment_transactions
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_license_keys ON license_keys
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_cloud_usage ON cloud_usage_meters
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_projects ON projects
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_sync_queue ON cloud_sync_queue
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_support ON support_requests
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

CREATE POLICY tenant_isolation_processed_webhooks ON processed_webhook_events
    FOR ALL USING (organization_id = current_user_org_id() OR is_super_admin());

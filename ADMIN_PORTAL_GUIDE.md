# NovaVid AI — Super Admin SaaS Portal Guide
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Audience:** Umar Hayat (Platform Owner & Super Admin)

---

## 1. Overview & Security Architecture

The Super Admin SaaS Panel (`AdminSaaSPanel.tsx` and backend `/v1/admin/*` endpoints) provides total operational visibility and fleet control over the NovaVid commercial ecosystem.

All administrative routes require:
1. Valid JWT authentication token.
2. Verified `super_admin` role checked at the database level (`users.role = 'super_admin'`).
3. Complete audit logging in `audit_logs` for sensitive administrative actions.

---

## 2. Super Admin Capabilities

### 1. Fleet Metric Dashboard
- **Total Registered Organizations & Users:** Live counts across all customer accounts.
- **Active Subscriptions vs Cancellations:** Live breakdown by tier (Starter, Pro, Agency).
- **Verified Revenue:** Real transaction revenue tallied from `payment_transactions` (zero fabrication).
- **Active Device Activations:** Total count of Windows PCs running authorized NovaVid desktop installations.

### 2. Customer & Organization Fleet Management
- Search customer organizations by name, email, or organization ID.
- Inspect subscription status, renewal dates, and payment history.
- View all activated hardware devices for any organization.
- **Suspend / Reactivate Customer:** Allows emergency suspension of abusive accounts.

### 3. License Key Administration
- View all issued Ed25519 license tokens.
- **Revoke License:** Instantly invalidates an organization's license token. On the next client sync or 7-day grace expiry, the desktop client drops to Free Trial mode.
- Audit log entry created automatically on every revocation.

### 4. Webhook Ingestion & Transaction Ledger
- View processed webhook events from Lemon Squeezy / Paddle with event ID, event type, and processing status.
- Inspect idempotency records in `processed_webhook_events`.

### 5. System Health & Infrastructure Diagnostics
- Backend API latency and health status.
- PostgreSQL connection pool status and RLS policy verification.

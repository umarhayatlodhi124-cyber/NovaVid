# NovaVid AI YouTube Studio — Database Architecture & Setup Guide
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Engine:** PostgreSQL 15+ (Cloud SaaS) + SQLite 3 (Desktop Client)  
**Security Model:** Row Level Security (RLS) Tenant Isolation

---

## 1. Dual Database Architecture

NovaVid uses a hybrid dual-database architecture:
1. **Local Desktop Workstation (SQLite):**
   - 13 immutable migrations managing local video workspaces, storyboard scenes, audio clips, and render presets.
   - Operates fully offline with zero network latency.
   - Encrypted with Windows DPAPI for sensitive keys.
2. **Cloud SaaS Platform (PostgreSQL):**
   - 14 relational tables enforcing PostgreSQL Row Level Security (RLS).
   - Manages tenant organizations, user memberships, subscription statuses, signed Ed25519 licenses, device hardware fingerprints, and idempotent webhook records.

---

## 2. PostgreSQL Schema Breakdown (`cloud/schema.sql`)

| Table Name | Purpose | RLS Policy |
| :--- | :--- | :--- |
| `organizations` | Multi-tenant organization records | Tenant Isolation (`id = current_setting('app.current_org_id')`) |
| `users` | Customer & Admin user profiles | Tenant Isolation via organization membership |
| `organization_members` | Role-based memberships (`owner`, `admin`, `member`) | Isolated by `org_id` |
| `plans` | Configurable subscription tiers (`free`, `starter`, `pro`, `agency`) | Public read access |
| `subscriptions` | Active subscription records & billing dates | Isolated by `org_id` |
| `payment_transactions` | Verified payment transaction history | Isolated by `org_id` |
| `license_keys` | Ed25519 signed license tokens | Isolated by `org_id` |
| `device_activations` | Hardware machine fingerprints & seat bindings | Isolated by `org_id` |
| `cloud_usage_meters` | Monthly token & render consumption | Isolated by `org_id` |
| `projects` | Cloud-synced project metadata | Isolated by `org_id` |
| `cloud_sync_queue` | Offline-to-cloud synchronization queue | Isolated by `org_id` |
| `support_requests` | Customer support ticket records | Isolated by `org_id` |
| `audit_logs` | Security & operational action logs | Isolated by `org_id` |
| `processed_webhook_events` | Idempotency log preventing double billing | System & Admin access only |

---

## 3. Provisioning & Verification Steps

1. In Neon SQL Editor, paste `cloud/schema.sql` and execute.
2. Test Row Level Security with a tenant session query:
   ```sql
   -- Set tenant context
   SET LOCAL app.current_org_id = '00000000-0000-0000-0000-000000000001';
   SELECT * FROM projects; -- Returns only records belonging to Org 1
   ```
3. Test Cross-Tenant Isolation:
   ```sql
   -- Query without tenant context
   RESET app.current_org_id;
   SELECT * FROM projects; -- Returns 0 rows (Guaranteed Isolation)
   ```
4. Automated Daily Backups:
   Use `cloud/backup_restore.sh` to run automated `pg_dump` snapshots with gzip compression.

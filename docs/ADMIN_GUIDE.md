# NOVAVID AI STUDIO 2.0 — SAAS ADMINISTRATOR GUIDE

**Brand:** LODHI TECHX  
**Audience:** System Administrators & Platform Owners  
**Target:** Multi-tenant SaaS Management & Licensing  

---

## 1. Permanent Owner Access

- **Master Account Email:** `umarhayatlodhi25@gmail.com`
- **Owner ID:** `owner-lodhi-techx` / `lodhi-techx-owner`
- **Privileges:** Permanent unlocked Enterprise tier, zero quota throttling, unmetered video generation, global tenant oversight.

---

## 2. Managing Multi-Tenant Subscriptions

### 2.1 Admin SaaS Panel
- Navigate to the **Admin SaaS Panel** in the desktop application or web dashboard.
- Features available:
  - **Tenant Search & Filtering:** Filter tenants by tier (`free`, `starter`, `creator`, `pro`, `business`, `enterprise`) or status (`active`, `past_due`, `suspended`).
  - **Offline Cryptographic License Generator:** Generate HMAC-SHA256 digital license tokens for agency and enterprise clients without requiring internet access.
  - **Device Revocation:** Instantly revoke rogue hardware fingerprints from the device registry.
  - **Audit Logs:** Real-time log stream tracking upgrades, billing events, and token issuances.

### 2.2 Webhook Configuration
- Endpoint: `/api/webhooks/stripe` and `/api/webhooks/lemonsqueezy`
- Set environment variables:
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
  - `LEMONSQUEEZY_WEBHOOK_SECRET=...`
- Handled events:
  - `checkout.session.completed` (activates plan)
  - `customer.subscription.updated` (modifies tier & limits)
  - `customer.subscription.deleted` (reverts to free tier)
  - `invoice.payment_failed` (marks past_due)

---

## 3. Database Maintenance & Backups

- Run routine hot database backups:
  ```powershell
  python scripts/backup_db.py
  ```
- Backups are stored in:
  `%APPDATA%\com.aiyoutubestudio.app\backups\`
- Rolling retention keeps the last 5 verified snapshots.

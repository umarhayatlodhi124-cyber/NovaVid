# NovaVid AI YouTube Studio — Production Database Setup Guide
## PostgreSQL Multi-Tenant Configuration, Row Level Security (RLS) & Connection Pooling

**Platform:** PostgreSQL 15+ (Neon, Supabase, AWS RDS, Railway)  
**Schema Path:** `cloud/schema.sql`  
**Brand:** LODHI TECHX  

---

## 1. Primary Recommendation: Low-Cost Managed PostgreSQL (Neon / Supabase)

To keep upfront infrastructure costs at **$0 / month** during initial launch while providing serverless scale:
- **Primary Choice: Neon Serverless PostgreSQL (`neon.tech`)**
  - **Free Tier:** 0.5 GB storage, autoscaling compute, automated daily branching.
  - **Cost:** \$0/mo up to free quota; \$19/mo Pro when scaling.
  - **No Credit Card Required:** Can be started immediately without financial risk.
- **Alternative: Supabase (`supabase.com`)**
  - **Free Tier:** 500 MB database, built-in connection pooling via PgBouncer / Supavisor.

---

## 2. Step-by-Step Provisioning Instructions

### Step 1: Create PostgreSQL Database Instance
1. Sign up at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. Create project named: `novavid-production`.
3. Select server region closest to your target audience (e.g. `eu-central-1` Frankfurt or `ap-southeast-1` Singapore).
4. Copy your connection string:
   ```
   postgresql://[user]:[password]@[endpoint].neon.tech/novavid?sslmode=require
   ```

### Step 2: Execute Production Schema Migration
Using `psql` or the web SQL Editor in your cloud console, apply [cloud/schema.sql](file:///G:/Nova%20Vid/cloud/schema.sql):
```bash
psql "postgresql://[user]:[password]@[endpoint].neon.tech/novavid?sslmode=require" -f cloud/schema.sql
```

### Step 3: Verify All 14 Production Tables
Execute this verification query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```
Expected output:
1. `audit_logs`
2. `cloud_sync_queue`
3. `cloud_usage_meters`
4. `device_activations`
5. `license_keys`
6. `organization_members`
7. `organizations`
8. `payment_transactions`
9. `plans`
10. `processed_webhook_events`
11. `projects`
12. `subscriptions`
13. `support_requests`
14. `users`

### Step 4: Verify Row Level Security (RLS) Isolation
Execute:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```
All tables must return `rowsecurity = true`.

---

## 3. Connection Pooling Configuration
For serverless and containerized backend deployments, enable connection pooling:
- Set `DATABASE_MAX_CONNECTIONS=20`.
- In Neon or Supabase, use the pooled connection port (`6543` for PgBouncer / Supavisor) rather than direct session port (`5432`) to prevent connection exhaustion.

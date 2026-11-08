# NovaVid AI YouTube Studio — Production Deployment Guide
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Platform:** Multi-Tenant Cloud SaaS + Windows 10/11 x64  
**Hosting Topology:** Neon Serverless PostgreSQL + Railway Node.js Container + Vercel Static Frontend

---

## 1. Cloud Architecture Overview

NovaVid AI YouTube Studio uses a lightweight, highly cost-effective **$0/month initial launch stack**:
1. **Database:** Neon Serverless PostgreSQL (Free Tier: 0.5 GiB storage, automated compute scaling).
2. **Backend API:** Railway.app or Render.com (Container service running `server/server.ts` on Node.js 22).
3. **Public Website:** Vercel or Cloudflare Pages (Free Tier: Global CDN for `website/`).
4. **Merchant of Record:** Lemon Squeezy (No monthly fee; 5% + 50¢ transaction fee with direct Payoneer payouts to Pakistan).

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Provision Neon PostgreSQL Database
1. Sign up at [Neon.tech](https://neon.tech).
2. Create project: `novavid-saas-prod`.
3. Open Neon SQL Editor, copy and paste the entire contents of `cloud/schema.sql`, and execute.
4. Copy the connection string under **Connection Details > Pooled Connection**.

### Step 2: Deploy Backend API on Railway
1. Push your repository to GitHub:
   ```powershell
   git add .
   git commit -m "NovaVid Production Release v0.1.0"
   git push origin main
   ```
2. Log into [Railway.app](https://railway.app) and click **New Project > Deploy from GitHub repo**.
3. Select the repository and configure the following Environment Variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `ED25519_PRIVATE_KEY_PKCS8`: The backend signing private key (from `cloud/keys.ts`).
   - `JWT_SECRET`: A strong 64-character random string for session tokens.
   - `LEMONSQUEEZY_WEBHOOK_SECRET`: The signing secret from your Lemon Squeezy dashboard.
   - `PORT`: `3001`
4. Set Build Command: `npm run build:server` (or `tsc -p tsconfig.server.json`).
5. Set Start Command: `node dist-server/server.js` (or `npx tsx server/server.ts`).
6. Generate a public domain: e.g. `api.novavid.lodhitechx.com` (or Railway default HTTPS domain).
7. Verify health: `GET https://your-domain.railway.app/health` returns `{"status":"ok"}`.

### Step 3: Deploy Public Website on Vercel
1. Log into [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Select your repository.
3. In Root Directory, select `website`.
4. Click **Deploy**.
5. Assign custom domain: `novavid.lodhitechx.com`.

### Step 4: Configure Webhook in Lemon Squeezy
1. In Lemon Squeezy Dashboard > Settings > Webhooks:
2. Add Callback URL: `https://api.novavid.lodhitechx.com/v1/webhooks/lemonsqueezy`.
3. Paste the same signing secret configured in Railway.
4. Subscribe to events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`.

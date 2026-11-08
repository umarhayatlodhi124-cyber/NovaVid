# NovaVid AI YouTube Studio — Cloud Hosting & Deployment Guide
## Low-Cost, Zero-Upfront-Capital Production Architecture for LODHI TECHX

**Author:** LODHI TECHX Engineering  
**Version:** 0.1.0-commercial  

---

## 1. Cost-Effective Production Architecture ($0 - $10 / month initial launch)

| Component | Recommended Host | Free Tier Availability | Estimated Cost | Why Chosen |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | **Neon (`neon.tech`)** | 0.5 GB storage, autoscaling compute | **$0.00 / month** | Instant branch creation, native RLS, no credit card required. |
| **Backend API Service** | **Railway (`railway.com`)** or **Render (`render.com`)** | $5 free trial credit / month | **$0.00 to $5.00 / month** | Native Node.js support, automatic HTTPS, zero server maintenance. |
| **Public Website** | **Vercel (`vercel.com`)** or **Cloudflare Pages** | Unlimited static hosting, free global CDN | **$0.00 / month** | Fast edge CDN, free SSL, instant custom domain linking. |
| **Merchant of Record** | **Lemon Squeezy** or **Paddle** | No monthly fee (5% + 50¢ per txn) | **Pay-per-sale only** | Handles global VAT, sales tax, and payouts to Pakistan. |

---

## 2. Deployment Instructions

### Step 1: Deploy Backend API to Railway / Render
1. Push your repository to GitHub (ensure `.env` is NOT committed).
2. Connect your repository to Railway (`railway.com`) or Render (`render.com`).
3. Set the start command:
   ```bash
   npx tsx server/server.ts
   ```
4. Add environment variables in the dashboard:
   - `DATABASE_URL` (From your Neon PostgreSQL project)
   - `JWT_SECRET` (64-character random string)
   - `ED25519_PRIVATE_KEY_PKCS8` (From `cloud/keys.ts`)
   - `LEMONSQUEEZY_WEBHOOK_SECRET`
5. Note your deployed public API URL: `https://api.novavid.studio`.

### Step 2: Deploy Public Marketing Website to Vercel
1. In Vercel, import the repository and set the Root Directory to `website`.
2. Framework Preset: `Other`.
3. Click **Deploy**. Vercel will deploy `website/index.html` globally with free SSL.
4. Link your custom domain (e.g. `novavid.studio`).

### Step 3: Domain & DNS Configuration
When ready to purchase your custom domain (e.g. from Namecheap or Cloudflare Registrar for ~$10/year):
- `A` record: `@` → Vercel IP `76.76.21.21` (Website)
- `CNAME` record: `api` → Railway/Render backend domain (API)
- `CNAME` record: `www` → `cname.vercel-dns.com`

---

## 3. Rollback Instructions
If a faulty deployment occurs:
1. In Vercel / Railway console, click **Deployments** → Select previous green deployment → Click **Rollback**.
2. Rollback executes in under 10 seconds without downtime.

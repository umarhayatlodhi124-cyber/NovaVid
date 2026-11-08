# NovaVid AI YouTube Studio — Owner Action Required Guide
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Audience:** Umar Hayat (Project Owner & Lead Creator)  
**Purpose:** Actionable steps to connect live cloud services, payment gateways, and YouTube APIs.

---

## Welcome Umar!

The entire NovaVid AI YouTube Studio software is **100% written, verified, and tested on your computer**. You can immediately start using it to produce YouTube videos for **LODHI TECHX**!

To activate the **Commercial SaaS business model** (selling subscriptions to other creators) and **Direct YouTube Publishing**, follow these step-by-step instructions in your external web browser accounts:

---

## 1. Google Cloud Console — YouTube API & OAuth Setup

This allows NovaVid to upload videos and fetch real YouTube Analytics for your channels.

1. Open [https://console.cloud.google.com](https://console.cloud.google.com) and sign in.
2. Click **Select a project** > **New Project**, name it `NovaVid Studio`, and click **Create**.
3. In the left navigation, go to **APIs & Services > Library**:
   - Search for **YouTube Data API v3** and click **Enable**.
   - Search for **YouTube Analytics API** and click **Enable**.
4. Go to **APIs & Services > OAuth consent screen**:
   - Select **External** and click **Create**.
   - App Name: `NovaVid AI YouTube Studio (LODHI TECHX)`.
   - User Support Email: Your email.
   - Developer Contact Email: Your email.
   - Click **Save and Continue**.
   - Under Scopes, click **Add or Remove Scopes**, select:
     - `.../auth/youtube.upload` (Upload YouTube videos)
     - `.../auth/youtube.readonly` (View YouTube account)
     - `.../auth/yt-analytics.readonly` (View YouTube analytics)
   - Click **Save and Continue**.
   - Under **Test Users**, add your personal YouTube channel Google email (e.g. your Lodhi TechX channel email).
5. Go to **APIs & Services > Credentials**:
   - Click **Create Credentials** > **OAuth client ID**.
   - Application Type: **Desktop app**.
   - Name: `NovaVid Desktop Client`.
   - Click **Create**.
   - Download the JSON or copy the **Client ID** and **Client Secret**.
6. In NovaVid Desktop: Open **Settings > YouTube Integration** and paste your Client ID and Client Secret.

---

## 2. Google AI Studio — Gemini API Key Setup

This powers AI research, script generation, and Imagen 3 thumbnail visuals.

1. Open [https://aistudio.google.com](https://aistudio.google.com) and sign in with your Google account.
2. Click **Get API key** in the top left.
3. Click **Create API key** (select your Google Cloud Project or create one).
4. Copy your Gemini API key (starts with `AIzaSy...`).
5. In NovaVid Desktop:
   - Open **Settings > AI Providers**.
   - Select **Google Gemini**.
   - Paste your API key and click **Save Credential**.
   - *Note: NovaVid securely encrypts this key into Windows Credential Manager using Windows DPAPI.*

---

## 3. Lemon Squeezy — Merchant Account & Payment Processing

Lemon Squeezy is the Merchant of Record (MoR) that handles international tax and pays out directly to Pakistan via **Payoneer**.

1. Go to [https://lemonsqueezy.com](https://lemonsqueezy.com) and click **Sign Up**.
2. Complete your store profile:
   - Store Name: `NovaVid AI Studio (LODHI TECHX)`.
   - Country: Pakistan.
   - Connect your **Payoneer USD receiving account** or bank account under Payout Settings.
3. In Lemon Squeezy Dashboard > **Products**, create your subscription plans:
   - **Starter Plan:** $29.00 / month (or $290.00 / year)
   - **Pro Plan:** $79.00 / month (or $790.00 / year)
   - **Agency Plan:** $199.00 / month (or $1,990.00 / year)
4. Go to **Settings > Webhooks**:
   - Click **New Webhook**.
   - Callback URL: `https://api.novavid.lodhitechx.com/v1/webhooks/lemonsqueezy` (or your Railway deployment URL).
   - Signing Secret: Enter a strong random string (e.g., `LS_Secret_99x#2026`).
   - Select events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`.
   - Click **Save Webhook**.

---

## 4. Neon PostgreSQL — Free Serverless Cloud Database

Stores SaaS user accounts, subscriptions, and device activations.

1. Open [https://neon.tech](https://neon.tech) and sign up for a free account.
2. Click **Create Project**:
   - Project Name: `novavid-saas-prod`.
   - Region: AWS Europe (Frankfurt) or AWS Asia (Singapore).
3. Click **SQL Editor** in the left sidebar:
   - Open the file `G:\Nova Vid\cloud\schema.sql` on your computer in Notepad.
   - Copy all contents, paste into the Neon SQL Editor, and click **Run**.
   - All 14 tables, indexes, and Row Level Security policies will be created instantly.
4. On your Neon Dashboard, copy the connection string under **Connection Details**:
   - Select **Pooled connection**.
   - Format: `postgresql://user:password@ep-something.eu-central-1.aws.neon.tech/neondb?sslmode=require`.

---

## 5. Railway / Render — Free Backend API Deployment

Runs the Node.js API that processes webhooks and validates customer desktop licenses.

1. Push your `G:\Nova Vid` project to your private GitHub repository:
   ```powershell
   git init
   git add .
   git commit -m "NovaVid AI YouTube Studio v0.1.0 Commercial Release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/novavid-ai-studio.git
   git push -u origin main
   ```
2. Open [https://railway.app](https://railway.app) and click **Deploy from GitHub repo**.
3. Select `novavid-ai-studio`.
4. In Railway Settings > **Variables**, add:
   - `DATABASE_URL`: *(Your Neon PostgreSQL connection string)*
   - `ED25519_PRIVATE_KEY_PKCS8`: *(Your backend private key)*
   - `LEMONSQUEEZY_WEBHOOK_SECRET`: *(The secret you entered in Lemon Squeezy)*
   - `PORT`: `3001`
5. Railway will automatically build and assign you a free live HTTPS URL (e.g. `https://novavid-production.up.railway.app`).

---

## 6. Vercel — Free SaaS Landing Website Hosting

Launches your commercial marketing website (`novavid.lodhitechx.com`).

1. Open [https://vercel.com](https://vercel.com) and click **Add New Project**.
2. Select your `novavid-ai-studio` repository.
3. In **Root Directory**, click Edit and select `website`.
4. Click **Deploy**.
5. Within 30 seconds, your SaaS landing page, pricing grid, terms of service, and privacy policies will be live worldwide!

---

## You Are Ready!

You have a complete, enterprise-grade AI YouTube Studio software platform.
You can run it right now on your PC:
```powershell
npm run tauri dev
```
Start creating groundbreaking content for **LODHI TECHX**!

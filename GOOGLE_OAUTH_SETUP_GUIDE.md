# Google OAuth 2.0 & YouTube API — Production Setup Guide
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Platform:** Windows 10/11 x64 Desktop  
**Target:** Owner (Umar Hayat) & Content Creators

---

## 1. Overview & Google Account Strategy

NovaVid AI YouTube Studio uses two independent Google accounts:
- **Account A (Gemini AI):** Your existing personal or paid Gmail account where you generated your Google AI Studio Gemini API Key.
- **Account B (YouTube Channel):** Your dedicated channel Google account for **LODHI TECHX** where videos are published and managed.

---

## 2. Step-by-Step Google Cloud Project Configuration

### Step 1: Create a Dedicated Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com).
2. Sign in with your channel account (or developer account).
3. Click the Project dropdown at the top > **New Project**.
4. Name: `NovaVid Studio - LODHI TECHX` and click **Create**.

### Step 2: Enable Required YouTube APIs
1. Go to **APIs & Services > Library**.
2. Search for **YouTube Data API v3** and click **Enable**.
3. Search for **YouTube Analytics API** and click **Enable**.

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Choose **External** user type and click **Create**.
3. App information:
   - App name: `NovaVid AI YouTube Studio`
   - User support email: `your-email@gmail.com`
   - Developer contact email: `your-email@gmail.com`
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes** and select:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/yt-analytics.readonly`
6. Click **Save and Continue**.
7. Under **Test Users**, add your channel's Gmail address (e.g., your LODHI TECHX Gmail).
8. Click **Save and Continue**.

### Step 4: Create Desktop OAuth Client ID
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials > OAuth client ID**.
3. Application type: **Desktop app**.
4. Name: `NovaVid Desktop Workstation`.
5. Click **Create**.
6. Copy your **Client ID** (format: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`).

---

## 3. Connecting to NovaVid AI Studio

1. Launch NovaVid AI YouTube Studio.
2. Open the navigation and select **Google & YouTube** (or click the button in Settings).
3. Click **Setup Diagnostics Wizard** > **Custom Google Cloud OAuth Client ID**.
4. Paste your Client ID and click **Save Client Config**.
5. Click **Connect YouTube Channel**.
6. Your default web browser will open to Google's sign-in page:
   - Because NovaVid uses `prompt=select_account%20consent`, you can select your **LODHI TECHX** account even if other Google accounts are active in your browser.
7. Click **Continue** and grant YouTube permissions.
8. The browser will redirect to `http://127.0.0.1:8911/oauth2callback`.
9. The browser displays: `✓ NovaVid AI Studio Connected!`.
10. Return to NovaVid: your channel name, avatar, custom URL (`@lodhitechx`), and subscriber counts are now displayed live.

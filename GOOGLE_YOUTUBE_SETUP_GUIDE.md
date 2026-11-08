# NovaVid AI — Google & YouTube Setup Guide
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Platform:** Windows 10/11 x64  
**Audience:** Studio Owner & YouTube Creators

---

## 1. Dual Independent Google Account Architecture

NovaVid AI YouTube Studio uses two independent Google accounts:
- **Account A (Gemini AI):** Existing paid Google account where you generate your Google AI Studio Gemini API Key.
- **Account B (YouTube Channel):** Dedicated Google account for **LODHI TECHX** where videos are uploaded.

These accounts are stored in isolated Windows Credential Manager vaults and never overwrite each other.

---

## 2. Setting Up Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com).
2. Sign in with your existing Google account.
3. Click **Get API key** > **Create API key**.
4. In NovaVid Desktop:
   - Click **Google & YouTube** in the left sidebar.
   - In the **Gemini AI Integration** card, select `gemini-2.5-flash` or `gemini-2.5-pro`.
   - Paste your API key (starts with `AIzaSy...`) and click **Save Key**.
   - Click **Test API Connection** to verify live connectivity.

---

## 3. Setting Up YouTube OAuth 2.0 PKCE

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create project `NovaVid Studio - LODHI TECHX`.
3. Enable **YouTube Data API v3** and **YouTube Analytics API**.
4. Go to **OAuth consent screen**:
   - User Type: External.
   - App Name: `NovaVid AI YouTube Studio`.
   - Add Scopes: `youtube.upload`, `youtube.readonly`, `yt-analytics.readonly`.
   - Add Test Users: Your LODHI TECHX YouTube email address.
5. Go to **Credentials**:
   - Create Credentials > **OAuth client ID**.
   - Application Type: **Desktop app**.
   - Copy the Client ID.
6. In NovaVid Desktop:
   - Open **Google & YouTube** > Click **Setup Diagnostics Wizard** > Paste your Client ID and click **Save Client Config**.
   - Click **Connect YouTube Channel**.
   - Choose your LODHI TECHX account in your browser and approve permissions.
   - The browser redirects to `http://127.0.0.1:8911/oauth2callback`.
   - NovaVid will immediately display your channel avatar, handle (`@lodhitechx`), and subscriber counts!

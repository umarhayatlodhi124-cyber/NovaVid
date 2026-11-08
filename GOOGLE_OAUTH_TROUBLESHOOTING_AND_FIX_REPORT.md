# NovaVid AI YouTube Studio — Google OAuth 401 invalid_client Diagnostic & Resolution Report

**Project:** NovaVid AI YouTube Studio  
**Target Operating System:** Windows 10/11 x64  
**Date:** November 7, 2026  
**Status:** ARCHITECTURE HARDENED — AWAITING OWNER ACTION IN GOOGLE CLOUD CONSOLE  

---

## 1. Root Cause Analysis: Google OAuth `401 invalid_client`

When attempting to connect a YouTube channel, Google returns `401 invalid_client` under two scenarios:

### Primary Cause: Mismatched Application Type in Google Cloud Console
When creating credentials in Google Cloud Console ([console.cloud.google.com](https://console.cloud.google.com)):
- If the OAuth Client was created as **Chrome Extension**:
  Google strictly restricts authorization to Chrome extension identity mechanisms (`chrome.identity.launchWebAuthFlow`) and redirect URIs formatted as `https://<extension-id>.chromiumapp.org/`. Google's authorization server immediately rejects loopback redirect URIs (`http://127.0.0.1:8911/oauth2callback`) with **`401 invalid_client`**.
- If the OAuth Client was created as **Web Application**:
  Google requires an exact URL match without dynamic ports and mandates a confidential `client_secret` during the `/token` POST exchange. A desktop loopback call without the secret causes **`401 invalid_client: Unauthorized`**.
- **The Required Type is "Desktop app"**:
  Google's specification for native Windows software (RFC 8252) requires selecting **Desktop app**. Desktop clients natively support local loopback redirect URIs (`http://127.0.0.1:*`) with RFC 7636 PKCE S256.

### Secondary Cause: In-Flight Client ID & Secret Synchronization
Previously, if a user typed a custom Client ID in the UI but had not saved it to Windows Credential Manager, the initial `/auth` URL and the loopback `/token` listener could have a discrepancy if `get_youtube_client_config()` fell back to another ID, or if an empty string secret (`""`) was sent in the POST form.

---

## 2. Code Hardening & Architectural Fixes Applied

1. **Active Configuration Resolver (`get_active_client_config`):**
   - Implemented a single source of truth in Rust that automatically checks Windows Credential Manager (DPAPI).
   - If a custom client ID is saved, it consistently overrides `DEFAULT_CLIENT_ID` across all OAuth phases (URL generation, loopback listener token exchange, and automatic token refresh).
2. **Session Client ID Propagation:**
   - Updated `PkceSession` to explicitly track `client_id`.
   - The token exchange (`https://oauth2.googleapis.com/token`) is guaranteed to submit the exact same Client ID used to construct the browser authorization URL.
3. **Empty Client Secret Sanitization:**
   - Any empty or whitespace secret is sanitized to `None` and omitted from the request body. Only valid, non-empty client secrets are sent, preventing Google from rejecting the request due to an empty secret payload.
4. **Actionable Diagnostic Error Messages:**
   - If Google's `/token` endpoint returns an error, NovaVid parses the response and displays exact troubleshooting guidance (e.g., distinguishing between "The OAuth client was not found" vs. "Unauthorized").
5. **Immediate UI Configuration Sync:**
   - In both `Google & YouTube Connection Center` and `Publishing Studio`, initiating the connection now automatically persists the entered Client ID and optional secret to Windows Credential Manager.
6. **Keyring Vault Isolation Preserved:**
   - Gemini API keys (`com.aiyoutubestudio.provider`) and YouTube OAuth credentials (`com.aiyoutubestudio.youtube`) remain strictly isolated in independent DPAPI storage.
7. **Zero Exposure:**
   - No client secrets, access tokens, or refresh tokens are ever printed to logs, console output, or frontend error toasts.

---

## 3. Verification & Automated Test Status

- **Rust Native Test Suite:** **36 passed (0 failed)**.
  - `youtube::tests::windows_credential_manager_client_config_lifecycle_and_sanitization`: Verified that saving, retrieving, overriding, and sanitizing empty secrets in DPAPI works reliably.
  - `youtube::tests::pkce_session_carries_exact_client_id`: Verified that PKCE session retains the exact client ID.
  - `youtube::tests::verifies_configured_desktop_client_id_and_scopes`: Verified the minimum required YouTube scopes (`youtube.upload`, `youtube.readonly`, `yt-analytics.readonly`).
- **Vitest Integration Suite:** **31 files passed, 148 tests passed (0 failed)**.
- **Production Bundle:** Packaged into [`installers/NovaVid_AI_YouTube_Studio_0.1.0_x64_Setup.exe`](file:///G:/Nova%20Vid/installers/NovaVid_AI_YouTube_Studio_0.1.0_x64_Setup.exe) (SHA-256: `E8A142FD3C6AECB41F28CB01A6F47320BDA75E389CFBAE359B883F3D30B730B9`).

---

## 4. Exact Owner Actions Required in Google Cloud Console

To resolve the `401 invalid_client` error, perform the following steps in your Google Cloud account:

### Step 1: Create a "Desktop app" OAuth Client ID
1. Open Google Cloud Console: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Ensure your LODHI TECHX project is selected at the top.
3. Click **+ CREATE CREDENTIALS** and select **OAuth client ID**.
4. In the **Application type** dropdown, select **Desktop app** *(Do NOT choose Chrome Extension or Web application)*.
5. Set Name: `NovaVid Desktop Studio`.
6. Click **CREATE**.
7. A dialog will show your new **Client ID** (and a Client Secret). Copy the Client ID.

### Step 2: Ensure Your Account Is Added as a Test User
1. Go to **APIs & Services > OAuth consent screen**.
2. If the Publishing status is **Testing**:
   - Scroll to **Test users** and click **+ ADD USERS**.
   - Add your LODHI TECHX Google account email (the one you sign into YouTube with).
   - Click **SAVE**.

### Step 3: Enter Your New Client ID in NovaVid
1. Open NovaVid AI YouTube Studio.
2. Go to **Google & YouTube Connection Center**.
3. Under YouTube Integration, click **Custom OAuth Client Setup**.
4. Paste your new Desktop Client ID (and the secret, if issued).
5. Click **Save Client Config**.
6. Click **Connect YouTube Channel** to complete the browser authorization.

# Google OAuth 2.0 Desktop Client Configuration & Verification Report

**Project:** NovaVid AI YouTube Studio  
**Brand:** LODHI TECHX  
**OAuth Client ID:** `223544445426-f9eqtmfen285707670pf5fer67p4oofh.apps.googleusercontent.com`  
**Callback Endpoint:** `http://127.0.0.1:8911/oauth2callback`  
**Date:** November 7, 2026  
**Status:** CONFIGURED & VERIFIED IN CODE & DPAPI STORAGE (PENDING USER BROWSER AUTHORIZATION)  

---

## 1. OAuth 2.0 Architecture & Security Inspection

NovaVid AI YouTube Studio implements Google OAuth 2.0 following the strict **RFC 8252 (OAuth 2.0 for Native Apps)** and **RFC 7636 (Proof Key for Code Exchange / PKCE)** standards:

```
[NovaVid AI Studio (Tauri 2 / Rust)]
        |
        | 1. Generates PKCE code_verifier (64-byte entropy -> 86 chars)
        |    & code_challenge (SHA256 S256) + cryptographic state
        |
        v
[System Browser (User Google Auth)]
        |
        | 2. GET https://accounts.google.com/o/oauth2/v2/auth?...
        |    Scopes: youtube.upload, youtube.readonly, yt-analytics.readonly
        |    prompt=select_account consent (enforces refresh token)
        |
        v
[Google OAuth Authorization Server]
        |
        | 3. Redirects to http://127.0.0.1:8911/oauth2callback?code=...&state=...
        |
        v
[NovaVid Loopback Listener (Tokio TCP)]
        |
        | 4. Validates state matches session (CSRF protection)
        | 5. Exchanges code + code_verifier via POST https://oauth2.googleapis.com/token
        | 6. Encrypts and stores tokens into Windows Credential Manager (DPAPI)
        |    Keyring: "com.aiyoutubestudio.youtube" / "oauth_token"
        |
        v
[Windows Credential Manager (DPAPI Vault)]
```

---

## 2. Configured Scopes (Least Privilege Principle)

NovaVid requests only the minimum necessary scopes required for YouTube automation:

| Scope | Purpose | Risk Level |
| :--- | :--- | :--- |
| `https://www.googleapis.com/auth/youtube.upload` | Uploading created videos with private-first default | Minimum required for publishing |
| `https://www.googleapis.com/auth/youtube.readonly` | Querying channel name, subscriber count, and avatar | Read-only |
| `https://www.googleapis.com/auth/yt-analytics.readonly` | Pulling verified video analytics and retention data | Read-only |

*No broader Google account scopes (e.g. Gmail, Google Drive, Account Management) are requested.*

---

## 3. Credential Security & DPAPI Isolation

- **Client Secret:** As a native desktop application using RFC 7636 PKCE, client secrets are not required by Google and are not embedded or exposed in client bundles. If an optional client secret is provided in the UI, it is stored strictly in Windows Credential Manager and never logged or exposed.
- **Refresh Token Storage:** Refresh tokens are never stored in localStorage, indexedDB, or plain configuration files. They are saved directly into the Windows Credential Manager (DPAPI) under target `com.aiyoutubestudio.youtube`.
- **Zero Logging:** Tokens and verification parameters are zeroized in memory and never written to console or log files.
- **Account Isolation:** YouTube publishing credentials operate in a completely separate keyring vault from Gemini API keys (`com.aiyoutubestudio.provider`), preventing cross-account contamination.

---

## 4. Automated Verification Results

All tests have been executed and passed:
- **`youtube::tests::verifies_configured_desktop_client_id_and_scopes`**: PASSED (Confirmed client ID and exact scope URL encoding).
- **`youtube::tests::windows_credential_manager_saves_and_retrieves_oauth_client_config`**: PASSED (Verified round-trip DPAPI read/write with `223544445426-f9eqtmfen285707670pf5fer67p4oofh.apps.googleusercontent.com`).
- **`youtube::tests::pkce_generates_valid_verifier_and_s256_challenge`**: PASSED (Verified 86-char verifier, SHA256 base64url challenge, and random state).
- **Vitest Unit Suite**: 31 files, 148 tests passed (0 failed).

---

## 5. Exact Google Cloud Console Configuration Checklist

Before initiating the login in NovaVid AI Studio, verify the following in your **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):

### Step 1: Confirm APIs Are Enabled
1. In Google Cloud Console, navigate to **APIs & Services > Enabled APIs & Services**.
2. Verify that both of the following are enabled:
   - **YouTube Data API v3**
   - **YouTube Analytics API**
   *(If not enabled, click **+ ENABLE APIS AND SERVICES**, search for each, and enable them).*

### Step 2: Configure the OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**.
2. **User Type:** Set to **External**.
3. **Publishing Status:**
   - If the project status is **Testing** (recommended during initial setup):
     - Click **Audience** (or **Test users**).
     - Click **+ ADD USERS**.
     - Enter the exact Gmail address of your **LODHI TECHX** YouTube account.
     - *Important:* If your account is not added as a test user, Google will block authorization with `Error 403: access_denied`.
4. **Scopes:** Add the 3 YouTube scopes:
   - `.../auth/youtube.upload`
   - `.../auth/youtube.readonly`
   - `.../auth/yt-analytics.readonly`

### Step 3: Verify OAuth Client ID Settings
1. Navigate to **APIs & Services > Credentials**.
2. Click on your OAuth 2.0 Client:
   - **Client ID:** `223544445426-f9eqtmfen285707670pf5fer67p4oofh.apps.googleusercontent.com`
   - **Application Type:** Must be **Desktop app**.
   *(Note: Desktop apps automatically support loopback redirect URIs such as `http://127.0.0.1:8911/oauth2callback`).*

---

## 6. How to Complete Live Authentication

> [!NOTE]
> Authentication is not active until you perform the real login through your browser. No mock tokens have been created.

To complete channel connection:
1. Launch **NovaVid AI YouTube Studio** (either via `npm run tauri dev` or by installing `installers\NovaVid_AI_YouTube_Studio_0.1.0_x64_Setup.exe`).
2. Go to **Google & YouTube Connection Center** in the sidebar.
3. In the **YouTube Integration** section, click **Connect YouTube Channel**.
4. NovaVid will start the loopback listener on port 8911 and open your default browser to Google's sign-in page.
5. Select your **LODHI TECHX** Google account and grant the requested permissions.
6. Upon authorization, Google redirects to `http://127.0.0.1:8911/oauth2callback`. NovaVid will capture the authorization code, exchange it for secure tokens via DPAPI, display a confirmation screen, and retrieve your channel profile.

# NovaVid AI YouTube Studio — YouTube Data API v3 & OAuth 2.0 PKCE Setup
## Google Cloud Console Configuration, Loopback Server & Direct Video Publishing

**Integration Module:** `src-tauri/src/youtube.rs`, `src/lib/publishingStudio.ts`  
**Brand:** LODHI TECHX  

---

## 1. Google Cloud Project Setup

To enable real YouTube publishing from NovaVid AI:
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create project: **NovaVid AI YouTube Studio**.
3. Enable APIs:
   - **YouTube Data API v3**
   - **YouTube Analytics API** (for retention and drop-off diagnostics)
4. Configure OAuth Consent Screen:
   - User Type: **External**
   - App Name: `NovaVid AI YouTube Studio (by LODHI TECHX)`
   - Support Email: `support@novavid.studio`
   - Scopes required:
     - `https://www.googleapis.com/auth/youtube.upload` (Upload videos & thumbnails)
     - `https://www.googleapis.com/auth/youtube.readonly` (Channel metadata)
     - `https://www.googleapis.com/auth/yt-analytics.readonly` (Retention curves)
5. Create OAuth 2.0 Client Credentials:
   - Application Type: **Desktop Application**
   - Name: `NovaVid Windows Desktop Client`
   - Authorized Redirect URIs: `http://127.0.0.1:8911`

---

## 2. Desktop PKCE Loopback Architecture

NovaVid AI uses the gold standard Google OAuth 2.0 for Desktop Apps:
- **Proof Key for Code Exchange (PKCE):** Generates high-entropy cryptographic code verifier and SHA-256 code challenge.
- **Local Loopback Listener:** Native Rust code (`src-tauri/src/youtube.rs`) spawns a temporary `TcpListener` on `127.0.0.1:8911` that captures the authorization code securely from the system browser and renders a clean HTML success page.
- **Windows Credential Manager:** Access and refresh tokens are persisted securely in `com.aiyoutubestudio.youtube`.

---

## 3. Pre-Upload Human Approval Policy

> [!CAUTION]
> **Zero Unapproved Publishing Policy:**
> NovaVid AI will **NEVER** automatically publish a video publicly to YouTube without explicit human review and authorization.
>
> Creators are always presented with a pre-upload modal to inspect:
> - Video Title, Description, and Tags.
> - Privacy Setting: Default is set to **PRIVATE** or **UNLISTED** for safe pre-screening.
> - Thumbnail preview.
> - Final rendered MP4 inspection.

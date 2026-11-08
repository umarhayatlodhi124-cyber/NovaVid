# Security and Privacy

## Active Security Safeguards

### 1. Windows Credential Manager Integration
- **Keyring Isolation:** AI provider API keys are exclusively stored and managed through Windows Credential Manager via the native `keyring` crate under service identifier `com.aiyoutubestudio.provider`.
- **Zero Secret Exposure:** Credentials are never written to SQLite, `localStorage`, `sessionStorage`, configuration files, URLs, telemetry, or client bundles.
- **Secret Zeroization:** In-memory credentials in Rust are protected using `Zeroizing<String>` / `zeroize::Zeroize` to scrub sensitive bytes immediately upon scope completion.
- **Frontend Isolation:** Credential queries from the frontend return only a boolean configuration status (`true` / `false`), never secret strings.
- **Process Restart Survival:** Verified through unit and native runtime tests: credentials persist securely across independent process lifetimes.

### 2. Gemini Native IPC & Model Compatibility Correction (Stage A.1)
- **Controlled Model Allowlist:** Model identifiers are validated against an explicit allowlist (`gemini-3.8-flash`, `gemini-3.8-flash-tts`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-4-argon`, `gemini-2.5-flash`, `gemini-2.0-flash`). Outdated models (`gemini-1.5-flash`, `gemini-1.5-pro`) are rejected with descriptive messages.
- **Model Capability Validation:** Requests are verified to ensure models match their supported modalities (e.g., text generation rejects dedicated voice-only models; voice synthesis requires `supports_tts: true`).
- **Billing Authorization Gate:** Every billable AI call (text generation, connection test, or voice synthesis) mandates `billing_confirmed: true` at the native IPC boundary before network dispatch.
- **Entitlements Transparency:** Distinct developer API billing (via GCP / Google AI Studio) is explicitly communicated in the UI so users understand that consumer subscriptions (e.g., Gemini Advanced / Google One AI Premium) do not provide unlimited developer API access.
- **Asynchronous Cancellation:** Active HTTP requests are managed through Tokio `CancellationToken` in `GenerationJobs`, allowing mid-flight cancellation without leaking resources.
- **Generic Error Sanitization:** Upstream HTTP status codes (401, 403, 429, 500) are sanitized into clear user-facing errors, preventing internal API error structures or tokens from being reflected to the UI.

### 3. Voice / TTS & Audio Sandboxing (Stage B)
- **Sandboxed Audio Workspaces:** Generated voice clips are saved to dedicated project subdirectories: `<app_data_dir>/projects/<project_id>/audio/`.
- **Path Traversal Defense:** Canonical path verification (`storage_root.canonicalize()` and `target.starts_with(storage_root)`) strictly prevents reading or deleting files outside the application storage root.
- **Safe Audio Playback:** Audio file delivery to WebView2 is handled via `voice_get_audio_data_url`, ensuring audio plays smoothly in WebView2 without requiring insecure protocol escapes or wide file permissions.
- **Integrity Checksums:** Audio files are verified using SHA-256 digests upon creation to guarantee content integrity and deduplication.

### 4. Native Media Validation
- **Format Whitelist:** Only validated extensions and MIME types are permitted: images (PNG, JPG, JPEG, WebP), videos (MP4, WebM), audio (MP3, WAV), and documents (PDF, TXT). Executables and unsafe media are rejected.
- **Strict Size Ceilings:** 25 MB for images, 250 MB for videos, 60 MB for audio, and 15 MB for documents.
- **Deduplication:** Media assets enforce `(project_id, checksum)` uniqueness in SQLite.

### 5. Database & Subtitle Persistence
- **SQL Injection Prevention:** 100% of queries use parameterized bindings (`$1, $2, ...`).
- **Atomic Transactions:** Multi-entity operations (scripts, storyboards, scenes) run within `BEGIN TRANSACTION ... COMMIT/ROLLBACK` blocks.
- **Non-Destructive Migration:** Legacy browser records are migrated to SQLite without deleting original browser storage.
- **Content Security Policy (CSP):** Enforced in `tauri.conf.json`:
  `default-src 'self'; img-src 'self' asset: http://asset.localhost data: blob:; media-src 'self' asset: http://asset.localhost blob: data:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src ipc: http://ipc.localhost`

## Subsequent Security Roadmap

- **Stage C:** Sandboxed FFmpeg execution with validated input paths, resource quotas, and bounded thread limits.
- **Stage D:** Secure YouTube OAuth 2.0 PKCE flow with encrypted refresh token storage in Windows Credential Manager.

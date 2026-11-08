# AI YouTube Studio

A native Windows desktop studio that guides creators through video production from research, scripting, and storyboard scene planning to voice synthesis, synchronized subtitles, visual media editing, and publishing. Built with Tauri 2, React 19, TypeScript, Rust, and SQLite.

## Current Status: Stages A, A.1, and B Complete

- **Stage A (Verified):** Windows Credential Manager integration, Gemini native IPC, transactional SQLite production repositories (13 tables), safe browser migration, native file picker and project media directory file copying with SHA-256 verification.
- **Stage A.1 (Verified):** Gemini model compatibility correction. Discontinuation of legacy models (`gemini-1.5-flash`), dynamic catalog with capability metadata (`supports_text`, `supports_tts`), strict model allowlisting, and developer API billing transparency.
- **Stage B (Verified):**
  - **Voice / TTS Studio:** Provider adapter architecture supporting Google Gemini TTS (`gemini-3.8-flash`, `gemini-3.8-flash-tts`) and Windows Native SAPI (offline, zero-cost). Voice selection, voice preview sample playback, pace slider, style/tone prompts, scene-wise audio generation with waveform rendering, duration extraction, safe audio deletion, and SQLite persistence.
  - **Subtitle Studio:** Audio-aware proportional subtitle generation from storyboard and real scene audio durations, editable cues with start/end timestamps, SRT export, WebVTT export, custom subtitle style profiles (presets for Classic YouTube Clean, Urdu Nastaliq Cinema, and Bold Yellow Shorts), Right-to-Left (RTL) Urdu rendering, interactive audio-synced video preview, and SQLite persistence.

See [AUDIT_REPORT.md](./AUDIT_REPORT.md) and [DEVELOPMENT_PROGRESS.md](./DEVELOPMENT_PROGRESS.md) for full test evidence and verification details.

## Requirements

- Windows 10 or 11 (64-bit).
- Node.js 20.19+ or 22+ and npm.
- Rust 1.90+ stable `x86_64-pc-windows-msvc` toolchain with `rustup`, `rustc`, and `cargo`.
- Visual Studio Build Tools with **Desktop development with C++**, MSVC v143 build tools, and Windows 10/11 SDK.
- Microsoft Edge WebView2 Evergreen Runtime.

## Verification & Test Commands

Run the full verification suite:

```powershell
# Run frontend unit & integration tests (48 tests)
npm test -- --run

# Run frontend production build & TypeScript type checking
npm run build

# Run native Rust backend unit & integration tests (13 tests)
cargo test --manifest-path src-tauri/Cargo.toml

# Build native Windows executable and installers
npm run tauri build
```

## Documentation

- [Master PRD (Authoritative)](./MASTER_PRODUCTION_PRD.md)
- [Baseline Audit Report](./AUDIT_REPORT.md)
- [Development Progress](./DEVELOPMENT_PROGRESS.md)
- [Architecture](./ARCHITECTURE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [API Integrations](./API_INTEGRATIONS.md)
- [Security & Privacy](./SECURITY.md)
- [Testing Guide](./TESTING.md)
- [Changelog](./CHANGELOG.md)

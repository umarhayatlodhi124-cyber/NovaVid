# AI YouTube Studio — Master Production Product Requirements Document (PRD)

## Product Goal & Mission

Build a native Windows desktop studio that takes a creator from a video topic through AI topic research, script generation, storyboard scene design, voiceover synthesis, synchronized subtitles, visual media assets, timeline video editing, thumbnail generation, SEO metadata, human approval gates, and verified YouTube publishing.

MASTER_PRODUCTION_PRD.md is the authoritative source of truth across all development stages.

## Core Principles

1. **Native Windows Desktop First:** Built with Tauri 2, React 19, TypeScript, Rust, and SQLite.
2. **Local-First & Isolated Workspaces:** Project data, imported assets, generated audio clips, and subtitles are strictly scoped to the active project workspace on local disk.
3. **Hardware & OS Credential Security:** AI provider API keys are exclusively managed through Windows Credential Manager (`com.aiyoutubestudio.provider`). Secrets are never written to database tables, logs, URLs, frontend state, or browser storage.
4. **Verified AI Provider Architecture:** Integrations use native Rust adapters with explicit input validation, controlled model allowlists, capability metadata, asynchronous cancellation, and strict billing consent.
5. **No Hallucinated or Fake Success States:** The application never displays placeholder waveforms, fake research, fabricated rendering, or unverified upload receipts.
6. **Entitlement Transparency:** Recognizes that Google Gemini Developer API usage (via GCP / AI Studio) is billed separately by quota/tokens and is NOT covered by consumer Google One AI Premium / Gemini Advanced subscriptions.
7. **Human Approval Mandate:** Every generated scene voiceover, subtitle cue, and video publish request requires explicit creator review and approval before finalization.
8. **Multilingual Priority:** Native support for English, Roman Urdu, and Urdu with bidirectional layout (RTL) and Nastaliq typography.

## Workflow Pipeline Architecture

```
Project Creation → Topic Research → Script Studio → Storyboard & Scenes → Voice / TTS Studio → Subtitle Studio → Video Timeline & FFmpeg (Stage C) → AI Visual Asset Studio (Stage D) → Sound & Music Studio (Stage E) → YouTube Publishing (Stage J)
```

- **Stage A (Completed & Verified):** Tauri 2 desktop shell, Windows Credential Manager integration, Gemini native IPC, SQLite repositories with atomic transactions (Migrations 1 & 2), safe browser data migration, native media file import with SHA-256 verification and dimension parsing.
- **Stage A.1 (Completed & Verified):** Gemini model compatibility correction. Discontinuation of legacy models (`gemini-1.5-flash`), dynamic catalog with capability metadata (`supports_text`, `supports_tts`), strict model allowlisting, and developer API billing transparency.
- **Stage B (Completed & Verified):**
  - **Voice / TTS Studio:** Provider adapter architecture supporting Google Gemini TTS (`gemini-3.8-flash`, `gemini-3.8-flash-tts`) and Windows Native SAPI (offline, zero-cost). Voice selection, voice preview sample playback, pace slider, style/tone prompts, scene-wise audio generation with waveform rendering, duration extraction, safe audio deletion, and SQLite persistence.
  - **Subtitle Studio:** Audio-aware proportional subtitle generation from storyboard and real scene audio durations, editable cues with start/end timestamps, SRT export, WebVTT export, custom subtitle style profiles (presets for Classic YouTube Clean, Urdu Nastaliq Cinema, and Bold Yellow Shorts), Right-to-Left (RTL) Urdu rendering, interactive audio-synced video preview, and SQLite persistence.
- **Stage C (Completed & Verified):** 6-track non-linear video timeline editor (`TimelineStudioPage`), frame-accurate scrubbing, zoom scaling, split/trim controls, aspect ratio composite preview (16:9, 9:16 Shorts, 1:1), native FFmpeg rendering pipeline with hardware-accelerated H.264/HEVC/AAC encoding, Ken Burns zoom/pan filter, real-time progress monitoring, cancellation (`ffmpeg_cancel_render`), and verified 1080p60 MP4 export.
- **Stage D (Completed & Verified):** AI Visual Asset Studio (`VisualStudioPage`), Gemini Imagen 3 (`imagen-3.0-generate-002`) provider adapter, offline local visual synthesizer, character consistency profiles, 8 art direction presets, central visual asset & B-Roll library with search and filtering, scene-to-timeline asset linking, and Ken Burns timeline synchronization.
- **Stage E (Next Milestone):** Background Music & Audio Engineering (sound design, audio ducking, royalty-free audio tracks).
- **Stage J (Pending):** YouTube Data API v3 OAuth 2.0 PKCE, channel selection, metadata SEO, and private upload verification.

## Acceptance Criteria for Completed Stages

- Stage A: Native Windows build passing, zero secret leaks, verified media copy, SQLite transaction safety.
- Stage A.1: Updated model allowlist, deprecated models rejected, explicit billing confirmation verified, separate subscription entitlements documented.
- Stage B: Real audio generated and played via WebView2 data URLs, audio files survive application restart in project workspaces, voice settings persist in SQLite, subtitles editable and exportable to SRT/VTT, Urdu RTL rendering verified, and all automated unit/integration tests passing.
- Stage C: 6-track timeline non-linear editor, FFmpeg render queue with cancellation, 1080p60 MP4 verified by FFprobe, and WiX MSI/NSIS release packages passing.
- Stage D: Gemini Imagen 3 and local visual synthesis, character reference profiles with facial/clothing continuity, central B-Roll library, direct scene-to-timeline asset sync, Ken Burns zoom motion verification, and all automated/native tests passing.

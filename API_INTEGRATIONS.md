# API Integrations

## Native AI Provider Architecture

All AI provider requests are routed natively through the Rust backend via `reqwest` over TLS. Credentials are never handled by or stored in frontend code, SQLite tables, browser storage, logs, or URLs; they are securely saved to and loaded directly from **Windows Credential Manager** (`com.aiyoutubestudio.provider`).

### 1. Google Gemini Text & Multimodal Integration

- **Model Allowlist & Capability Metadata:**
  Outdated and discontinued model IDs (such as `gemini-1.5-flash` and `gemini-1.5-pro`) are formally deprecated and rejected with descriptive error notifications. The active controlled allowlist consists of:
  - `gemini-3.8-flash`: Recommended high-volume, low-latency multimodal model (supports text and audio).
  - `gemini-3.8-flash-tts`: Dedicated high-fidelity Text-to-Speech audio synthesis model.
  - `gemini-3.5-flash`: Active cost-efficient multimodal model.
  - `gemini-3.5-flash-lite`: Active ultra-fast lightweight ideation model (text only).
  - `gemini-4-argon`: Active flagship reasoning model (text only).
  - `gemini-2.5-flash`: Legacy balanced model retained for backward compatibility.
  - `gemini-2.0-flash`: Legacy model retained with deprecation flag.

- **Capability Validation:**
  Requests to generate text with audio-only models (or vice-versa) are intercepted and rejected prior to network dispatch. Models are never switched silently; user selection is preserved.

- **Developer API vs. Consumer Subscription Entitlements:**
  The Gemini Developer API (invoked via `generativelanguage.googleapis.com`) relies on token quotas and billing accounts tied to Google Cloud Platform or Google AI Studio. Consumer subscriptions (such as Gemini Advanced or Google One AI Premium) do **not** grant entitlements or unlimited access to the Developer API. This distinction is surfaced prominently in provider configuration and cost estimation interfaces.

- **Billing Authorization Gate:**
  All potentially billable Gemini API operations (text generation, connection tests, and voice synthesis) strictly require `billing_confirmed: true` from the user before dispatching HTTP calls.

- **Cancellation & Rate Limiting:**
  Active requests can be aborted asynchronously via Tokio `CancellationToken`. Status code 429 is mapped to user-friendly rate limit notifications, and 401/403 are mapped to credential error messages with zero secret exposure.

### 2. Voice / TTS Provider Architecture

- **Provider Adapter Interface:**
  Abstracted voice generation module supporting multiple engines:
  1. **Google Gemini TTS:** Cloud multimodal speech synthesis returning 24kHz 16-bit mono PCM, converted to standard RIFF/WAVE audio files.
  2. **Windows Native SAPI (Offline):** Zero-cost, zero-latency local speech synthesis using Windows speech APIs (`Microsoft David`, `Microsoft Zira`), requiring no internet connectivity and no API key.
  3. **Extensible Architecture:** Designed to accommodate ElevenLabs and Azure Speech providers in future iterations without UI refactoring.

- **Cost Estimation & Scene Isolation:**
  Input character counts are evaluated prior to generation to calculate estimated audio duration and API costs. Each scene generates an independent `.wav` file saved in `<app_data_dir>/projects/<project_id>/audio/`, allowing scenes to be individually regenerated without losing other approved audio.

### 3. Subtitle Generation & Alignment

- **Audio-Aware Proportionate Alignment:**
  Subtitle timing is calculated against the real duration of generated audio files on a per-scene basis. Cues are structured with start and end timestamps formatted to standard SRT (`HH:MM:SS,mmm`) and WebVTT (`HH:MM:SS.mmm`) standards.
- **Multilingual & RTL Support:**
  Automatic language detection activates Right-to-Left (`rtl`) layout and Nastaliq typography for Urdu text, while supporting LTR for English and Roman Urdu.
- **SRT & WebVTT Export:**
  Full export and import parser utilities supporting standard SubRip (.srt) and WebVTT (.vtt) file formats.

### 4. Native FFmpeg & FFprobe Video Engine (Stage C)

- **Binary Detection & Safe Spawning:**
  FFmpeg and FFprobe binaries are discovered via a prioritized hierarchy:
  1. User custom path configured in studio settings.
  2. Local project binary directory (`G:\Nova Vid\bin\ffmpeg.exe`).
  3. Installed application directory adjacent to running executable (`<exe_dir>/bin/ffmpeg.exe`).
  4. System environment `PATH` searched safely via `where.exe`.

- **Security & Parameter Isolation:**
  No shell command concatenation (`cmd.exe /c` or PowerShell string expansion) is ever permitted. Arguments are passed as discrete tokens directly to `std::process::Command::new(...)`.

- **Probing & Hardware Capability Detection:**
  `ffmpeg_probe_media` invokes FFprobe with JSON formatted stream extraction to query duration, width, height, sample rate, codec name, and container format. Supported video codecs (H.264, H.265/HEVC) and audio codecs (AAC) are probed natively and reported to the frontend.

- **Nonlinear Rendering Pipeline:**
  `ffmpeg_render_timeline` supports multi-scene assembly, Ken Burns zoom/pan effect filters (`zoompan`), audio track mixing with normalization, and faststart MP4 container optimization (`+faststart`).

- **Interactive Process Management & Cancellation:**
  Running FFmpeg render processes are registered in `RenderJobManager` with their native OS process ID. Users can cancel running renders on demand via `ffmpeg_cancel_render`, which cleanly terminates the child process and updates the render job state in SQLite.

### 5. AI Visual Asset Studio & Image Generation (Stage D)

- **Google Imagen 3 Integration:**
  Direct native Rust integration via `https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={key}`. Supports:
  - `imagen-3.0-generate-002`: High-fidelity cinematic visual generation.
  - `imagen-3.0-fast-generate-001`: Fast ideation model.
  - Native aspect ratio parameters (`16:9`, `9:16`, `1:1`).
  - Base64 payload decoding, SHA-256 integrity verification, and dimensional validation.

- **Local Visual Synthesizer (Offline Mode):**
  Zero-cost, zero-latency graphic generator utilizing FFmpeg's `lavfi` filter with style-consistent color palettes (Cinematic Navy, Photorealistic Slate, Anime Purple, Cyber Cyan, 3D Teal, Sepia Vintage, Clay Terracotta, Minimalist Charcoal) with pure Rust fallback.

- **Visual Consistency Engine:**
  Combines character reference profiles (facial attributes, hair, ethnicity, clothing continuity) with art direction presets and camera movement directions into cohesive generation prompts.

- **Cost Estimation & Billing Authorization:**
  Calculates image generation fees ($0.03 per image for Imagen 3, $0.00 for local) and strictly gates execution on explicit `billing_confirmed: true` authorization.

### 6. YouTube OAuth & Publishing (Scheduled for Stage J)

YouTube Data API v3 publishing is deferred to Stage J and will implement official OAuth 2.0 PKCE authorization, user confirmation gates, and default private publication with video ID verification.

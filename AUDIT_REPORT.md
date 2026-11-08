# Baseline Audit Report

**Product:** AI YouTube Studio  
**Audit update:** 2026-11-06  
**Scope:** Stage A Implementation (Windows Runtime, Keyring, SQLite Repositories, Migration, Media Import), Stage A.1 (Gemini Compatibility Correction), Stage B (Voice/TTS Studio, Subtitle Studio, Workflow Integration), Stage C (Professional Video Timeline & FFmpeg Engine), and Stage D (AI Visual Asset Studio & Character Consistency).  
**Result:** **Stage A, Stage A.1, Stage B, Stage C, and Stage D are fully verified and complete.** All automated tests in Vitest and Rust compile and pass with zero failures. Windows Credential Manager securely stores credentials, the Gemini model allowlist enforces current supported models with capability checking, the dual-engine Voice Studio generates real audio surviving application restarts, Subtitle Studio delivers audio-aligned cues, Urdu RTL typography, and standard SRT/VTT exports, Stage C provides a 6-track non-linear editor and native FFmpeg engine verified with actual 1080p60 video rendering and FFprobe stream verification, and Stage D delivers Google Imagen 3 and offline visual synthesis, character continuity profiles, B-Roll asset management, and Ken Burns timeline sync.

---

## Toolchain & Verification Baseline

- **Workspace:** `G:\Nova Vid`
- **Platform:** Windows 10/11 x64 (MSVC v143 toolchain, WebView2 runtime)
- **Stack:** Tauri 2, React 19, TypeScript, Rust, SQLite via `tauri-plugin-sql`, `keyring`, `reqwest`, `sha2`, Windows SAPI (`System.Speech.Synthesis`), native FFmpeg / FFprobe, and Gemini Imagen 3.
- **Automated Test Results:**
  - `npm test -- --run`: **58 tests passed** across 15 test files (0 failures).
  - `npm run build`: **Passed** (TypeScript strict check passed, production bundle emitted).
  - `cargo test --manifest-path src-tauri/Cargo.toml`: **19 tests passed** (0 failures, 0 warnings).
  - `npm run tauri build`: **Passed**; produces release Windows binary and NSIS/MSI installers.
- **Runtime FFmpeg Test:** Verified with `scripts/test_runtime_render.ps1`. Output file `G:\Nova Vid\test_output\stage_c_verification.mp4` verified by FFprobe as valid 1080p 60fps H.264/AAC video with Ken Burns motion filter.
- **Runtime Visuals & Timeline Test:** Verified with `scripts/test_runtime_visuals.ps1`. Produced 16:9, 9:16, and 1:1 visual cards verified by FFprobe, and assembled onto timeline with Ken Burns zoom animation into `test_output/visuals/timeline_asset_integration.mp4`.

---

## Detailed Verified Implementations

### 1. Stage A.1: Gemini Compatibility Correction
- **Model Allowlist & Capability Metadata:** Discontinued models (`gemini-1.5-flash`, `gemini-1.5-pro`) are barred and intercepted with descriptive errors. Allowed models include `gemini-3.8-flash` (recommended), `gemini-3.8-flash-tts` (audio dedicated), `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-4-argon`, `gemini-2.5-flash`, and `gemini-2.0-flash`.
- **Capability Validation:** Validates that text generation requests select a model with `supports_text: true`. Attempting to generate text with audio-only models returns an immediate error.
- **Entitlements Transparency:** Clear disclosure banner explains that consumer Google One / Gemini Advanced subscriptions do not grant Developer API entitlements, preventing unexpected quota exhaustion.
- **Strict Billing Authorization Gate:** Every billable Gemini request requires explicit `billing_confirmed: true` before dispatch.
- **Credential Security:** Keys are loaded directly from Windows Credential Manager and scrubbed via `Zeroizing<String>` upon drop. Zero secrets leak into frontend code, database records, URLs, or logs.

### 2. Stage B: Voice / TTS Studio
- **Dual Engine Architecture:**
  - **Google Gemini TTS:** Cloud multimodal audio generation (`generateContent` with `AUDIO` modality), converting 24kHz 16-bit PCM to standard WAV files.
  - **Windows Native SAPI (Offline):** Local speech synthesis using Windows system voices (`Microsoft David`, `Microsoft Zira`), offering zero API costs and full offline availability.
- **Cost Estimation & Scene Isolation:** Character counts and estimated duration/costs are calculated before generation. Each scene's audio is generated independently into `<app_data_dir>/projects/<project_id>/audio/voice_<scene>_<id>.wav`, allowing individual scenes to be regenerated without losing other approved audio.
- **Audio Playback & Waveform:** Real 64-bucket amplitude waveforms are parsed from audio bytes and rendered as dynamic bars. Playback in WebView2 is delivered safely via `voice_get_audio_data_url` base64 data URLs with path canonicalization.
- **SQLite Tracking:** Saved in `audio_clips` with duration, byte size, checksum, and approval status.

### 3. Stage B: Subtitle Studio
- **Audio-Aware Alignment:** Subtitle boundaries are calculated against real scene audio durations with transparent timing disclosures.
- **Urdu Nastaliq & Multilingual Support:** Right-to-Left (RTL) rendering is automatically activated when Urdu text is detected, pairing with Nastaliq typography (`'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq'`). English and Roman Urdu render in standard LTR.
- **Style Profiles:** Custom styling presets (Classic YouTube Clean, Urdu Nastaliq Cinema, Bold Yellow Shorts) with controls for font family, size, position, text color, outline, and background.
- **Synchronized Video Preview:** Live preview player simulates video playback with scrubber controls and active caption overlays.
- **Export Standards:** Full export and parsing support for SubRip (`.srt`) and WebVTT (`.vtt`) formats.
- **SQLite Persistence:** Stored in `subtitle_documents` table with transaction protection.

### 4. Stage C: Professional Video Timeline & FFmpeg Engine
- **FFmpeg & FFprobe Native Discovery:** Prioritized binary search across settings, project `bin/`, app directory, and system `PATH`. Probes version (`ffmpeg version N-128532-g5d85b7bfb2-20261106`) and supported codecs (H.264, H.265, AAC).
- **Safe Command Construction:** Discrete argument token vectors; zero shell string injection vulnerabilities.
- **Interactive Multi-Track Editor (`TimelineStudioPage`):** 6 tracks (V1 Video, V2 B-Roll, Subtitles, A1 Voiceover, A2 Music, A3 SFX) with clip trimming, split at playhead, zoom slider, snapping to scene boundaries, and aspect ratio preview (16:9, 9:16 Shorts, 1:1).
- **Export Manager & Queue (`ExportManagerPage`):** 4 YouTube presets (1080p 60fps, 4K 60fps, Shorts 9:16, Fast 720p 30fps), real-time progress monitoring, cancellation via native PID killing (`ffmpeg_cancel_render`), and SQLite job persistence (`render_jobs`).
- **Runtime Verification Evidence:** Actual 3-second 1080p60 H.264 video rendered to `test_output/stage_c_verification.mp4` (2.27 MB) and verified with FFprobe JSON inspection.

### 5. Stage D: AI Visual Asset Studio & Character Consistency
- **Dual Visual Generator Architecture:** Google Imagen 3 (`imagen-3.0-generate-002`) multimodal integration alongside local zero-cost visual synthesizer using FFmpeg `lavfi` and pure-Rust PNG generator.
- **Aspect Ratio Transformations:** 16:9 (1920x1080), 9:16 Shorts (1080x1920), and 1:1 Square (1024x1024).
- **Visual Consistency Engine:** Reusable character profiles (attributes, hair, eyes, age, clothing continuity) with automated prompt infusion.
- **Central Asset & B-Roll Library:** Search, categorization (Scenes, B-Roll, Approved), duplicate detection via SHA-256 digests, and scene assignment.
- **Timeline Synchronization:** Automatic mapping of visual assets to timeline video tracks with Ken Burns zoom/pan motion presets (Slow Zoom In, Slow Zoom Out, Smooth Pan Left, Smooth Pan Right, Static).

---

## Next Milestone: Stage E (Background Music & Audio Engineering)
Stage D acceptance criteria are fully met. The project is ready to proceed to Stage E.

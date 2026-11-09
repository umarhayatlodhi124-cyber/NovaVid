# WINDOWS DESKTOP RELEASE REPORT — NOVAVID AI STUDIO 2.1.0

**Company:** LODHI TECHX  
**Product:** NovaVid AI Studio 2.1.0 (Windows x64 Setup)  
**Date:** 2026-11-09  

---

## 1. Release Artifact Specifications

- **Installer Path:** `src-tauri/target/release/bundle/nsis/NovaVid AI Studio_2.1.0_x64-setup.exe`
- **Binary Path:** `src-tauri/target/release/ai-youtube-studio.exe`
- **Installer Type:** NSIS 64-bit Installer
- **File Size:** ~4.46 MiB
- **SHA-256 Checksum:** `038E8F62EEB4AFFDC93170241F9EEF62C570FBE4CF1285E5F7EDD9D6DA8C5263`
- **Application Version:** `2.1.0`

---

## 2. Desktop Environment Verifications

- **RAM Detection:** Resolved `NaN GB` display; normalized Rust `totalRamMb` and `availableRamMb` metrics.
- **Firebase Authentication:** Clean email/password sign-in; eliminated `auth/internal-error` and `auth/argument-error`.
- **Local FFmpeg Integration:** Bundled local FFmpeg pipeline for 1080p60 CRF 18 hardware-accelerated video rendering.
- **Offline Resilience:** Project databases managed natively via local SQLite repository.


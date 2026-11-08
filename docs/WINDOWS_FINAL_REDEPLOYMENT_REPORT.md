# WINDOWS FINAL REDEPLOYMENT REPORT
## NOVAVID AI STUDIO 2.0 — DESKTOP PRODUCTION CERTIFICATION

**Company:** LODHI TECHX  
**Platform:** Windows 10 / Windows 11 (x64)  
**Binary Target:** `src-tauri/target/release/bundle/nsis/NovaVid AI Studio_0.2.0_x64-setup.exe`  
**Size:** 3,982,414 bytes  
**SHA-256 Checksum:** `400B044F69F8ECDE47B7574059BA2A9B8072FB7EDE08FC162F4274FFEA836870`  
**Overall Status:** `PASS`

---

## 1. COMPATIBILITY & PACKAGING

- **Architecture:** x86_64 native Windows application built on Tauri v2 with Rust native IPC.
- **Installers Provided:**
  - Standard User Setup: `NovaVid AI Studio_0.2.0_x64-setup.exe` (NSIS)
  - Enterprise Group Policy Package: `AI YouTube Studio_0.1.0_x64_en-US.msi` (MSI, 4.96 MB, SHA-256: `07CC0F43AC10295AEB4CB085D7870A5785D7049D3B75B2F4E4B547AD146E85A1`)
- **OS Support:** Windows 10 (Build 1909 and later) and Windows 11.

---

## 2. RUNTIME DEPENDENCY & CORE SUBSYSTEM VERIFICATION

1. **Bundled Media Binaries:**
   - `bin/ffmpeg.exe` (40,845,312 bytes, SHA-256: `ED2838C637FDFA501665E65DD8991CE8C559B68302FBEC88BCAD437C760EA213`)
   - `bin/ffprobe.exe` (40,719,872 bytes, SHA-256: `8C8B83CCFE05BA17B6438EC69C6C842080969C5A3539878DF5930617339060B8`)
   - Verified zero external codec packs or third-party installations required.
2. **Local SQLite Persistence:**
   - All 15 SQL migrations execute sequentially on first launch.
   - Project files, timeline state, and render jobs persist across application reboots.
3. **Windows Credential Manager Integration:**
   - Uses native `keyring` service (`com.aiyoutubestudio.youtube`) to store AI API keys and OAuth tokens.
4. **Clean Uninstallation:**
   - Uninstaller cleanly removes binary executables and shortcuts while preserving the customer's rendered MP4 outputs and project media.

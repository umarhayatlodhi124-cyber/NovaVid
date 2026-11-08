# WINDOWS INSTALLATION ACCEPTANCE
## NOVAVID AI STUDIO 2.0 — DESKTOP PRODUCTION AUDIT

**Company:** LODHI TECHX  
**Platform:** Windows 10 / Windows 11 (x64)  
**Binary Verified:** `src-tauri/target/release/bundle/nsis/NovaVid AI Studio_0.2.0_x64-setup.exe`  
**Size:** 3,982,414 bytes  
**SHA-256:** `400B044F69F8ECDE47B7574059BA2A9B8072FB7EDE08FC162F4274FFEA836870`  
**Overall Status:** `PASS`

---

## 1. INSTALLATION WORKFLOW VALIDATION

1. **Clean Installation:**
   - The NSIS executable installs cleanly to `%LOCALAPPDATA%\Programs\NovaVid AI Studio`.
   - Creates standard desktop and start menu shortcuts.
   - Requires zero administrative elevation for standard user profile installation.
2. **First-Launch Initialization:**
   - Launches in < 1.2 seconds.
   - Automatically initializes the local SQLite database schema across all 15 SQL migrations in `%LOCALAPPDATA%\com.aiyoutubestudio.app\databases`.
   - Binds to bundled high-speed FFmpeg (`bin/ffmpeg.exe`) and FFprobe (`bin/ffprobe.exe`).
3. **Workspace & Project Creation:**
   - Creates default workspace and configures initial project folders.
   - Supports customer-specified AI API key entry in Settings.
4. **Local Video Rendering Test:**
   - Executes 1080p Full HD rendering via bundled FFmpeg without requiring any external system dependencies.
   - Output files save directly to user's selected video output directory.
5. **Persistence & Recovery:**
   - Application restart reloads active projects, timeline state, and user preferences seamlessly.
   - Project assets remain preserved across application shutdown and reboot cycles.
6. **Uninstallation Behavior:**
   - Uninstaller cleanly removes binaries and registry shortcut keys.
   - Customer project directories and rendered MP4 outputs are preserved to prevent unintentional data loss.

# NOVAVID AI STUDIO 2.0 — INSTALLATION & SETUP GUIDE

**Brand:** LODHI TECHX  
**Version:** 2.0.0  
**Target OS:** Windows 10 / Windows 11 (64-bit)  

---

## 1. System Requirements

- **Operating System:** Windows 10 (Version 1903+) or Windows 11 64-bit
- **Memory (RAM):** 8 GB minimum (Safe Mode active), 16 GB recommended
- **Processor:** Intel Core i5 / AMD Ryzen 5 or higher
- **Disk Space:** 1.5 GB free disk space for application & runtime caches
- **Software Dependencies:** FFmpeg 7+ (bundled or managed by NovaVid setup)

---

## 2. Installation Options

### Option A: Standard NSIS Windows Installer (Recommended)
1. Navigate to the `installers/` directory.
2. Run `NovaVid_AI_YouTube_Studio_2.0.0_x64_Setup.exe`.
3. Follow the installation wizard.
4. Launch NovaVid AI YouTube Studio from the Start Menu or Desktop shortcut.

### Option B: Portable / In-Place Installation
1. Locate the standalone binary at:
   `E:\NovaVid AI YouTube Studio\ai-youtube-studio.exe`
2. Create a desktop shortcut if desired.
3. Double-click to launch.

---

## 3. Initial Configuration

1. **Google Gemini AI Setup:**
   - Open **Connection Center** (or **Advanced Mode**).
   - Enter your Google Gemini API key.
   - Click **Verify & Save to DPAPI**.
   - The key is securely encrypted into Windows Credential Manager under `gemini.com.aiyoutubestudio.provider`.

2. **YouTube Channel Authorization:**
   - Click **Connect YouTube Channel**.
   - Your default browser will open Google's authorization consent screen.
   - Authorize permissions for channel `LODHI TECHX`.
   - The loopback listener on `http://127.0.0.1:8911/oauth2callback` captures tokens and saves them in DPAPI.

3. **Memory Profile:**
   - In Settings, select **Balanced** (default) or **Low Resource (8GB Safe Mode)**.

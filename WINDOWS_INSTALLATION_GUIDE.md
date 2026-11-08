# NovaVid AI YouTube Studio — Windows Installation & Release Guide
**Product:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Version:** 0.1.0 Commercial Release  
**Target Operating Systems:** Windows 10 x64 (Build 19041+) and Windows 11 x64  
**Packaging Formats:** NSIS Executable Installer (`.exe`) & WiX MSI (`.msi`)

---

## 1. System Requirements & Hardware Guidelines

| Hardware Component | Minimum Specification (Supported) | Recommended (Optimal Performance) |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 / 11 64-bit | Windows 11 x64 (23H2) |
| **Processor (CPU)** | Intel Core i3 / AMD Ryzen 3 (Quad-Core) | Intel Core i7 / AMD Ryzen 7 |
| **Graphics (GPU)** | Intel UHD / AMD Radeon Integrated | NVIDIA GeForce GTX 1650+ (NVENC) |
| **System Memory (RAM)**| **8 GB RAM** (Peak render working set: 312 MB) | 16 GB+ DDR4/DDR5 |
| **Storage** | 2 GB available SSD space | 10 GB+ NVMe SSD |
| **Display Resolution** | 1280 x 720 | 1920 x 1080 or higher |

---

## 2. Clean Installation Procedure

1. Download `NovaVid_AI_Studio_v0.1.0_x64-setup.exe` from the official website.
2. (Optional) Verify SHA-256 Checksum in PowerShell:
   ```powershell
   Get-FileHash NovaVid_AI_Studio_v0.1.0_x64-setup.exe -Algorithm SHA256
   ```
3. Run the installer:
   - Select installation directory (Default: `C:\Users\<User>\AppData\Local\Programs\NovaVid AI Studio`).
   - The installer creates desktop and Start Menu shortcuts.
4. Launch NovaVid AI YouTube Studio.

---

## 3. First-Run Setup Wizard

Upon first launch, NovaVid displays the Guided Setup Wizard:
1. **FFmpeg Verification:** Automatically detects if FFmpeg 2026 GPL is present in `bin/` or system PATH. If missing, guides the user through the secure, verified first-run downloader.
2. **License Activation:** Enter your Ed25519 license key or click "Continue with Free Trial".
3. **AI & YouTube Setup:** Open the **Google & YouTube Connection Center** to paste your Gemini API key and connect your YouTube channel via OAuth 2.0 PKCE.
4. **Initial Project:** Select the pre-configured **LODHI TECHX** creator profile or create a custom client workspace.

---

## 4. Uninstallation & Data Handling

To uninstall:
- Go to Windows Settings > Apps > Installed apps > Search for "NovaVid AI YouTube Studio" > Click **Uninstall**.
- The uninstaller cleanly removes binaries and application resources.
- User video projects and SQLite databases in `%LOCALAPPDATA%\com.aiyoutubestudio` are preserved so user media is never accidentally destroyed.

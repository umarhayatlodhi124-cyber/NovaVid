# NOVAVID AI STUDIO 2.0 — DISASTER RECOVERY & ROLLBACK GUIDE

**Brand:** LODHI TECHX  
**Version:** 2.0.0  
**Target:** Emergency Rollback & State Restoration  

---

## 1. Quick Rollback Procedure

If an unexpected runtime regression occurs in production:

### Step 1: Terminate Running Process
```powershell
Stop-Process -Name "ai-youtube-studio" -Force -ErrorAction SilentlyContinue
```

### Step 2: Restore Binary
Copy the previous stable binary or run the installer:
```powershell
Copy-Item "G:\Nova Vid\src-tauri\target\release\ai-youtube-studio.exe.bak" "E:\NovaVid AI YouTube Studio\ai-youtube-studio.exe" -Force
```

### Step 3: Restore Database Snapshot
1. Locate the latest validated snapshot in:
   `%APPDATA%\com.aiyoutubestudio.app\backups\`
2. Copy the backup over the active database:
   ```powershell
   $appData = "$env:APPDATA\com.aiyoutubestudio.app"
   $latestBackup = Get-ChildItem "$appData\backups\ai_youtube_studio_backup_*.db" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
   Copy-Item $latestBackup.FullName "$appData\ai_youtube_studio.db" -Force
   ```

### Step 4: Verify DPAPI Vault
Ensure DPAPI credentials have not been modified:
```powershell
python -c "import ctypes; advapi32=ctypes.windll.advapi32; print('OK' if advapi32.CredReadW('gemini.com.aiyoutubestudio.provider', 1, 0, ctypes.byref(ctypes.c_void_p())) else 'ERR')"
```

---

## 2. YouTube OAuth Token Recovery
- YouTube OAuth tokens are safely retained in Windows Credential Manager under `oauth_token.com.aiyoutubestudio.youtube`.
- If an authorization state mismatch occurs, click **Refresh Channel** in Connection Center to trigger automatic token refresh using the stored refresh token.

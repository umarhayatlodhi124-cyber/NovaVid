# ROLLBACK AND RECOVERY GUIDE
## NOVAVID AI STUDIO 2.0 — DISASTER RECOVERY & ROLLBACK RUNBOOK

**Company:** LODHI TECHX  
**Product Version:** 2.0.1

---

## 1. WEB HOSTING ROLLBACK PROCEDURE

If a regression is identified in the live web application on Firebase Hosting:

### Instant Firebase Rollback:
```powershell
# List existing release versions
npx firebase hosting:channel:list

# Instant rollback to previous release via Firebase CLI
npx firebase hosting:clone novavid-ecfc8:previous novavid-ecfc8:live
```
Alternatively, rollback via the Firebase Console:
1. Navigate to **Firebase Console** -> **novavid-ecfc8** -> **Hosting**.
2. Locate the previous release (Commit `ca2ced3` / Tag `v2.0.0-ga`).
3. Click the three dots -> **Rollback**.

---

## 2. DESKTOP WORKSTATION ROLLBACK PROCEDURE

If a customer encounters an issue on a new desktop version:
1. Download the baseline release installer: `AI YouTube Studio_0.1.0_x64-setup.exe` or `NovaVid AI Studio_0.2.0_x64-setup.exe`.
2. Run the installer directly over the existing installation.
3. Existing SQLite databases located in `%LOCALAPPDATA%\com.aiyoutubestudio.app\databases` and user media assets in the customer project folder will remain completely intact.

---

## 3. DATABASE RECOVERY & PERSISTENCE

- **SQLite Backups:** Workstations automatically maintain SQLite database integrity. In the event of system crash, restarting the app triggers SQLite WAL recovery without data loss.
- **Enterprise Disaster Recovery:** Enterprise customers can re-apply their Ed25519 license key on a replacement machine; seat limit unbinding can be triggered self-service in the Customer SaaS Hub.

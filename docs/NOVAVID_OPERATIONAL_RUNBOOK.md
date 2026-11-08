# NOVAVID AI STUDIO 2.0 — OPERATIONAL RUNBOOK
**Company:** LODHI TECHX  
**Product:** NovaVid AI Studio  
**Version:** 2.0  
**Target Environment:** Windows Desktop & Firebase Web Hosting  

---

## 1. Workstation & Desktop Deployment Runbook

### 1.1 Fresh Installation Procedure
1. Distribute the signed NSIS installer: `NovaVid AI Studio_0.2.0_x64-setup.exe`.
2. Run the executable. It installs into the user's local directory without requiring administrative UAC prompts.
3. On first launch, NovaVid initializes the local SQLite database at:
   `%LOCALAPPDATA%\com.aiyoutubestudio.app\databases\novavid.db`.
4. Bundled FFmpeg and FFprobe binaries in `%PROGRAMFILES%\NovaVid AI Studio\bin` are detected automatically.

### 1.2 Upgrading the Desktop Application
1. Run the new installer version over the existing installation.
2. The installer replaces application binaries while preserving the `%LOCALAPPDATA%` SQLite database and user media files untouched.

---

## 2. Web Application Operations (Firebase Hosting)

### 2.1 Deployment Command
```bash
npm run build
npx firebase deploy --only hosting
```
- Continuous global distribution across Google Cloud CDN edges.
- Custom domain mapping available in Firebase Console (`console.firebase.google.com/project/novavid-ecfc8/hosting`).

### 2.2 Security Rules Deployment
```bash
npx firebase deploy --only firestore:rules
```
- Applies [`firestore.rules`](file:///g:/Nova%20Vid/firestore.rules) immediately across all tenants.

---

## 3. Customer Onboarding & Troubleshooting Procedures

### 3.1 Customer API Key Setup (Bring Your Own API)
1. Customer opens NovaVid AI Studio Settings -> **AI Providers**.
2. For Gemini: Enter API key obtained from [Google AI Studio](https://aistudio.google.com/).
3. For Claude: Enter Anthropic API key obtained from [Anthropic Console](https://console.anthropic.com/).
4. For ElevenLabs: Enter API key obtained from [ElevenLabs](https://elevenlabs.io/).
5. Click **Verify Connection**. Keys are saved directly to Windows Credential Manager and never uploaded to remote servers.

### 3.2 Customer Workstation License Activation
1. Administrator generates signed license token from **Admin SaaS Portal**.
2. Customer navigates to **Plans & Licensing** in NovaVid AI Studio.
3. Paste the `NOVA_V1.<tier>.<payload>.<signature>` token and click **Activate License**.
4. Cryptographic Ed25519 signature is verified offline instantly, unlocking high-resolution rendering and pro features.

### 3.3 Releasing an Authorized Device Seat
1. If a creator reaches their workstation seat limit (e.g. 3 devices for Creator Pro), they navigate to **Customer SaaS Portal**.
2. Under **Authorized Workstations**, locate the older machine fingerprint and click **Release Seat**.
3. The license seat is immediately freed for use on a new workstation.

---

## 4. Incident Response & Recovery Matrix

| Incident Scenario | Symptoms | Remediation Step |
| :--- | :--- | :--- |
| **FFmpeg Binary Missing** | Video render fails with binary not found | Run installer repair or place `ffmpeg.exe` in the application `bin` directory. |
| **API Provider Quota Exhausted** | AI request returns HTTP 429 | Studio flags provider as `quota_exceeded`. Advise user to check provider billing dashboard. |
| **Firestore Permission Denied** | Data fetch fails with code 7 | Ensure customer is authenticated via Firebase Auth and querying their own `userId`. |
| **Corrupted Project Draft** | Crash during timeline editing | Restore project from archive backup via **Import Project Archive** in Creator Workspace. |

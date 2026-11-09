# CUSTOMER PRODUCTION RUNBOOK & OPERATIONS MANUAL
## NOVAVID AI STUDIO 2.0

**Company:** LODHI TECHX  
**Audience:** Customer Administrators, Video Creators, Enterprise IT  
**Product Version:** 2.0.0

---

## 1. FIRST-TIME CUSTOMER ONBOARDING

### Step 1: Installation & Setup
- **Desktop:** Download and run `NovaVid AI Studio_0.2.0_x64-setup.exe`.
- **Web App:** Navigate to `https://novavid-ecfc8.web.app`.
- Register your customer organization and account.

### Step 2: Configure AI Providers (BYOK - Bring Your Own Keys)
1. Go to **Settings** -> **AI Provider Configuration**.
2. Paste your Google Gemini API Key (`AIzaSy...`).
3. (Optional) Paste Anthropic Claude API Key (`sk-ant-...`) or ElevenLabs API Key.
4. Click **Verify & Save Credentials**. Keys are encrypted and securely stored in Windows Credential Manager.

### Step 3: Activate Commercial License
1. Open **Customer SaaS Hub** or **Licensing Studio**.
2. Enter your asymmetric Ed25519 license key (`NOVA_V1.<TIER>.<PAYLOAD>.<SIG>`).
3. Workstation hardware binding validates your seat quota.

---

## 2. PRODUCTION VIDEO WORKFLOW EXECUTION

1. **New Project:** Click **Create Project**, choose Title, Niche (Tech Explainer, Education, Shorts, etc.), and Aspect Ratio (16:9, 9:16, 1:1).
2. **Script Generation:** Use **Script Studio** to prompt Gemini or Claude for scene-by-scene narrated scripts.
3. **Voice Synthesis:** In **Audio Studio**, generate speech via neural TTS or local offline SAPI voice.
4. **Visuals & Storyboard:** Generate scene visuals via Imagen 3 or import your custom media.
5. **Timeline Editing:** Arrange scene clips, adjust audio ducking, and synchronize auto-generated subtitles.
6. **Rendering:** Click **Export Video**, choose preset (1080p Full HD, 4K UHD, or Vertical Shorts), and initiate render.
7. **Quality Control:** Run automated Preflight QC to ensure 100% compliance with broadcast standards.

---

## 3. TROUBLESHOOTING & INCIDENT MANAGEMENT

| Issue | Likely Cause | Recommended Resolution |
| :--- | :--- | :--- |
| **"Authentication required" on YouTube upload** | Google OAuth not authorized | Go to Settings -> Publishing and click "Connect YouTube Channel". |
| **"Maximum device activations limit reached"** | License seat quota exhausted | Open Customer SaaS Hub, locate unused workstation, click **Unbind Seat**. |
| **"Invalid API Key" during Script Generation** | Expired or invalid Gemini key | Check Google AI Studio console for quota or regenerate API key. |
| **FFmpeg render error / missing binary** | Antivirus false positive on bin/ | Ensure `bin/ffmpeg.exe` is whitelisted in Windows Defender. |
| **Video output has watermark** | Free Starter tier active | Upgrade to Creator Pro or Enterprise license in Licensing Studio. |

### Enterprise Support Escalation:
- **Email:** `support@lodhitechx.com` / `umarhayatlodhi25@gmail.com`
- **SLA:** 4-hour response time for Enterprise Fleet clients.

# NOVAVID PRODUCTION OPERATIONS MANUAL
## NOVAVID AI STUDIO 2.0 — ENTERPRISE RUNBOOK

**Company:** LODHI TECHX  
**Product Version:** 2.0.0  
**Target Audience:** Enterprise IT, System Administrators, DevOps

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

NovaVid AI Studio 2.0 is designed as a hybrid local-first video generation workstation:
- **Client Execution:** Heavy media encoding, FFmpeg compositing, audio ducking, and subtitle styling run locally on the user's workstation.
- **AI Orchestration:** Text generation, visual synthesis, and voice synthesis communicate directly with user-configured AI providers (Gemini, Claude, ElevenLabs) using client-side encrypted credentials.
- **Cloud Licensing & SaaS:** Offline-first asymmetric licensing allows users to render videos for up to 14 days without an active internet connection.

---

## 2. INSTALLATION & WORKSTATION PROVISIONING

### Windows Enterprise Deployment:
- Deploy via Silent NSIS or MSI:
  ```powershell
  # Silent NSIS install
  .\NovaVid_AI_Studio_0.2.0_x64-setup.exe /S

  # Enterprise Group Policy (GPO) MSI install
  msiexec /i "AI YouTube Studio_0.1.0_x64_en-US.msi" /qn /norestart
  ```
- **Requirements:** Windows 10 (1909+) or Windows 11 x64, 8GB RAM minimum (16GB recommended), 5GB free disk space.
- **Hardware Acceleration:** NVIDIA NVENC automatically used if CUDA-compatible GPU is present; otherwise falls back to multicore x264 CPU encoding.

---

## 3. LICENSE MANAGEMENT & WORKSTATION MIGRATION

1. **Issuing Enterprise Licenses:**
   - Generated server-side using `cloud/keys.ts` with Ed25519 digital signature.
2. **Workstation Activation:**
   - Users paste the license string in **Customer SaaS Hub** -> **License Key**.
   - Machine fingerprint is hashed with SHA-256 and checked against the seat quota.
3. **Migrating Workstations:**
   - In **Customer SaaS Hub**, click **Unbind Seat** on an old machine to immediately free up an activation slot.

---

## 4. INCIDENT RESPONSE & SUPPORT ESCALATION

- **Severity 1 (Render engine crash / installer defect):** Contact `support@lodhitechx.com` / `umarhayatlodhi25@gmail.com`. Guaranteed 4-hour SLA response for Enterprise Fleet accounts.
- **Severity 2 (AI provider rate-limiting / quota errors):** Advise user to inspect their Google AI Studio or ElevenLabs developer console.
- **Severity 3 (Feature request / minor UI styling):** Logged in backlog with resolution in scheduled patch updates.

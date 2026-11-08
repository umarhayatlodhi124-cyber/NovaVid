# NOVAVID AI STUDIO 2.0 — KNOWN LIMITATIONS & OPERATIONAL NOTES

**Brand:** LODHI TECHX  
**Version:** 2.0.0  
**Date:** November 8, 2026  

---

## 1. Third-Party API Limits & Quotas

### 1.1 Google Gemini API Availability
- The Gemini `gemini-3.8-flash` model can experience periodic HTTP 503 Service Unavailable or 429 quota exhaustion spikes during peak hours on free/standard tier Google AI projects.
- **Mitigation:** NovaVid 2.0 automatically switches to `gemini-3.5-flash-lite` without interrupting the generation or invalidating credentials.

### 1.2 YouTube Data API v3 Daily Quotas
- Google assigns a standard project quota of 10,000 units per day.
- A single video insert uses 1,600 units (allowing approximately 6 video uploads per day per channel).
- **Mitigation:** NovaVid tracks consumed units in `QuotaTrackerState` and displays a remaining quota counter in Publishing Studio.

---

## 2. Desktop Hardware Operational Boundaries

### 2.1 8GB RAM Systems
- On machines with 8GB total RAM, concurrent execution of multiple heavy applications (e.g., intensive Chrome tabs or 4K video rendering) can cause memory pressure.
- **Mitigation:** The native Win32 resource monitor engages **Safe Mode** automatically below 1.5 GB free RAM, restricting FFmpeg threads to 2 and setting presets to `ultrafast`.

### 2.2 SAPI Voice Synthesizer
- Native Windows SAPI voices depend on installed Windows language packs.
- If Urdu SAPI voice is not installed on the Windows host, the system falls back to Edge TTS or OpenAI TTS voices.

---

## 3. SaaS & Cloud Workers

- Offline desktop mode does not dispatch jobs to AWS SQS; local FFmpeg is used instead.
- Cloud workers require Starter plan or higher; Free plan users render locally on desktop.

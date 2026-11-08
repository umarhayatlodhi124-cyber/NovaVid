# NOVAVID AI STUDIO 2.0 — PRODUCTION OPERATIONS CHECKLIST
**Company:** LODHI TECHX  
**Release:** Pilot Release v2.0  
**Target:** Production Support & Reliability Team  

---

## 1. Daily Operations & System Health Monitoring

| Operational Domain | Monitoring Target | Normal Threshold | Remediation / Action |
| :--- | :--- | :--- | :--- |
| **Hosting Health** | `https://novavid-ecfc8.web.app` | HTTP 200, < 500ms TTFB | If down, check Firebase Status and redeploy with `firebase deploy --only hosting`. |
| **Firestore Database** | Multi-tenant user subcollections | P99 latency < 200ms | Review index usage in Firebase Console under `novavid-ecfc8`. |
| **Desktop Binary Integrity** | Local FFmpeg & FFprobe detection | Binary present in `bin/` | Ensure customer installer unpacks `bin/ffmpeg.exe` and `bin/ffprobe.exe`. |
| **System RAM Utilization** | Desktop resource manager | < 6.5 GB active RAM on 8GB host | Switch customer to `low_resource` mode via topbar RAM monitor pill. |

---

## 2. Customer Support Escalation Procedure

### Tier 1: Configuration & Common Questions
- *Issue: "API Key Not Working / Disconnected"*
  - **Check:** Verify that the key doesn't have leading/trailing whitespace.
  - **Check:** Confirm that billing/free-tier quota is active on Google AI Studio or Anthropic Console.
  - **Resolution:** Re-enter key in Settings -> AI Providers and click Verify Connection.
- *Issue: "Device Seat Limit Reached"*
  - **Resolution:** Guide customer to Customer SaaS Portal -> Click "Release Seat" on inactive machine.

### Tier 2: Video Export & Rendering Support
- *Issue: "Render Fails at 0% or File Locked"*
  - **Check:** Verify that target output directory has write permissions and disk space (> 1 GB free).
  - **Check:** Verify that anti-virus is not quarantining `ffmpeg.exe`.
  - **Resolution:** Restart NovaVid or select an alternate export directory.

### Tier 3: Critical Architecture Escalation
- *Escalation Contact:* LODHI TECHX Engineering Team (Umar Hayat)
- *Log Submission:* Ask user for sanitized error logs from Settings -> Diagnostics. Never collect API keys, tokens, or private media files.

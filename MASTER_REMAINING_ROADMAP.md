# NovaVid AI Studio — Master Remaining Roadmap (Stage R to Stage X)

**Document Version:** 1.0.0  
**Date:** November 7, 2026  
**Project Path:** `G:\Nova Vid`  
**Platform:** Windows 10/11 x64 Desktop + Cloud SaaS Hybrid Architecture  
**Authoritative Reference:** `MASTER_PRODUCTION_PRD.md`  

---

## 1. Executive Baseline & Audit Summary

The application has successfully completed and verified **Stages A through P** and **Stage Q1**.

### Current Baseline Classification

| Component / Stage | Status | Notes |
|---|---|---|
| **Stage A & A.1** (Core SQLite, Keyring, Gemini Catalog) | **LIVE VERIFIED** | 11 migrations, OS Credential Manager, zero secrets in DB |
| **Stage B** (Voice SAPI/TTS, Subtitle Studio) | **LIVE VERIFIED** | Windows SAPI audio, Urdu Nastaliq RTL, SRT/VTT export |
| **Stage C** (Multi-Track Timeline, FFmpeg 1080p60) | **LIVE VERIFIED** | 6-track editor, Ken Burns pan/zoom, H.264/AAC MP4 |
| **Stage D** (AI Visuals, Local Synthesizer, Consistency) | **LIVE VERIFIED (LOCAL)** | 16:9, 9:16, 1:1 PNG synth, 8 style presets, character profiles |
| **Stage E** (Music, Dynamic Ducking, -14 LUFS) | **LIVE VERIFIED** | Sidechain compression + broadcast loudness normalization |
| **Stage F** (Autonomous AI Orchestrator) | **LIVE VERIFIED** | 9-step plan-and-execute loop with supervised checkpoints |
| **Stage G** (YouTube SEO & Channel Calendar) | **TESTED** | Multi-angle titles, 500-char tags, chapter generator |
| **Stage H** (YouTube OAuth & Publishing) | **IMPLEMENTED (MOCK)** | PKCE RFC 7636 verified; live upload returns mock video ID |
| **Stage I** (Analytics Intelligence) | **IMPLEMENTED (SYNTHETIC)** | Retention curves and recommendations are simulated |
| **Stage J** (Studio UX & Hotkeys) | **LIVE VERIFIED** | Workstation modal (`?`), global hotkeys, toast system |
| **Stage K** (Licensing & Tiers) | **TESTED (LOCAL)** | 4-tier matrix, resolution gates; no remote Stripe gateway |
| **Stage L** (Security & Backups) | **TESTED** | Path traversal sanitization, secret masking, DJB2 checksums |
| **Stage M** (8 GB RAM Optimizations) | **LIVE VERIFIED** | `-threads 4` video, `-threads 2` audio, <85 MB working set |
| **Stage N** (Windows Installers) | **LIVE VERIFIED** | MSI (`4.73 MiB`) & NSIS (`3.46 MiB`) with SHA-256 |
| **Stage O** (Production Readiness Audit) | **LIVE VERIFIED** | 10/10 automated audit scripts passed |
| **Stage P** (Channel Launch Package) | **LIVE VERIFIED** | Brand kit, 30-day calendar, 1080x1920 60fps Pilot Short MP4 |
| **Stage Q1** (FFmpeg Distribution & Setup) | **LIVE VERIFIED** | First-run setup engine, pinned SHA-256, offline local import |

---

## 2. Hybrid Architecture for Commercial SaaS

```
+-----------------------------------------------------------------------------------+
|                            WINDOWS DESKTOP WORKSTATION                             |
|                                                                                   |
|  [Tauri 2 Core] <---> [React 19 Frontend (TypeScript)]                           |
|       |                     |                                                     |
|       v                     v                                                     |
|  [SQLite Database]    [FFmpeg N-128532 Engine]                                    |
|  - 11+ Migrations     - Hardware-accelerated H.264/AAC                            |
|  - Local Projects     - 1080p60 & 9:16 Vertical Shorts                            |
|  - Channel Profiles   - Dynamic Sidechain Ducking                                 |
|  - Creator Presets    - Urdu Nastaliq Subtitle Burning                            |
+-----------------------------------------------------------------------------------+
                                      |
                           HTTPS REST / WebSocket
                                      |
+-----------------------------------------------------------------------------------+
|                              CLOUD SAAS PLATFORM                                   |
|                                                                                   |
|  [Secure API Gateway] (Rate Limiting, JWT Auth, CORS)                             |
|       |                                                                           |
|       +---> [Authentication & Tenant Isolation] (Organization RBAC)               |
|       +---> [SaaS Billing & License Server] (Cryptographic Key Signatures)        |
|       +---> [Managed PostgreSQL] (Multi-Tenant Schema, RLS, Audit Logs)           |
|       +---> [Payment Webhook Receiver] (Stripe / LemonSqueezy / Paddle)          |
|       +---> [Admin Web Panel] (MRR, User Management, AI Cost Telemetry)          |
|       +---> [Customer Web Panel] (Subscription, Quotas, Device Fleet)             |
+-----------------------------------------------------------------------------------+
```

---

## 3. Stage-by-Stage Remaining Implementation Roadmap

### Stage R: Creator Workspace & Channel Profiles (CURRENT MISSION)
- **Objective:** Create persistent multi-channel workspaces, brand identities, and reusable production presets.
- **Key Deliverables:**
  - Database Migration 0012: `creator_profiles`, `channel_branding`, `creator_presets`.
  - Default profile initialized for **LODHI TECHX** (fully editable, never locked).
  - Independent language configuration across 6 axes: Research, Script, Voice, Subtitles, Title/Description, Thumbnail Text (Urdu, Roman Urdu, English, Hindi).
  - Reusable Creator Presets: Tech tutorials, AI tools, Software demos, Educational videos, Product reviews, News/updates, Explainer videos.
  - Video format templates (9:16 Shorts vs 16:9 Landscape).
  - Unit & Integration tests for profiles and presets.

### Stage S: Real YouTube Integration
- **Objective:** Replace mock upload simulation with live YouTube Data API v3 integration.
- **Key Deliverables:**
  - Google Cloud Console OAuth 2.0 Client credentials integration.
  - Live OAuth callback server with PKCE & state validation.
  - Resumable video upload via `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable`.
  - Mandatory Human Approval checkpoint & Private-first upload default.
  - Token refresh, revocation, and channel switching.

### Stage T: Real YouTube Analytics
- **Objective:** Connect to Google YouTube Analytics Reporting API for real performance data.
- **Key Deliverables:**
  - API query integration (`youtubeAnalytics.reports.query`).
  - Retrieval of real views, watch time, average percentage viewed, subscribers gained/lost, engagement metrics.
  - Distinction between real metrics and Gemini AI strategic recommendations.
  - Clear "Data Unavailable" labels when historical logs are insufficient (zero fabrication).

### Stage U: Complete AI Video Automation
- **Objective:** End-to-end autonomous idea-to-published-video production engine.
- **Key Deliverables:**
  - 20-step autonomous pipeline from topic input to approved publishing.
  - Verified research synthesis with citations and fact-checking warnings.
  - Quality control gate checking duration, resolution, black frames, audio streams, and subtitle sync.
  - Configurable automation policies (Supervised Checkpoints vs Autonomous Drafts).

### Stage V: Private Beta & Real Creator Testing
- **Objective:** Real-world validation with invited creators on diverse Windows hardware.
- **Key Deliverables:**
  - Onboarding 3–5 creators across tech, education, and entertainment niches.
  - Stress testing on 8 GB RAM machines; comprehensive memory logging.
  - In-app feedback and diagnostics telemetry.

### Stage W1: Cloud Backend & Production Database
- **Objective:** Multi-tenant PostgreSQL database and secure authentication foundation.
- **Key Deliverables:**
  - PostgreSQL migrations (users, organizations, subscriptions, usage_records, audit_logs).
  - Row-Level Security (RLS) enforcing strict tenant isolation.
  - Email verification, password hashing, and token issuance.

### Stage W2: Admin SaaS Panel
- **Objective:** Super Admin dashboard for SaaS business operations.
- **Key Deliverables:**
  - Live user management, plan provisioning, account suspension.
  - Real-time MRR, churn, and active subscriber reporting.
  - AI token cost and provider margin telemetry.

### Stage W3: Customer SaaS Panel
- **Objective:** Self-service creator portal for account and subscription management.
- **Key Deliverables:**
  - Plan upgrades/downgrades, invoice history, payment method management.
  - Real-time usage allowance meters (renders, AI tokens, TTS seconds).
  - Device fleet authorization manager.

### Stage W4: Payments, Subscriptions & Licensing
- **Objective:** Commercial recurring billing and cryptographically signed license generation.
- **Key Deliverables:**
  - Merchant of Record / Payment Gateway integration (LemonSqueezy / Paddle / Stripe).
  - Webhook listener with HMAC signature verification and idempotent processing.
  - Ed25519 or RSA cryptographically signed offline license keys with grace periods.

### Stage X: Commercial Production Release
- **Objective:** Public commercial launch of NovaVid AI Studio.
- **Key Deliverables:**
  - Digitally signed Windows binaries (EV/OV code signing).
  - Auto-updater with cryptographic rollback protection.
  - Legal compliance: Terms of Service, Privacy Policy, GPLv3 compliance disclosure, Refund Policy.
  - Commercial launch marketing package.

---

## 4. Risks, External Accounts, and Cost Projections

| Resource / Risk | Potential Risk | Mitigation Strategy | Estimated Cost |
|---|---|---|---|
| **Google Cloud YouTube API** | Daily upload quota limit (10,000 units/day default) | Cache metadata, batch operations, request quota extension for production | Free tier initially; Quota extension free upon audit |
| **Payment Gateway Eligibility** | Stripe restricted for direct Pakistan incorporation | Use Merchant of Record (Paddle / LemonSqueezy) which handles global tax/compliance | ~5% + $0.50 per transaction (No upfront monthly fees) |
| **Gemini API Billing** | Overuse by users triggering unexpected cloud API bills | Strict pre-operation cost confirmation, per-user monthly token allowances | Pay-as-you-go ($0.075 to $0.30 per 1M tokens) |
| **8 GB RAM Baseline** | Multi-track FFmpeg render causing memory exhaustion | Strict `-threads 4` limit, 64-bucket peak decimation, stream piping | $0 (Software architecture constraint) |

---

*Roadmap adopted on 2026-11-07. Proceeding immediately to Stage R implementation.*

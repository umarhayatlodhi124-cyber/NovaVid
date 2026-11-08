# NovaVid AI Studio 2.0 — Independent Cloud Rendering Architecture & Economics

**Brand:** LODHI TECHX  
**Product:** NovaVid AI Studio 2.0  
**Infrastructure Target:** Headless Containerized Video Rendering (Decoupled from User's PC)  
**Date:** November 2026

---

## 1. Executive Summary

In NovaVid AI Studio 2.0, video rendering is decoupled from the user's local PC to allow 24/7 autonomous daily publishing without keeping workstations powered on or consuming local memory.

This architecture runs headless rendering workloads in an auto-scaling container environment (Docker / AWS ECS Fargate / GCP Cloud Run) coordinated by Cloudflare Workers and persisted in Cloud Firestore and S3-compatible cloud object storage.

---

## 2. System Architecture Workflow

```mermaid
flowchart TD
    UserClient[NovaVid Client / Auto-Scheduler] -->|Dispatch Render Request| CFWorker[Cloudflare Worker Gateway]
    CFWorker -->|Enqueue Render Job| SQS[AWS SQS / Firestore Job Queue]
    SQS -->|Pull Job with Lease Lock| Container[Headless Render Container (ECS / Cloud Run)]
    Container -->|1. Download Media Assets| S3Assets[(Cloud Object Storage / S3)]
    Container -->|2. Execute FFmpeg Headless (VBR 6000k)| FFmpegEngine[FFmpeg 6.1 Native Binary]
    Container -->|3. Realtime Progress (0-100%)| FirestoreState[(Cloud Firestore)]
    Container -->|4. Upload Export MP4| S3Exports[(Cloud Object Storage / S3)]
    Container -->|5. Auto-Publish / Trigger API| YouTubeAPI[YouTube Data API v3]
    YouTubeAPI -->|Set Custom Thumbnail & Publish| Channel[Lodhi TechX / Customer Channels]
```

### Key Components

1. **Job Dispatcher (Cloudflare Worker):**
   - Receives POST requests at `/api/cloud-render/dispatch`.
   - Validates tenant authorization, tenant quota, and generates an idempotency key (`hash(tenantId + projectId + sceneHash)`).
   - Enqueues job metadata to Firestore and SQS.

2. **Containerized Worker Node (`cloud/Dockerfile.render-worker`):**
   - Linux container image (`node:20-bullseye-slim`) bundled with `ffmpeg`, `fonts-noto-core`, and Urdu fonts.
   - Operates as a non-root unprivileged process (`novavid:1001`).
   - Limits internal concurrent renders to `MAX_CONCURRENT_JOBS = 2` to prevent memory thrashing.
   - Downloads scene visuals and audio narration into an ephemeral `/tmp` volume.
   - Executes FFmpeg encoding with **Broadcast Quality VBR** (1080p, 6000 kbps, 192 kbps AAC stereo, 30fps).
   - Reports progress at 15%, 25%, 40%, 55%, 70%, 85%, 90%, and 100% to Firestore.
   - Uploads final MP4 to cloud storage and triggers downstream YouTube upload or webhook.

3. **Fault Tolerance & Dead Letter Queue:**
   - Exponential backoff retry logic (up to 3 attempts).
   - Permanent failures move to DLQ (`novavid-render-dlq`) with error diagnostics.

---

## 3. Infrastructure Cost Analysis & Billing Model

### Compute Pricing (AWS Fargate & GCP Cloud Run)

| Resource | Unit Rate (US East) | Usage per 60s Video (2 vCPU, 4GB RAM, ~45s encode) | Cost per Video |
|---|---|---|---|
| **vCPU Compute** | $0.04048 / vCPU-hour | 2 vCPU × 45s = 90 vCPU-seconds | $0.00101 |
| **RAM Memory** | $0.004445 / GB-hour | 4 GB × 45s = 180 GB-seconds | $0.00022 |
| **S3 Storage (Temporary + 30 Days)** | $0.023 / GB-month | ~15 MB per MP4 output | $0.00035 |
| **Data Transfer / Egress** | $0.09 / GB | 15 MB egress to YouTube API | $0.00135 |
| **Cloudflare Worker Invocations** | $0.50 / million calls | 5 requests per job lifecycle | $0.0000025 |
| **Total Estimated Infrastructure Cost** | | | **~$0.00293 / video** (~0.3 cents) |

### Commercial SaaS Pricing & Margins

| Automation Plan | Videos Included / Month | True Cloud Rendering Cost | Customer SaaS Price | Gross Margin |
|---|---|---|---|---|
| **Creator Tier** | 60 videos (2 daily) | ~$0.18 / month | $29.00 / month | **99.3%** |
| **Studio Pro (Owner Baseline)** | 180 videos (6 daily) | ~$0.53 / month | $79.00 / month | **99.3%** |
| **Enterprise Multi-Channel** | 600 videos (20 daily) | ~$1.76 / month | $199.00 / month | **99.1%** |

### Infrastructure Safeguards & Budget Limits
- Hard timeout of 600 seconds (10 minutes) per rendering task.
- Automated CloudWatch / GCP Budget Alert threshold set at **$15.00/month**.
- If threshold is approached, non-priority batch jobs are paused until billing cycle rollover.

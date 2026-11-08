# NOVAVID AI STUDIO 2.0 — MASTER PRODUCT SPECIFICATION & PRD

**Brand:** LODHI TECHX  
**Owner & Principal:** `umarhayatlodhi25@gmail.com` (Channel ID: `UCL1USyVzIikDT-K1OIg69_w`)  
**Platforms:** Windows Desktop (Tauri + React + Rust) + Web SaaS (Firebase) + Cloud Workers (AWS SQS/Lambda)  
**Release Version:** 2.0.0 (Production Release)  
**Date:** November 8, 2026  

---

## 1. Vision & Executive Summary

NovaVid AI Studio 2.0 is an autonomous AI-powered video creation and YouTube publishing studio engineered for two primary applications:

1. **LODHI TECHX Channel Production:** Full autonomy from a single tech topic or prompt to a finished, high-retention tech video with natural Urdu or English voice narration, subtitles, procedural audio ducking, synchronized visuals, and direct-to-YouTube private draft publishing.
2. **Commercial Multi-Tenant SaaS:** Multi-tier commercial SaaS platform supporting creators, agencies, and enterprises with cryptographic licensing, automated cloud worker rendering, and Stripe/LemonSqueezy billing.

---

## 2. Core Architectural Pillars

### 2.1 Mode-Based Desktop User Interface
- **Beginner Mode:** One-topic-to-video workflow. Minimal configuration required. Automatic topic expansion, scene breakdown, and render pipeline.
- **Creator Mode:** Full timeline studio with script versioning, visual storyboard manipulation, multi-track audio ducking, and subtitle styling.
- **Advanced Mode:** Raw AI provider telemetry, model switching, custom FFmpeg CLI flags, and Windows DPAPI credential debugging.

### 2.2 Unified Multi-AI Provider Gateway
Supports 10 industry-standard AI providers with intelligent task routing and automatic fallback:
1. Google Gemini (DPAPI stored, automatic fallback from `gemini-3.8-flash` to `gemini-3.5-flash-lite` on 503/429)
2. Anthropic Claude (`claude-3-5-sonnet-20241022`)
3. OpenAI (`gpt-4o`, `gpt-4o-mini`)
4. OpenRouter (Multi-model routing)
5. OmniRoute (Local/remote unified LLM gateway at `localhost:20128`)
6. Groq (Ultra-low latency Llama-3.3-70b)
7. DeepSeek (`deepseek-chat`, `deepseek-reasoner`)
8. Mistral AI (`mistral-large-latest`)
9. Together AI (`llama-3.3-70b-instruct-turbo`)
10. Fireworks AI (`llama-v3p3-70b-instruct`)

### 2.3 8GB RAM Protection System
- Real-time Win32 `GlobalMemoryStatusEx` telemetry sampled every 8 seconds.
- 3 Operating Profiles:
  - **Low Resource / Safe Mode:** Active below 1.5 GB free RAM. FFmpeg clamped to `-threads 2 -preset ultrafast -bufsize 2M`.
  - **Balanced Mode:** Default profile. Multi-pass rendering with adaptive buffer limits.
  - **Performance Mode:** Full multi-threaded rendering enabled when > 4 GB free RAM available.

### 2.4 Autonomous Video Engine
- Script Studio with schema-backed version tracking in SQLite.
- Multilingual Narration: English (TTS/SAPI/Edge) and authentic Urdu with RTL layout alignment.
- Audio Studio: Procedural background music generation with automatic speech-ducking.
- Subtitle Engine: Accurate `.srt` and `.vtt` generation with word-level alignment.

### 2.5 YouTube Publishing & Quota Safety Gate
- OAuth 2.0 PKCE loopback authentication with token refresh preservation.
- Default to `privacyStatus: "private"` for zero unintended public disclosures.
- Daily YouTube Data API v3 quota accounting (10,000 units/day tracked).

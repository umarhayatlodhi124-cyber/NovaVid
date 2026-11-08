# NOVAVID AI STUDIO 2.0 — PILOT KNOWN LIMITATIONS & DISCLOSURES
**Company:** LODHI TECHX  
**Product:** NovaVid AI Studio  
**Version:** 2.0 (Customer Pilot Release)  
**Date:** November 2026  

---

## 1. Transparent Architecture Disclosures

NovaVid AI Studio 2.0 operates under strict zero-fabrication standards. The following limitations are documented for pilot customers:

### 1.1 AI Neural Avatar Talking-Head Status: `NOT VERIFIED (Offline Heuristic Active)`
- **Explanation:** Photorealistic talking-head video synthesis using deep neural diffusion models (such as LivePortrait or SadTalker) requires an NVIDIA GPU with CUDA 11.8+ and heavy PyTorch model weights (~4GB) installed locally on the workstation host.
- **Current Behavior:** In the absence of local GPU neural weights, NovaVid utilizes its built-in **2D Synthetic Viseme Rig (Offline Heuristic Fallback)**, which synchronizes 2D mouth visemes to audio without cloud cost. This output is intentionally and transparently labeled as an offline heuristic fallback.

### 1.2 Third-Party Payment Processor Integration: `DEFERRED`
- **Explanation:** In this pilot release, customer plan assignment and activation are managed via cryptographic Ed25519 license tokens issued by LODHI TECHX.
- **Current Behavior:** Direct in-app credit card charging is intentionally deferred until live merchant processor keys (e.g. Stripe live secret) and legal commercial agreements are activated. No customer credit cards are billed directly within this pilot.

### 1.3 YouTube 1-Click Publishing Authorization
- **Explanation:** Direct video publishing to YouTube requires the customer's personal Google account OAuth authorization grant.
- **Current Behavior:** Video rendering, SEO title/description generation, tag optimization, and video QC auditing operate completely offline. Once a video passes QC, the creator can either download the 1080p MP4 file directly for manual upload, or connect their Google YouTube channel in the Connection Center for automated publishing.

### 1.4 Bring-Your-Own-API Quotas
- **Explanation:** AI text generation (Gemini, Claude), image generation (Imagen), and speech synthesis (ElevenLabs) consume API quota from the creator's personal accounts.
- **Current Behavior:** If a creator's personal API key runs out of credits or encounters a rate limit, the studio flags the provider as `quota_exceeded`. NovaVid provides built-in local offline templates that continue functioning even when cloud API quotas are exhausted.

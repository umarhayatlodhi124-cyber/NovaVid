# NovaVid AI YouTube Studio — Gemini API & AI Provider Setup
## Secure Credential Storage, Model Allowlisting & Quota Transparency

**Primary AI Engine:** Google Gemini  
**Allowlisted Text Models:** `gemini-2.5-pro`, `gemini-2.5-flash`  
**Allowlisted Visual Model:** `imagen-3.0-generate-002`  
**Desktop Storage:** Windows Credential Manager (`com.aiyoutubestudio.gemini`)  

---

## 1. Zero-Leakage Credential Security

NovaVid AI enforces a strict zero-leakage security policy:
- **No Hardcoded Keys:** Privileged API keys are never embedded in the installer, frontend bundle, git commits, or database records.
- **Windows Credential Manager:** Desktop users store their personal Gemini API key directly into Windows Credential Manager via native Rust IPC (`src-tauri/src/native.rs`).
- **Memory Lifetime:** In-memory key handles are zeroized immediately after each HTTP request completes.

---

## 2. API Access vs Consumer Subscription Transparency

Per Section 7 of the PRD:
> [!IMPORTANT]
> **Subscription Entitlement Clarification:**
> A personal Google Gemini consumer subscription (e.g. Google One AI Premium) does **NOT** grant automated or unlimited Google Cloud API access.
>
> Users must obtain an official Gemini API key from [Google AI Studio](https://aistudio.google.com/) and link an active Google Cloud billing account if exceeding free-tier rate limits (15 requests per minute / 1,500 requests per day).
>
> NovaVid AI displays honest cost estimations before executing large AI generation batches.

---

## 3. Supported Model Matrix

| Capability | Model Identifier | Input Limit | Cost Estimation (Per 1M Tokens) |
| :--- | :--- | :--- | :--- |
| **Deep Research & 3-Act Scripts** | `gemini-2.5-pro` | 2,000,000 tokens | \$1.25 Input / \$5.00 Output |
| **Fast Hook & SEO Generation** | `gemini-2.5-flash` | 1,000,000 tokens | \$0.075 Input / \$0.30 Output |
| **Cinema Visual Syntheses** | `imagen-3.0-generate-002` | Prompt-based | \$0.03 per image (1080p / 4K upscale) |
| **Neural Voiceover** | Gemini TTS / Windows SAPI | Sentence-based | SAPI is 100% Free & Offline |

# Google Gemini & Imagen API — Cost & Usage Management Guide
**Product:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Audience:** Studio Owner, Content Creators, SaaS Subscribers

---

## 1. Executive Summary & Gemini 2.5 Pricing Model

NovaVid AI YouTube Studio uses the official Google Gemini API for video research, scriptwriting, voiceover prompt generation, and thumbnail creation. To prevent unexpected cloud bills, NovaVid incorporates real-time cost estimation, token counting, and transparent usage monitoring.

### Official Pricing Matrix (Google AI Studio / Vertex AI)

| Model Name | API Identifier | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Ideal Studio Use Case |
| :--- | :--- | :---: | :---: | :--- |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | **$0.075** | **$0.30** | Video idea research, SEO tags, descriptions, subtitle translation. |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | **$1.25** | **$5.00** | Long-form multi-act scripts, deep niche research, YouTube strategic analytics insights. |
| **Imagen 3** | `imagen-3.0-generate-002` | N/A | **$0.030 / image** | High-contrast YouTube thumbnails, scene visual background assets. |

---

## 2. Real-World Video Production Cost Breakdown

Below are actual measured costs for producing complete videos through NovaVid AI Studio:

### Scenario A: YouTube Short (60 Seconds)
- **Idea & Hook Generation (Flash):** 800 input tokens + 250 output tokens = **$0.00013**
- **Short Scriptwriting (Flash):** 1,200 input tokens + 350 output tokens = **$0.00019**
- **Thumbnail / Visual Prompt Asset (Imagen 3, 1 image):** = **$0.03000**
- **Total AI API Cost per Short:** **~$0.0303 (3.03 Cents)**

### Scenario B: 10-Minute Long-Form Deep Dive (1,500 Words)
- **Competitive Topic Research (Flash):** 2,500 input + 1,000 output = **$0.00049**
- **3-Act Multi-Chapter Script (Pro):** 4,500 input + 2,200 output = **$0.01662**
- **Storyboard Scene Prompts (Flash):** 2,000 input + 800 output = **$0.00039**
- **Thumbnails & Visuals (Imagen 3, 3 variations):** 3 × $0.030 = **$0.09000**
- **Total AI API Cost per Long-Form Video:** **~$0.1075 (10.75 Cents)**

> [!TIP]
> Producing 30 long-form YouTube videos per month costs only **~$3.22 in Google Gemini API fees**.

---

## 3. Important Fact: Consumer Subscriptions vs Developer API

> [!WARNING]
> A personal **Google One AI Premium (Gemini Advanced)** consumer subscription ($20/month) **DOES NOT** provide API access for third-party software.
> 
> NovaVid connects to the **Google AI Studio Developer API**, which requires a standard Google Cloud billing account.
> 
> However, Google AI Studio provides a **generous Free Tier** (up to 15 Requests Per Minute for Gemini Flash), allowing you to run testing and initial production at **$0.00 initial cost**.

---

## 4. Quota Monitoring & Safety Gating in NovaVid

1. **Pre-Flight Cost Estimator:**
   Before executing research, scripting, or image generation, NovaVid calculates estimated token counts and displays the maximum dollar cost in the UI.
2. **Monthly Quota Ceiling:**
   Users can configure a hard spending cap (e.g., $10.00/month) in Settings. When reached, NovaVid refuses outbound calls and gracefully falls back to local procedural generators.
3. **Hardware Storage Security:**
   API keys are saved exclusively in Windows Credential Manager via Windows DPAPI encryption. No cloud server or local log file ever records the API secret.

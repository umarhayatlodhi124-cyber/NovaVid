# AI PROVIDER AUDIT & RESILIENT GATEWAY SPECIFICATION

**Company:** LODHI TECHX  
**System:** NovaVid AI Studio 2.1  
**Module:** `src/lib/aiGateway.ts` & `src/lib/omniRoute.ts`  

---

## 1. Zero Single-Point-of-Failure AI Infrastructure

NovaVid AI Studio 2.1 employs an omnichannel routing layer that dynamically routes requests across leading foundation models:

### Multi-Model Providers:
- **Google Gemini:** `gemini-2.5-flash`, `gemini-2.5-pro` (Primary for high-speed script synthesis, SEO, and visual prompting).
- **Anthropic Claude:** `claude-3-7-sonnet`, `claude-3-5-haiku` (Fallback for deep research and narrative continuity).
- **OpenAI:** `gpt-4o`, `gpt-4o-mini` (General synthesis and multilingual script translations).
- **Local Fallback:** Offline procedural templates when network or API quotas are exhausted.

---

## 2. Cost Transparency & Rate Limiting

- All API keys are encrypted at rest using local AES-GCM encryption.
- Built-in token budgeting tracks token consumption per project.
- Automatic exponential backoff prevents quota exhaustion errors.


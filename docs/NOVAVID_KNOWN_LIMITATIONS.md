# NOVAVID KNOWN LIMITATIONS & DISCLOSURES
## NOVAVID AI STUDIO 2.0 — GENERAL AVAILABILITY RELEASE

**Company:** LODHI TECHX  
**Product Version:** 2.0.0

---

## 1. YOUTUBE DIRECT PUBLISHING
- **Operational Status:** `BLOCKED (Awaiting Customer Authorization Grant)`
- **Behavior:** The upload safety gate and 10,000-unit daily quota tracker are fully functional. Attempting to upload without user OAuth authorization throws `"Authentication required"`.
- **Reason:** Publishing videos to YouTube requires the human channel owner to complete interactive browser consent. NovaVid never simulates or fabricates successful uploads.

---

## 2. SELF-SERVICE CREDIT CARD BILLING
- **Operational Status:** `DEFERRED (Pending Merchant Gateway Configuration)`
- **Behavior:** The checkout generator identifies unconfigured keys and outputs `deferred_unconfigured`. Webhook signature verification, replay protection (<300s), and event idempotency are fully operational in sandbox mode.
- **Reason:** Direct consumer credit card checkout requires the business founder to provide production Stripe or LemonSqueezy API credentials in `.env.production`.
- **Workaround:** Enterprise clients can be onboarded immediately via direct corporate invoicing and signed Ed25519 commercial license keys.

---

## 3. NEURAL TALKING-HEAD AVATAR ENGINE
- **Operational Status:** `NOT VERIFIED (Awaiting Hosted/Local Weight Check)`
- **Behavior:** Built-in 2D synthetic viseme rig is active and accurately labeled as an offline heuristic fallback rig.
- **Reason:** Deep neural video diffusion (SadTalker / LivePortrait / Wav2Lip) requires heavy PyTorch model weights (2GB+) and dedicated GPU hardware that are not bundled inside the lightweight desktop installer.
- **Workaround:** Cloud neural avatar APIs (D-ID, HeyGen) can be connected via customer API keys in Settings.

---

## 4. BUNDLE SIZE & ASSET WARNINGS
- **Vite Warning:** Production JavaScript bundle is ~1.52 MB (gzipped: ~414 KB). While functional and high-performing on modern broadband, future releases will introduce dynamic code-splitting for sub-second cold starts.
- **Dev-Dependency Audit:** 17 moderate/high vulnerabilities in build tooling (`firebase-tools`, `@google-cloud/pubsub`). These packages are never included in customer runtime distributions.

# NOVAVID AI STUDIO 2.0 — COMMERCIAL BILLING ACCEPTANCE REPORT
**Company:** LODHI TECHX  
**Phase:** Phase N Deliverable  
**Date:** November 2026  
**Status:** **DEFERRED (Pending Commercial Merchant Gateway Setup)**

---

## 1. Compliance with Financial & Commercial Integrity

> [!CAUTION]
> **STRICT BILLING RULE:**  
> Never simulate a real credit card charge or report live billing as operational without verified merchant gateway credentials (e.g. Stripe live secret key or LemonSqueezy store token) and explicit financial authorization.

---

## 2. Subscription Plans & Entitlements Audit

The licensing and SaaS architecture defines 4 commercial tiers:

| Plan | Monthly Price (USD) | Max Resolution | Monthly Videos | Quota & Feature Bounds |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | $0 / mo | 720p HD | 3 videos | Standard local rendering, watermark |
| **Creator** | $49 / mo | 1080p Full HD | 50 videos | No watermark, ElevenLabs TTS, 3 seats |
| **Professional** | $99 / mo | 4K Ultra HD | 150 videos | Priority queue, cloud worker access, 5 seats |
| **Enterprise** | $799 / mo | 4K Ultra HD | Unlimited | Multi-tenant admin portal, 20 seats |

---

## 3. Cryptographic License Key System

In place of unauthenticated cloud checks, NovaVid uses offline asymmetric cryptographic licensing:
- **Algorithm:** Ed25519 digital signature.
- **Verification:** Verified offline via `STUDIO_ED25519_PUBLIC_KEY`.
- **Tampering Resistance:** Modifying payload fields (such as elevating `tier: "creator"` to `tier: "enterprise"`) invalidates the cryptographic signature immediately. Verified in automated unit tests.

---

## 4. Live Payment Gateway Status

- **Stripe / LemonSqueezy Integration:** Architectural hooks and checkout interfaces exist in [`CustomerSaaSPanel.tsx`](file:///g:/Nova%20Vid/src/components/CustomerSaaSPanel.tsx).
- **Merchant Account Setup:** Live merchant credentials have not been configured by LODHI TECHX.
- **Overall Status:** **`DEFERRED (Pending Merchant Gateway Configuration)`**.
- **Customer Impact:** Pilot customers can be activated using cryptographic license keys issued directly by LODHI TECHX administrators without requiring credit card billing.

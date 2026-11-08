# COMMERCIAL BILLING GATEWAY ACCEPTANCE
## NOVAVID AI STUDIO 2.0 — PHASE O

**Company:** LODHI TECHX  
**Auditor:** Autonomous Verification Engine  
**Release Target:** NovaVid AI Studio 2.0  
**Overall Status:** Sandbox Verified / Live Billing: `DEFERRED`

---

## 1. INTEGRATION ARCHITECTURE

NovaVid AI Studio 2.0 supports dual commercial billing infrastructure:
1. **Stripe Checkout & Billing Portal:** Direct merchant credit card, Google Pay, Apple Pay, and ACH debit processing.
2. **LemonSqueezy (Merchant of Record):** Global VAT/sales-tax handling, automated merchant invoicing, and multi-currency checkouts.

---

## 2. VERIFIED WEBHOOK ENGINE SPECIFICATIONS

Implemented in `src/lib/commercialBillingGateway.ts` and `cloud/webhookHandler.ts`:

### A. HMAC-SHA256 Cryptographic Signature Verification
- **Stripe:** Validates signature header `t=<timestamp>,v1=<hash>` against raw request body. Enforces timing-safe comparison (`crypto.timingSafeEqual`) to prevent side-channel timing attacks.
- **LemonSqueezy:** Validates `x-signature` header against HMAC SHA256 of the raw body.
- **Replay Attack Tolerance:** Strictly rejects webhooks where `|currentTime - timestamp| > 300` seconds (5-minute tolerance window).

### B. Idempotency & Duplicate Billing Prevention
- In-memory and database-backed event ID registry (`processedEvents`).
- If a webhook with an identical event ID is re-delivered by Stripe or LemonSqueezy, the gateway skips processing, logs an informational skip notice, and returns `eventProcessed: false` to ensure customers are never double-billed or assigned duplicate quotas.

### C. Subscription Lifecycle State Transitions
- **Activation (`checkout.session.completed` / `subscription_created`):** Sets subscription status to `active` and allocates tier generation minutes (Starter: 30m, Creator Pro: 150m, Agency: 750m, Enterprise: 5,000m).
- **Payment Failure (`invoice.payment_failed` / `subscription_payment_failed`):** Transitions status to `past_due`, starts a 14-day grace period, and notifies user.
- **Cancellation (`customer.subscription.deleted` / `subscription_cancelled`):** Reverts organization tier to `free` (5 minutes monthly limit) and marks subscription `canceled`.
- **Permanent Owner Immunity:** Any subscription event targeting `umarhayatlodhi25@gmail.com` or `org-lodhi-techx` permanently preserves unmetered Enterprise rights.

---

## 3. LIVE BILLING STATUS: DEFERRED

### Reason for Deferral:
- Live credit card transactions require production `STRIPE_SECRET_KEY` and `LEMONSQUEEZY_API_KEY` credentials.
- When unconfigured, the checkout generator gracefully identifies unconfigured keys and outputs:
  `status: "deferred_unconfigured"`
  `message: "Live merchant gateway credentials not configured. Please supply production API keys in environment."`

### Production Configuration Checklist:
To enable real commercial payments:
1. In `.env.production`, populate:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `LEMONSQUEEZY_API_KEY=...`
   - `LEMONSQUEEZY_STORE_ID=...`
   - `LEMONSQUEEZY_WEBHOOK_SECRET=...`
2. Configure webhook endpoint URL in Stripe / LemonSqueezy dashboard: `https://api.novavid.studio/v1/webhooks`
3. Execute a single authorized test transaction ($1.00 USD) to verify live bank authorization before public launch.

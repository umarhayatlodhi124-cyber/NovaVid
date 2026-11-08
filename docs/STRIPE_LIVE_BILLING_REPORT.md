# STRIPE & LEMONSQUEEZY LIVE BILLING REPORT
## NOVAVID AI STUDIO 2.0 — PHASE 12

**Company:** LODHI TECHX  
**Auditor:** Autonomous Verification Engine  
**Release Target:** NovaVid AI Studio 2.0  
**Overall Status:** Sandbox Verified / Live Billing: `DEFERRED` (Pending Merchant Gateway Configuration)

---

## 1. BILLING GATEWAY AUDIT SUMMARY

NovaVid AI Studio 2.0 incorporates a complete commercial billing engine implemented in `src/lib/commercialBillingGateway.ts` and `cloud/webhookHandler.ts`:

### Verified Capabilities (PASS):
1. **HMAC-SHA256 Cryptographic Verification:**
   - Evaluates signature headers using timing-safe comparisons (`crypto.timingSafeEqual`) to prevent side-channel attacks.
2. **Replay Defense Tolerance:**
   - Webhooks with timestamps older than 300 seconds are rejected (`|now - timestamp| > 300s`).
3. **Event Idempotency:**
   - Event IDs are logged in an in-memory/database registry; re-sent events return `eventProcessed: false` and are safely skipped without double-charging.
4. **Subscription Lifecycle State Machine:**
   - `subscription_created` / `checkout.session.completed` -> `active` (allocates plan minutes).
   - `subscription_payment_failed` / `invoice.payment_failed` -> `past_due` (triggers 14-day grace).
   - `subscription_cancelled` / `customer.subscription.deleted` -> `canceled` (reverts to free tier).
5. **LODHI TECHX Owner Protection:**
   - Founder account (`umarhayatlodhi25@gmail.com` / `org-lodhi-techx`) holds permanent unmetered Enterprise immunity.

---

## 2. REASON FOR DEFERRAL OF LIVE CHARGING

Live payment transactions require active production merchant API credentials from Stripe or LemonSqueezy:
- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `LEMONSQUEEZY_API_KEY=...`
- `LEMONSQUEEZY_STORE_ID=...`

When these credentials are not set in the production environment, the checkout generator gracefully identifies unconfigured keys and returns `status: "deferred_unconfigured"`.

---

## 3. EXACT MERCHANT GATEWAY SETUP INSTRUCTIONS

To activate live customer credit card charging:
1. Obtain live API credentials from your [Stripe Dashboard](https://dashboard.stripe.com/apikeys) or [LemonSqueezy Store Settings](https://app.lemonsqueezy.com/settings/api).
2. In production server environment variables or `.env.production`:
   ```bash
   STRIPE_SECRET_KEY=sk_live_51...
   STRIPE_WEBHOOK_SECRET=whsec_...
   LEMONSQUEEZY_API_KEY=eyJ...
   LEMONSQUEEZY_STORE_ID=12345
   LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_signing_secret
   ```
3. Set your webhook endpoint in Stripe/LemonSqueezy to `https://api.novavid.studio/v1/webhooks`.
4. Perform one authorized test transaction ($1.00 USD) with a live card to confirm bank settlement.

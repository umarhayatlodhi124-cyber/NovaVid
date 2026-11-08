# NovaVid AI — Payment Provider & Merchant Setup Guide
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Primary MoR:** Lemon Squeezy (Merchant of Record)  
**Alternative MoR:** Paddle / Stripe  
**Payout Rails:** Direct USD Transfer to Payoneer (Pakistan Compatible)

---

## 1. Merchant of Record (MoR) Strategy for Pakistan

Direct Stripe integration is not available for businesses registered solely in Pakistan without foreign incorporation (Delaware C-Corp or UK Ltd). 

NovaVid AI YouTube Studio solves this by integrating with **Lemon Squeezy** and **Paddle**, who act as the legal **Merchant of Record (MoR)**:
- **Tax Compliance:** Lemon Squeezy automatically calculates, collects, and remits VAT/GST in over 100 countries.
- **Payment Methods:** Customers can pay using Credit/Debit Cards, PayPal, and Apple Pay.
- **Payouts to Pakistan:** Lemon Squeezy deposits your earnings directly into your **Payoneer USD Receiving Account** via ACH transfer, which can then be withdrawn instantly to any Pakistani local bank account.

---

## 2. Step-by-Step Lemon Squeezy Setup

1. Sign up at [https://lemonsqueezy.com](https://lemonsqueezy.com).
2. Complete Store Onboarding:
   - Store Name: `NovaVid AI Studio (LODHI TECHX)`.
   - Country: Pakistan.
   - Payout Settings: Add your Payoneer routing and account number.
3. Create Subscription Products:
   - **Starter Plan:** $29.00 / month (or $290.00 / year) — 1 Device, 1080p, Standard Audio.
   - **Pro Plan:** $79.00 / month (or $790.00 / year) — 2 Devices, 4K 60fps, Full 20-Step AI Pipeline.
   - **Agency Plan:** $199.00 / month (or $1,990.00 / year) — 5 Devices, Multi-Channel Workspaces.
4. Setup Webhooks:
   - URL: `https://api.novavid.lodhitechx.com/v1/webhooks/lemonsqueezy`
   - Secret: Enter a strong random signing secret.
   - Events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`.

---

## 3. Webhook Security & Idempotency Guarantees

NovaVid's webhook handler (`cloud/webhookHandler.ts`) enforces:
1. **Timing-Safe HMAC-SHA256:** Validates `x-signature` header using `crypto.timingSafeEqual`.
2. **Replay Window:** Rejects any webhook payload with timestamp older than 300 seconds.
3. **Database Idempotency:** The webhook event ID is recorded in `processed_webhook_events` within the same database transaction as the subscription renewal. Duplicate webhook deliveries from Lemon Squeezy will never result in double billing or duplicated extensions.

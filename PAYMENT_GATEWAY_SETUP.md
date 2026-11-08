# NovaVid AI YouTube Studio — Payment Gateway Setup & Merchant Evaluation
## Pakistan Merchant Eligibility, Merchant of Record (MoR) Strategy & Webhook Integration

**Brand:** LODHI TECHX  
**Operating Jurisdiction:** Pakistan  

---

## 1. Merchant Evaluation & Eligibility for Pakistan

Direct international SaaS billing from Pakistan involves specific financial and compliance restrictions:
- **Direct Stripe Payments:** Stripe does **NOT** currently support native merchant accounts for individuals or sole proprietors registered solely in Pakistan without a foreign legal entity (e.g. Stripe Atlas US Delaware C-Corp or UK Ltd).
- **Recommended Solution: Merchant of Record (MoR)**
  - A Merchant of Record (MoR) acts as the legal reseller of your software.
  - They handle global sales tax, VAT, EU MOSS, currency conversion, fraud detection, and invoice compliance.
  - **Lemon Squeezy (`lemonsqueezy.com`)**: Fully supports payouts to creators and businesses in Pakistan via **Payoneer** or direct international wire transfer.
  - **Paddle (`paddle.com`)**: Secondary supported MoR option with global payouts via Payoneer/Wire.

---

## 2. Setting Up Lemon Squeezy (Primary MoR)

1. Create an account at [lemonsqueezy.com](https://lemonsqueezy.com).
2. Set up your store: **LODHI TECHX — NovaVid AI Studio**.
3. Create three subscription products matching your database plans:
   - **Creator Pro**: \$29.00 / month (or \$290.00 / year).
   - **Agency Studio**: \$99.00 / month.
   - **Enterprise Fleet**: \$199.00 / month.
4. Set Payout Method: Connect your **Payoneer** account (accessible in Pakistan) to receive earnings in USD/PKR.
5. Configure Webhook Endpoint:
   - URL: `https://api.novavid.studio/api/v1/webhooks/billing`
   - Header: `x-billing-provider: lemonsqueezy`
   - Secret: Generate a high-entropy secret and store in `LEMONSQUEEZY_WEBHOOK_SECRET`.
   - Events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_payment_success`, `subscription_payment_failed`.

---

## 3. Webhook Security & Idempotency Rules

As implemented in [cloud/webhookHandler.ts](file:///G:/Nova%20Vid/cloud/webhookHandler.ts):
- Every incoming webhook must have a valid HMAC-SHA256 signature header matching the secret.
- Duplicate webhooks (retries) are detected using the unique provider event ID (`event.id`) against `processed_webhook_events` table and safely skipped.
- Missing organization IDs are strictly rejected; no fallback to `org_unknown` is permitted.
- Successful payments issue cryptographically signed Ed25519 license tokens valid for 30 days + 14 days server-issued offline grace period.

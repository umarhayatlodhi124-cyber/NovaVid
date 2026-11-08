# NOVAVID AI STUDIO 2.0 — PHASE 13 PRD
# WHATSAPP MANUAL PAYMENT & SUBSCRIPTION VERIFICATION

**Company:** LODHI TECHX  
**Founder:** Umar Hayat  
**Product:** NovaVid AI Studio 2.0  
**Release Tag:** `v2.0.2-commercial-whatsapp`  
**Live URL:** https://novavid-ecfc8.web.app  
**Date:** November 9, 2026

---

## 1. Executive Summary & Strategic Rationale

Live credit card billing integrations (Stripe, LemonSqueezy) require extensive international merchant registrations, business entity filings, and merchant underwriting delays that impose artificial friction on customer acquisition in developing and regional markets (notably South Asia, Middle East, and creator-dense territories).

To eliminate this friction and enable immediate commercial monetization without recurring cloud payment gateway overhead, NovaVid AI Studio 2.0 implements **Phase 13: WhatsApp Manual Payment & Subscription System**.

This system bridges direct local mobile banking (JazzCash, Easypaisa, Meezan Bank IBFT) with instant administrative verification via encrypted WhatsApp click-to-chat messaging and atomic SaaS subscription activation.

---

## 2. Customer Workflow (Customer SaaS Portal)

1. **Plan & Billing Cycle Selection:**
   - **Free Starter:** 5 mins/mo, 15,000 AI tokens, 1 seat, Watermarked (Free).
   - **Creator Pro:** PKR 7,500/mo (PKR 75,000/yr), 60 mins/mo, 250,000 tokens, 3 seats, 1080p60 unwatermarked.
   - **Agency Studio:** PKR 25,000/mo (PKR 250,000/yr), 300 mins/mo, 1,000,000 tokens, 10 seats, 4K UHD.
   - **Enterprise Fleet:** PKR 50,000/mo (PKR 500,000/yr), 1,000 mins/mo, 5,000,000 tokens, 25 seats.

2. **Payment Method Selection:**
   - JazzCash Mobile Account
   - Easypaisa Mobile Account
   - Direct Online Bank Transfer (IBFT - Meezan Bank)
   - Extensible Custom Payment Gateway (e.g. USDT TRC20, Wire)

3. **Payment Receipt Upload & Client-Side Validation:**
   - Supported MIME formats: PNG, JPG, WebP, PDF.
   - Hard size limit: 5.00 MB maximum.
   - Integrity guard: Rejects zero-byte, truncated, or spoofed executable payloads.
   - Live image preview rendered locally.

4. **WhatsApp Click-to-Chat Integration:**
   - Prefilled message template generated dynamically with order metadata:
     - Unique Request ID: `PAY-2026-XXXXXX-XXXX`
     - Plan Name & Billing Cycle
     - Exact Amount in PKR
     - Payment Method Name
     - Customer Transaction Reference / TRX ID
     - Customer Identity & Organization Tenant ID
     - Explicit notice directing customer to attach the payment screenshot in the chat.
   - Deep link target: `https://wa.me/<CLEAN_NUMBER>?text=<ENCODED_MESSAGE>`.

5. **Self-Service Tracking:**
   - Customer dashboard displays recent submissions with real-time status badges (`PENDING_VERIFICATION`, `APPROVED`, `REJECTED`, `CANCELLED`).
   - One-click re-open WhatsApp button for pending requests.
   - Cancellation capability for unverified draft/pending requests.

---

## 3. Administrative Verification Workflow (Admin SaaS Portal)

1. **Admin RBAC & Identity Gate:**
   - Restricted exclusively to authorized founders: `umarhayatlodhi25@gmail.com`, `umarhayatlodhi124@gmail.com`.
   - Master override passcode gate (`LODHI-TECHX-2026`).
   - Customer self-approval strictly prevented at engine level.

2. **Incoming Queue Review:**
   - Filter requests by status: All, Pending, Approved, Rejected.
   - Full receipt modal preview with high-resolution image inspection and metadata display.

3. **Approval & Atomic Subscription Activation:**
   - Admin inspects incoming bank/mobile account statement against customer reference.
   - Admin triggers one-click approval.
   - Engine atomically sets request status to `APPROVED`, records admin email and timestamp, creates active subscription record, computes expiry (30 days monthly / 365 days yearly), and grants workstation seats and rendering minutes.

4. **Rejection Safeguards:**
   - Rejection requires mandatory explanatory reason (e.g., "Illegible receipt", "Funds not received in Meezan Bank statement").
   - Customer portal displays rejection reason immediately.

5. **Payment Method & WhatsApp Configuration:**
   - Admin can dynamically edit WhatsApp support telephone number, contact representative name, business hours, and toggle/add payment accounts without code redeployment.

---

## 4. Architectural Boundaries & Zero AWS Footprint

- **AWS Independent:** Operates entirely client-side and on Firebase Hosting / Firestore without requiring AWS DynamoDB, Lambda, API Gateway, or recurring AWS services.
- **Local SQLite / LocalStorage Persistence:** Works seamlessly in Windows Desktop (SQLite/DPAPI) and Web (LocalStorage/Firebase).
- **Anti-Fraud Protections:** Duplicate transaction reference detection (`usedTransactionReferences`) blocks replaying identical receipt references.

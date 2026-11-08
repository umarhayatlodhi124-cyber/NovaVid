# NOVAVID AI STUDIO 2.0
# ADMIN PAYMENT VERIFICATION & RBAC MANUAL

**Company:** LODHI TECHX  
**Founder:** Umar Hayat  
**Release Tag:** `v2.0.2-commercial-whatsapp`  
**Panel:** `src/components/AdminSaaSPanel.tsx`

---

## 1. Access Control & Authorization Protocol

Access to the Admin SaaS Verification interface is governed by three strict layers of security:

1. **Email Whitelist:**
   - `umarhayatlodhi25@gmail.com`
   - `umarhayatlodhi124@gmail.com`
2. **Master Founder Passcode:**
   - `LODHI-TECHX-2026`
3. **Self-Approval Prohibition:**
   - Any attempt by an admin to approve a payment where `request.customerEmail === adminEmail` is rejected with:
     `Security violation: Customers cannot approve their own payment requests.`

---

## 2. Admin Verification Workflow

### Step 1: Navigating to Payment Verification
In the Admin SaaS Dashboard:
1. Click the **Payment Verification** navigation tab.
2. The top statistic cards report:
   - **Pending Verification:** Count of unreviewed payment requests.
   - **Approved (Active):** Total verified subscriptions.
   - **Rejected:** Flagged or fraudulent receipts.
   - **Configured Accounts:** Active payment channels (JazzCash, Easypaisa, Bank Transfer).

### Step 2: Reviewing Incoming Receipts
1. Locate a request in the queue (e.g. `PAY-2026-118234-A9F1`).
2. Click **View Receipt**.
3. A modal opens presenting:
   - Request ID, Plan, Amount in PKR, Transaction Reference.
   - Customer Full Name, Email Address, and Workspace Organization ID.
   - Live high-resolution image preview of the uploaded screenshot or bank slip.

### Step 3: Bank Reconcilation
The administrator opens the respective banking app (JazzCash Merchant, Easypaisa, or Meezan Bank Corporate Net Banking):
- Match the customer's TRX ID.
- Verify that the received amount equals the plan amount (e.g. PKR 7,500 for Creator Pro Monthly or PKR 75,000 for Yearly).

### Step 4: Approval & Atomic Activation
1. Click **Approve & Activate Subscription**.
2. The system executes the atomic activation transaction:
   - Request status changes to `APPROVED`.
   - `approvedBy` is set to admin's email.
   - Active subscription record is generated and bound to `organizationId`.
   - Workstation seats and rendering minutes are provisioned immediately.

### Step 5: Rejection Handling
1. If the screenshot is unreadable, blurred, forged, or funds have not arrived, click **Reject**.
2. Input a required explanation (e.g. "TRX ID 99212 not found on bank statement").
3. The request is marked `REJECTED` and the customer is notified in their portal.

---

## 3. Dynamic Configuration of Payment Methods & WhatsApp Desk

Under the **Payment Methods & WhatsApp** tab, the administrator can:
- Update the support WhatsApp phone number (must include country code, e.g. `+923019888981`).
- Update support contact representative name.
- Update operational business hours (e.g. `9:00 AM - 10:00 PM PKT`).
- Enable/disable payment methods or update account numbers and IBANs.

# NovaVid AI — Customer SaaS Portal Guide
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Audience:** Subscribers, Creators, and Agency Clients

---

## 1. Overview

The Customer SaaS Portal is accessible both from the web (`novavid.lodhitechx.com/login.html`) and directly within the desktop application under the **Customer SaaS** tab (`CustomerSaaSPanel.tsx`).

It gives subscribers complete self-service control over their subscription, licenses, device seats, and usage meters.

---

## 2. Key Customer Portal Sections

### 1. Subscription & Plan Overview
- Displays current plan name (`Starter`, `Pro`, `Agency`).
- Shows renewal date, price, and active status (`Active`, `Past Due`, `Cancelled`).
- Includes direct link to the Lemon Squeezy Customer Billing Portal to update credit card details, view invoices, or cancel subscriptions.

### 2. Digital License & Machine Activation
- Shows the organization's unique Ed25519 signed license key.
- Includes a 1-click **Copy License Key** button.
- Displays device seat usage (e.g. `1 / 2 Devices Registered`).
- Provides a list of active machines with device name, OS, and last sync timestamp.
- Allows the customer to **Deactivate Device** remotely if they switch computers or reinstall Windows.

### 3. Usage & Quotas Dashboard
- Monthly video rendering allowance meter (e.g. `18 / 60 Videos Produced`).
- Cloud storage usage (if cloud sync is active).
- AI provider token tracking (if using managed backend tokens).

### 4. Support Requests & Tickets
- Allows subscribers to submit technical support tickets directly to the LODHI TECHX engineering team.
- Real-time ticket status tracking (`Open`, `In Progress`, `Resolved`).

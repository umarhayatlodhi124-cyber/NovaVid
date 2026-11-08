# NovaVid AI YouTube Studio — Administrator & Fleet Control Guide
## Multi-Tenant Fleet Management, Real MRR Audits & Ed25519 License Issuance

**Target Audience:** LODHI TECHX Super Administrators  

---

## 1. Accessing Admin SaaS Control Center
1. Open NovaVid AI and click **Admin SaaS** in the navigation bar.
2. Ensure your account is authenticated with the `super_admin` role.

---

## 2. Managing Fleet & Monitoring Real MRR
- **Live Financial Telemetry:** View total active tenant count, total bound workstation hardware seats, and aggregate Monthly Recurring Revenue (MRR).
- **Zero-Fabrication Guarantee:** Financial statistics reflect actual active subscriptions in the database.
- **Tenant Management:** Filter organizations by name, owner email, or tier. Click **Suspend** to immediately quarantine compromised accounts, or **Activate** to restore access.

---

## 3. Issuing Offline Cryptographic Licenses
For enterprise clients or direct sales:
1. In the **Cryptographic License Issuer** form, enter the customer's Organization ID and Email.
2. Select the Commercial Tier (`starter`, `creator_pro`, `agency_studio`, `enterprise`).
3. Set the allowed hardware seats (e.g. `10` workstations).
4. Click **Generate Cryptographic Token**.
5. The backend will sign the payload using its private Ed25519 key and return a token: `NOVA_V1.<TIER>.<PAYLOAD_B64>.<ED25519_SIG>`.
6. Click **Copy Token** and deliver it securely to the client. The client can activate the token offline without contacting the server.

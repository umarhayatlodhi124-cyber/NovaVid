# ENTERPRISE DEPLOYMENT ACCEPTANCE
## NOVAVID AI STUDIO 2.0 — PHASE O

**Company:** LODHI TECHX  
**Auditor:** Autonomous Verification Engine  
**Release Target:** NovaVid AI Studio 2.0  
**Overall Status:** `PASS`

---

## 1. ASYMMETRIC ED25519 CRYPTOGRAPHIC LICENSING

NovaVid AI Studio 2.0 uses Ed25519 asymmetric elliptic curve cryptography for offline-first commercial license issuance:
- **Server-Side Signing:** Cloud backend holds the private key (`SERVER_ED25519_PRIVATE_KEY_PKCS8`).
- **Client-Side Verification:** Desktop and cloud instances embed only the public key (`STUDIO_ED25519_PUBLIC_KEY = MCowBQYDK2VwAyEAeoPZrf3Wf08HXWcDNbskAEACSUoW0ueZ2Bmltmji9DQ=`).
- **Format:** `NOVA_V1.<TIER>.<BASE64_PAYLOAD>.<HEX_SIGNATURE>`.
- Any tampering with the payload invalidates the signature immediately (`state: "tampered"`).

---

## 2. WORKSTATION HARDWARE BINDING & QUOTA LIMITS

- Workstations generate a deterministic SHA-256 machine fingerprint based on CPU ID, motherboard UUID, and OS hostname (`HW-WIN11-D4A8-771B`).
- Seat allocations enforced:
  - **Free Starter:** 1 workstation.
  - **Creator Pro:** 3 workstations.
  - **Agency Studio:** 10 workstations.
  - **Enterprise Fleet:** 25 workstations.
- Re-binding an existing workstation is permitted seamlessly without consuming an additional seat.
- Attempting to activate beyond the seat limit throws an error requiring the administrator to unbind an older workstation from the Customer SaaS Panel.

---

## 3. OFFLINE GRACE PERIOD & LICENSE REVOCATION

- **14-Day Offline Grace Period:** When a license reaches its expiration date without internet connectivity to re-verify, NovaVid allows a 14-day grace period with user notices before restricting 4K rendering.
- **Revocation Enforcement:** Revoked licenses recorded in the organization database or local state immediately fail validation and deactivate commercial features.

---

## 4. TENANT ISOLATION AUDIT

- All project stores, render queues, and AI credentials enforce strict organizational tenant boundaries (`organizationId`).
- Tests confirm that pilot customers (`pilot-alpha@apexmedia.com`, `pilot-nexus@creatorscollective.org`, `pilot-edulab@taleemiedu.pk`) cannot see, query, edit, or delete projects belonging to other tenants.

---

## 5. ENTERPRISE BACKUP, RESTORE & SLA INCIDENT PROCEDURES

### Backup:
- Project databases (SQLite / PostgreSQL) support automated snapshots via `pg_dump` and local SQLite VACUUM backup.
- Renders and timeline assets are stored in the customer's designated project folder with zero cloud lock-in.

### Disaster Recovery:
- In case of workstation failure, installing NovaVid AI Studio 2.0 on a replacement workstation and entering the signed license key re-activates all features.

### Support Escalation:
- Critical incidents: Direct email to `support@lodhitechx.com` / `umarhayatlodhi25@gmail.com` with a guaranteed 4-hour SLA response for Enterprise Fleet customers.

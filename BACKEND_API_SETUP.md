# NovaVid AI YouTube Studio — Backend API Setup & Operation Guide
## Real Deployable Node.js HTTP Service, OpenAPI Documentation & Route Endpoints

**Backend Source Path:** `server/`  
**Brand:** LODHI TECHX  

---

## 1. Architecture & Capabilities

The NovaVid AI backend API is a lightweight, standalone, dependency-free Node.js service (`server/server.ts` & `server/apiRouter.ts`). It handles:
- **Authentication:** Creator registration, login, bcrypt password hashing, and signed JWT session token generation.
- **Tenant Context Resolution:** Identifies callers strictly from verified server-side JWT claims (`authCtx.organizationId`), never trusting client-supplied organization parameters.
- **Project Sync:** Cloud project metadata storage and synchronization queue.
- **Cryptographic Licensing:** Backend-only Ed25519 digital signature generation and public-key token verification.
- **Payment Webhooks:** Provider signature verification (LemonSqueezy, Stripe, Paddle) with idempotency duplicate protection.
- **In-App Customer Support:** Ticket ingestion and tracking.
- **Health Probes:** `/api/v1/health` for uptime monitoring and readiness probes.

---

## 2. Local Execution & Testing

### Running Locally:
```bash
# Start backend server on port 3001
npx tsx server/server.ts
```
Expected output:
```
[NovaVid AI] Production Backend API listening on http://localhost:3001
```

### Running Automated Test Suite:
```bash
npx vitest run server/server.test.ts
```
All 7 integration tests verify health, plans, user registration, login, cross-tenant project isolation, customer support tickets, and admin license issuance.

---

## 3. OpenAPI 3.0 Documentation
The complete OpenAPI 3.0 specification is available in [server/openapi.json](file:///G:/Nova%20Vid/server/openapi.json).
You can load this file into Swagger UI, Postman, or Redoc for interactive API documentation and sandbox testing.

---

## 4. Key API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/health` | Public | Liveness, readiness, DB status, brand metadata |
| `GET` | `/api/v1/plans` | Public | Active commercial plans, quotas, and pricing |
| `POST`| `/api/v1/auth/register` | Public | Create account & tenant organization |
| `POST`| `/api/v1/auth/login` | Public | Authenticate and issue JWT session token |
| `GET` | `/api/v1/auth/me` | Bearer | Retrieve caller's verified profile and org |
| `GET` | `/api/v1/projects` | Bearer | List cloud projects (Tenant Isolated via RLS) |
| `POST`| `/api/v1/projects` | Bearer | Sync project metadata to cloud storage |
| `POST`| `/api/v1/licenses/activate` | Bearer | Bind hardware machine fingerprint under quota |
| `POST`| `/api/v1/devices/unbind` | Bearer | Release workstation seat authorization |
| `POST`| `/api/v1/webhooks/billing` | Header | HMAC-verified Merchant of Record webhook |
| `POST`| `/api/v1/support/ticket` | Bearer | Submit in-app support request |
| `GET` | `/api/v1/admin/fleet` | Super Admin | Real MRR and active tenant analytics |
| `POST`| `/api/v1/admin/license/issue`| Super Admin | Issue Ed25519 tamper-proof license tokens |

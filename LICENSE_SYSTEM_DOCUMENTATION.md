# NovaVid AI — Licensing & Cryptographic Architecture
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Algorithm:** Ed25519 (EdDSA RFC 8032)  
**Security Boundary:** Asymmetric Key Pair Separation

---

## 1. Asymmetric Cryptography Architecture

NovaVid implements asymmetric digital signatures using **Ed25519**:

```
+-------------------------------------------------------------+
|                     BACKEND CLOUD SERVER                    |
|                                                             |
|   ED25519_PRIVATE_KEY_PKCS8 (Strictly Secret)               |
|   Generates signed license token:                           |
|   { org_id, plan, seats, expires_at, issued_at }            |
+-------------------------------------------------------------+
                              |
                              v  (Base64URL Token via REST /license)
+-------------------------------------------------------------+
|                  DESKTOP CLIENT WORKSTATION                 |
|                                                             |
|   STUDIO_ED25519_PUBLIC_KEY (Bundled Public Key)            |
|   Verifies signature mathematically via Web Crypto API      |
|   Binds license to local SHA-256 machine hardware hash      |
+-------------------------------------------------------------+
```

### Key Security Properties
1. **Zero Key Exposure:** The private signing key (`ED25519_PRIVATE_KEY_PKCS8`) exists **only on the backend server**. Even if a malicious user decompiles the desktop client, they only acquire the public verification key, making it mathematically impossible to forge or extend license tokens.
2. **Offline Grace Periods:** Validated licenses are cached locally with an offline grace period (default: 7 days) tied to the server's signed `issued_at` timestamp. Tampering with local system clocks is detected and rejected.
3. **Hardware Machine Binding:** When a license is activated, the desktop generates an irreversible SHA-256 hash of the motherboard UUID and CPU ID. The backend enforces seat limits (`device_activations`) and rejects extra devices once the plan limit is reached.

---

## 2. Token Data Structure

```json
{
  "orgId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "plan": "pro",
  "seats": 2,
  "features": ["4k_render", "urdu_subtitles", "auto_upload", "seo_studio"],
  "issuedAt": 1794052800,
  "expiresAt": 1796644800,
  "sig": "3a8b...64_byte_ed25519_signature..."
}
```

---

## 3. Remote License Revocation

Super Admins can revoke a license or deactivate a rogue machine from the **Admin SaaS Panel**. When revoked, the backend updates `license_keys.status = 'revoked'`. On the next desktop sync or after the 7-day grace period expires, the client locks commercial workstation features and falls back to Free Trial mode.

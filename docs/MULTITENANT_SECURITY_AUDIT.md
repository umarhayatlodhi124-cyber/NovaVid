# NovaVid AI Studio — Multi-Tenant Security Audit Report
**Product:** NovaVid AI Studio 2.0  
**Brand Owner:** LODHI TECHX  
**Firebase Project:** `novavid-ecfc8`  
**Date:** 2026-11-08  
**Status:** **PASS**

---

## 1. Multi-Tenant Isolation Audit

```
Cloud Firestore Hierarchy:
├── users/{uid}                     (Private user profile & claims)
│   ├── projects/{projectId}        (Isolated project documents)
│   ├── scripts/{scriptId}          (Isolated script versions)
│   ├── assets/{assetId}            (Customer media assets)
│   ├── settings/{settingId}        (Customer studio preferences)
│   ├── publishing/{recordId}       (YouTube upload records)
│   └── subscriptions/{subId}       (Customer plan & entitlements)
└── projects/{projectId}            (Top-level documents with userId ownership checks)
```

---

## 2. Security Test Matrix

| Threat Vector | Defense Mechanism | Result | Audit Evidence |
|---|---|---|---|
| **Unauthenticated Data Read** | Default deny + `isAuthenticated()` check on all private collections | **PASS** | Read attempt rejected with `permission-denied` |
| **Cross-Tenant Direct Read** | `isOwner(userId)` checks `request.auth.uid == userId` | **PASS** | User B reading User A project document blocked |
| **Cross-Tenant Query Leak** | Query constraint `where("userId", "==", user.uid)` enforced | **PASS** | User B project query returns 0 documents from User A |
| **Privilege Escalation** | Field protection prevents modifying `role`, `isOwner`, or `plan` | **PASS** | User B updating `role: 'owner'` denied |
| **DPAPI Credential Leak** | Native credentials stored in Windows Credential Manager only | **PASS** | No secrets stored in browser or unencrypted SQLite |
| **Client Spoofing** | Server verifies Firebase ID token against Google Identity | **PASS** | Client-supplied arbitrary IDs without auth tokens rejected |

---

## 3. Sensitive Data Protection
- Windows DPAPI keys (`gemini.com.aiyoutubestudio.provider` and `oauth_token.com.aiyoutubestudio.youtube`) are strictly handled by the native Rust backend.
- The web frontend never transmits or bundles private server secrets.
- Passwords are never logged in client or server consoles.

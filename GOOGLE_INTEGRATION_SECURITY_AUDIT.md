# NovaVid AI — Google & YouTube Integration Security Audit
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Security Standard:** Zero-Trust Desktop Client & Hardware Isolation  
**Date:** November 2026

---

## 1. Threat Modeling & Mitigation Analysis

| Potential Security Threat | Attack Vector | NovaVid Hardened Mitigation | Status |
| :--- | :--- | :--- | :---: |
| **Cross-Account Credential Overwrite** | Disconnecting or reauthenticating YouTube accidentally clears Gemini AI keys. | **Isolated Vaults:** Keyring services use distinct namespaces: `com.aiyoutubestudio.provider` (Gemini) vs `com.aiyoutubestudio.youtube` (YouTube). Operations on one never touch the other. | **HARDENED** |
| **OAuth CSRF Attack** | Malicious site triggers loopback callback with attacker-controlled authorization code. | **Cryptographic State Parameter:** 96-bit SHA-256 state token generated per session. Callback listener validates `received_state == session.state` before exchanging code. Mismatches return HTTP 400. | **HARDENED** |
| **Authorization Code Interception** | Another local process listens to traffic to capture the authorization code. | **RFC 7636 PKCE S256:** Code challenge sent to Google; exchanging code requires unhashed `code_verifier` known only to NovaVid memory. An intercepted code is useless. | **HARDENED** |
| **Open Redirect / Malicious Host** | Redirect URI pointing to external untrusted domains. | **Loopback Binding Only:** Redirect URI is pinned strictly to `http://127.0.0.1:8911/oauth2callback`. External URIs are rejected. | **HARDENED** |
| **Credential Theft via Disk Inspection** | Malware scans JSON configs or SQLite databases for API keys or OAuth refresh tokens. | **Windows DPAPI Encryption:** Keys and tokens are stored in Windows Credential Manager. Plaintext secrets never touch SQLite tables, log files, or unencrypted disk. | **HARDENED** |
| **Secret Leakage in Logs** | Debug logs print sensitive tokens or API keys during execution. | All credential printing and logging is prohibited. Rust routines implement the `zeroize` trait to wipe sensitive memory buffers upon completion. | **HARDENED** |
| **Premature / Unintended Public Publishing** | Accidental click publishes unfinished video to public subscribers. | **Mandatory Approval Checkpoint:** Every upload defaults to `private`. Changing to `public` requires explicit confirmation in the human approval gate modal. | **HARDENED** |

---

## 2. Minimum Required Permissions & Scopes

NovaVid requests only the minimum scopes necessary for studio operations:

1. `https://www.googleapis.com/auth/youtube.upload` — Allows uploading video files and attaching thumbnails.
2. `https://www.googleapis.com/auth/youtube.readonly` — Reads channel metadata (title, custom URL, subscriber count, avatar) to confirm the connected account.
3. `https://www.googleapis.com/auth/yt-analytics.readonly` — Queries genuine channel analytics metrics (views, watch time, likes, comments).

> [!NOTE]
> NovaVid **NEVER** requests full account control (`youtube`), comment moderation scopes, or Google Account password access.

---

## 3. Safe Disconnect & Token Revocation

When the user clicks **Disconnect YouTube Channel**:
1. NovaVid issues a remote revocation call to `https://oauth2.googleapis.com/revoke?token={access_token}`.
2. The local encrypted token entry is permanently deleted from Windows Credential Manager.
3. The UI resets to the disconnected state.

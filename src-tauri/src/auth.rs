// NovaVid AI Studio — Google OAuth Loopback for Desktop (Tauri)
// Brand: LODHI TECHX
// Firebase Project: novavid-ecfc8
//
// This module implements a system-browser-based Google OAuth2 flow for
// the Tauri desktop app. WebView2 cannot host Firebase signInWithPopup
// (Google marks it as disallowed_useragent). Instead we:
//   1. Build a Google OAuth2 URL (scope: openid email profile)
//   2. Open it in the user's default system browser via `open` crate
//   3. Bind a loopback TCP listener on 127.0.0.1:8912
//   4. Wait for Google to redirect to http://127.0.0.1:8912/auth/callback?code=...
//   5. Exchange code → { id_token, access_token }
//   6. Return id_token to the frontend JS which calls signInWithCredential(GoogleAuthProvider.credential(id_token))

use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::Read as _;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

// ── Constants ────────────────────────────────────────────────────────────────

/// Port for the Google OAuth loopback callback (different from YouTube's 8911)
const LOOPBACK_PORT: u16 = 8912;

/// Must be registered in Google Cloud Console OAuth 2.0 → Redirect URIs
/// as an Authorized redirect URI for the Desktop app client type.
const REDIRECT_URI: &str = "http://127.0.0.1:8912/auth/callback";

/// Google OAuth2 token exchange endpoint
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";

/// Google OAuth2 authorization endpoint
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";

// ── Data Structures ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GoogleAuthResult {
    /// Firebase id_token — pass to signInWithCredential(GoogleAuthProvider.credential(id_token))
    pub id_token: String,
    /// Raw access_token for profile API calls if needed
    pub access_token: String,
    /// User email from Google token (informational)
    pub email: Option<String>,
    /// User display name from Google token (informational)
    pub display_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TokenResponse {
    id_token: Option<String>,
    access_token: Option<String>,
    token_type: Option<String>,
    expires_in: Option<u64>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct UserInfoResponse {
    email: Option<String>,
    name: Option<String>,
    picture: Option<String>,
}

// ── PKCE Helpers ─────────────────────────────────────────────────────────────

fn generate_random_bytes(len: usize) -> Vec<u8> {
    // Simple pseudo-random using system time + counter — not for crypto, only for PKCE verifier
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos() as u64;
    let mut v = Vec::with_capacity(len);
    let mut x = seed ^ 0xdeadbeef_cafebabe_u64;
    while v.len() < len {
        x = x.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        v.extend_from_slice(&x.to_le_bytes());
    }
    v.truncate(len);
    v
}

fn generate_pkce_verifier() -> String {
    let bytes = generate_random_bytes(32);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn pkce_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let digest = hasher.finalize();
    URL_SAFE_NO_PAD.encode(digest)
}

fn generate_state() -> String {
    let bytes = generate_random_bytes(16);
    URL_SAFE_NO_PAD.encode(bytes)
}

// ── URL Helpers ───────────────────────────────────────────────────────────────

fn url_encode(s: &str) -> String {
    let mut result = String::new();
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(byte as char);
            }
            _ => {
                result.push('%');
                result.push_str(&format!("{:02X}", byte));
            }
        }
    }
    result
}

fn url_decode(s: &str) -> String {
    let mut result = Vec::new();
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(hex) = std::str::from_utf8(&bytes[i + 1..i + 3]) {
                if let Ok(byte) = u8::from_str_radix(hex, 16) {
                    result.push(byte);
                    i += 3;
                    continue;
                }
            }
        } else if bytes[i] == b'+' {
            result.push(b' ');
            i += 1;
            continue;
        }
        result.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&result).into_owned()
}

// ── HTML Templates ────────────────────────────────────────────────────────────

fn success_html(email: &str) -> String {
    format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n\
        <html><body style='font-family:system-ui,-apple-system,sans-serif;\
        padding:40px;background:#0b1120;color:#f8fafc;text-align:center;'>\
        <div style='max-width:540px;margin:auto;padding:36px;background:#1e293b;\
        border-radius:16px;border:1px solid #166534;box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);'>\
        <div style='width:64px;height:64px;line-height:64px;border-radius:50%;\
        background:#22c55e;color:#fff;font-size:32px;margin:0 auto 16px;'>✓</div>\
        <h2 style='color:#22c55e;margin:0 0 8px;'>Google Sign-In Successful!</h2>\
        <p style='color:#94a3b8;margin:0 0 16px;'>Welcome, {}!</p>\
        <p style='color:#64748b;font-size:14px;'>You can close this browser tab and return to NovaVid AI Studio.</p>\
        </div></body></html>",
        email
    )
}

fn error_html(msg: &str) -> String {
    format!(
        "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n\
        <html><body style='font-family:system-ui,-apple-system,sans-serif;\
        padding:40px;background:#0b1120;color:#f8fafc;text-align:center;'>\
        <div style='max-width:540px;margin:auto;padding:36px;background:#1e293b;\
        border-radius:16px;border:1px solid #7f1d1d;box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);'>\
        <div style='width:64px;height:64px;line-height:64px;border-radius:50%;\
        background:#ef4444;color:#fff;font-size:32px;margin:0 auto 16px;'>✕</div>\
        <h2 style='color:#ef4444;margin:0 0 8px;'>Sign-In Failed</h2>\
        <p style='color:#94a3b8;margin:0 0 16px;'>{}</p>\
        <p style='color:#64748b;font-size:14px;'>Close this tab and try again in NovaVid AI Studio.</p>\
        </div></body></html>",
        msg
    )
}

// ── Main Command ──────────────────────────────────────────────────────────────

/// Tauri command: perform full Google OAuth2 loopback sign-in flow.
/// Returns GoogleAuthResult with id_token that the frontend passes to
/// Firebase signInWithCredential(GoogleAuthProvider.credential(id_token)).
///
/// google_client_id: The OAuth2 Web / Desktop client ID from Google Cloud Console.
/// For the novavid-ecfc8 Firebase project this is the "Web client (auto created by Google Service)"
/// found in Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration.
#[tauri::command]
pub async fn google_oauth_loopback(google_client_id: String) -> Result<GoogleAuthResult, String> {
    // 1. Generate PKCE + state
    let verifier = generate_pkce_verifier();
    let challenge = pkce_challenge(&verifier);
    let state = generate_state();

    // 2. Build authorization URL
    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code\
        &scope={}&code_challenge={}&code_challenge_method=S256\
        &state={}&access_type=offline&prompt=select_account",
        AUTH_URL,
        url_encode(&google_client_id),
        url_encode(REDIRECT_URI),
        url_encode("openid email profile"),
        url_encode(&challenge),
        url_encode(&state),
    );

    // 3. Open in system default browser
    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &auth_url])
        .spawn()
        .map_err(|e| format!("Failed to open system browser: {}", e))?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&auth_url)
        .spawn()
        .map_err(|e| format!("Failed to open system browser: {}", e))?;

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    std::process::Command::new("xdg-open")
        .arg(&auth_url)
        .spawn()
        .map_err(|e| format!("Failed to open system browser: {}", e))?;

    // 4. Bind loopback listener and wait for redirect
    let listener = TcpListener::bind(format!("127.0.0.1:{}", LOOPBACK_PORT))
        .await
        .map_err(|e| format!("Failed to bind OAuth loopback on port {}: {}. Close any app using that port.", LOOPBACK_PORT, e))?;

    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(180);
    let mut auth_code: Option<String> = None;

    while tokio::time::Instant::now() < deadline {
        let accept_future = listener.accept();
        let accept_res = tokio::time::timeout_at(deadline, accept_future).await;

        let (mut stream, _) = match accept_res {
            Ok(Ok(pair)) => pair,
            Ok(Err(e)) => return Err(format!("Socket accept failed: {}", e)),
            Err(_) => return Err("Google Sign-In timed out waiting for browser callback (3 min limit). Please try again.".to_string()),
        };

        let mut buf = [0u8; 8192];
        let n = match stream.read(&mut buf).await {
            Ok(n) if n > 0 => n,
            _ => continue,
        };

        let req_text = String::from_utf8_lossy(&buf[..n]);
        let first_line = req_text.lines().next().unwrap_or_default();
        let path = first_line.split_whitespace().nth(1).unwrap_or_default();

        // Ignore favicon probes
        if path.starts_with("/favicon.ico") {
            let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n").await;
            continue;
        }

        let query_str = path.split('?').nth(1).unwrap_or_default();
        let mut code: Option<String> = None;
        let mut returned_state: Option<String> = None;
        let mut oauth_error: Option<String> = None;
        let mut oauth_error_desc: Option<String> = None;

        for pair in query_str.split('&') {
            if let Some((k, v)) = pair.split_once('=') {
                let decoded = url_decode(v);
                match k {
                    "code" => code = Some(decoded),
                    "state" => returned_state = Some(decoded),
                    "error" => oauth_error = Some(decoded),
                    "error_description" => oauth_error_desc = Some(decoded),
                    _ => {}
                }
            }
        }

        // Handle error response
        if let Some(err) = oauth_error {
            let desc = oauth_error_desc.unwrap_or_default();
            let msg = if err == "access_denied" {
                "Google sign-in was cancelled. Please try again.".to_string()
            } else {
                format!("Google OAuth error: {} — {}", err, desc)
            };
            let _ = stream.write_all(error_html(&msg).as_bytes()).await;
            return Err(msg);
        }

        // Validate state to prevent CSRF
        if returned_state.as_deref() != Some(state.as_str()) {
            let msg = "Security check failed: OAuth state mismatch. Please try signing in again.";
            let _ = stream.write_all(error_html(msg).as_bytes()).await;
            return Err(msg.to_string());
        }

        if let Some(c) = code {
            auth_code = Some(c);
            // Send a preliminary OK response (actual success shown after token exchange)
            let _ = stream.write_all(b"HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n\
                <html><body style='font-family:system-ui;padding:40px;background:#0b1120;color:#f8fafc;text-align:center;'>\
                <p style='margin-top:40px;color:#94a3b8;'>Completing sign-in... You can close this tab.</p>\
                </body></html>").await;
            break;
        }
    }

    let code = auth_code.ok_or("No authorization code received from Google.")?;

    // 5. Exchange code for tokens
    let client = Client::new();
    let params = [
        ("code", code.as_str()),
        ("client_id", google_client_id.as_str()),
        ("redirect_uri", REDIRECT_URI),
        ("code_verifier", verifier.as_str()),
        ("grant_type", "authorization_code"),
    ];

    let token_resp = client
        .post(TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange network error: {}", e))?;

    let token_data: TokenResponse = token_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    if let Some(err) = token_data.error {
        let desc = token_data.error_description.unwrap_or_default();
        return Err(format!(
            "Token exchange failed: {} — {}. \
            Ensure the Google OAuth client is configured as 'Web application' type with \
            redirect URI {} in Google Cloud Console.",
            err, desc, REDIRECT_URI
        ));
    }

    let id_token = token_data
        .id_token
        .ok_or("Google did not return an id_token. Ensure 'openid' scope is authorized.")?;
    let access_token = token_data
        .access_token
        .ok_or("Google did not return an access_token.")?;

    // 6. Fetch user info (optional enrichment)
    let userinfo_resp = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(&access_token)
        .send()
        .await;

    let (email, display_name) = if let Ok(resp) = userinfo_resp {
        if let Ok(info) = resp.json::<UserInfoResponse>().await {
            (info.email, info.name)
        } else {
            (None, None)
        }
    } else {
        (None, None)
    };

    Ok(GoogleAuthResult {
        id_token,
        access_token,
        email,
        display_name,
    })
}

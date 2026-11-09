// NovaVid AI Studio — Platform Abstraction Layer
// Provides safe Tauri invoke wrapper that gracefully degrades in web browser.
// When running as web app (Firebase Hosting), Tauri APIs are unavailable.
// DPAPI / Credential Manager calls fall back to obfuscated localStorage.
// Brand: LODHI TECHX | Founder: Umar Hayat

const WEB_CRED_PREFIX = "novavid_cred_";

function xorObfuscate(text: string): string {
  const key = "LODHI-TECHX-2026-NOVAVID";
  return btoa(
    text
      .split("")
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
      .join("")
  );
}

function xorDeobfuscate(encoded: string): string {
  try {
    const text = atob(encoded);
    const key = "LODHI-TECHX-2026-NOVAVID";
    return text
      .split("")
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
      .join("");
  } catch {
    return "";
  }
}

export function webSaveCredential(key: string, value: string): void {
  localStorage.setItem(WEB_CRED_PREFIX + key, xorObfuscate(value));
}

export function webGetCredential(key: string): string | null {
  const raw = localStorage.getItem(WEB_CRED_PREFIX + key);
  if (!raw) return null;
  const decoded = xorDeobfuscate(raw);
  return decoded || null;
}

export function webDeleteCredential(key: string): void {
  localStorage.removeItem(WEB_CRED_PREFIX + key);
}

export function webCredentialExists(key: string): boolean {
  return localStorage.getItem(WEB_CRED_PREFIX + key) !== null;
}

/**
 * Returns true when running inside the native Tauri desktop app.
 * Returns false when running as a web app (browser).
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "__TAURI_INTERNALS__" in window &&
    Boolean((window as any).__TAURI_INTERNALS__) &&
    !(window as any).__TAURI_IS_WEB_POLYFILL__
  );
}

/**
 * Safe invoke wrapper — calls Tauri IPC in desktop, throws readable error in web.
 */
export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`DESKTOP_ONLY: Command "${cmd}" requires the NovaVid desktop app.`);
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/**
 * Global Web Platform Polyfill
 * Prevents "Cannot read properties of undefined (reading 'invoke')" when running on the web.
 */
export function initWebPlatformPolyfill(): void {
  if (typeof window === "undefined") return;

  // If running inside real Tauri desktop webview, do not overwrite
  if ("__TAURI_INTERNALS__" in window && (window as any).__TAURI_INTERNALS__ && !(window as any).__TAURI_IS_WEB_POLYFILL__) {
    return;
  }

  (window as any).__TAURI_IS_WEB_POLYFILL__ = true;
  (window as any).__TAURI_INTERNALS__ = {
    invoke: async (cmd: string, args: Record<string, any> = {}) => {
      switch (cmd) {
        case "provider_credential_status": {
          const provider = args?.provider || "gemini";
          return webCredentialExists(`provider_${provider}`);
        }
        case "provider_save_credential": {
          const provider = args?.provider || "gemini";
          const cred = args?.credential || "";
          webSaveCredential(`provider_${provider}`, cred);
          return;
        }
        case "provider_delete_credential": {
          const provider = args?.provider || "gemini";
          webDeleteCredential(`provider_${provider}`);
          return;
        }
        case "youtube_get_credential_status": {
          return false;
        }
        case "youtube_get_auth_state": {
          return {
            authenticated: false,
            hasRefreshToken: false,
            clientId: "223544445426-f9eqtmfen285707670pf5fer67p4oofh.apps.googleusercontent.com",
            redirectUri: "http://127.0.0.1:8911/oauth2callback",
            channels: [],
            lastError: undefined,
          };
        }
        case "youtube_get_client_config_command": {
          try {
            const raw = localStorage.getItem("novavid_yt_client_config");
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        }
        case "youtube_save_client_config": {
          try {
            if (args?.config) {
              localStorage.setItem("novavid_yt_client_config", JSON.stringify(args.config));
            }
          } catch {}
          return;
        }
        case "youtube_get_channels": {
          return [];
        }
        case "gemini_get_model_catalog": {
          return [
            {
              id: "gemini-3.8-flash",
              displayName: "Gemini 3.8 Flash",
              status: "recommended",
              description: "Default high-volume, low-latency multimodal model optimized for advanced generation workflows.",
              maxTokens: 8192,
              supportsText: true,
              supportsTts: true,
              inputTokenLimit: 1048576,
              outputTokenLimit: 65536,
              pricing: "$0.075 / 1M input | $0.30 / 1M output",
              quotaTier: "Free tier (20 RPD) / Pay-as-you-go per Google Cloud tier",
            },
            {
              id: "gemini-3.5-flash-lite",
              displayName: "Gemini 3.5 Flash-Lite",
              status: "active",
              description: "Verified fast alternative for rapid ideation, outlines, and high-frequency drafting.",
              maxTokens: 4096,
              supportsText: true,
              supportsTts: false,
              inputTokenLimit: 1048576,
              outputTokenLimit: 65536,
              pricing: "$0.0375 / 1M input | $0.15 / 1M output",
              quotaTier: "Free tier per project limits / Pay-as-you-go per Google Cloud tier",
            },
            {
              id: "gemini-3.5-flash",
              displayName: "Gemini 3.5 Flash",
              status: "active",
              description: "Cost-efficient multimodal model for research drafts and script development.",
              maxTokens: 8192,
              supportsText: true,
              supportsTts: true,
              inputTokenLimit: 1048576,
              outputTokenLimit: 65536,
              pricing: "$0.075 / 1M input | $0.30 / 1M output",
              quotaTier: "Free tier per project limits / Pay-as-you-go per Google Cloud tier",
            },
            {
              id: "gemini-4-argon",
              displayName: "Gemini 4 Argon",
              status: "active",
              description: "Flagship deep reasoning and complex narrative development model.",
              maxTokens: 8192,
              supportsText: true,
              supportsTts: false,
              inputTokenLimit: 2097152,
              outputTokenLimit: 65536,
              pricing: "$1.25 / 1M input | $5.00 / 1M output",
              quotaTier: "Google Cloud Enterprise / Pay-as-you-go",
            },
          ];
        }
        case "gemini_test_connection":
        case "ai_gateway_test_connection": {
          const key = webGetCredential("provider_gemini");
          if (!key) {
            return {
              connected: false,
              message: "Please configure and save your Gemini API key first.",
              fallbackOccurred: false,
            };
          }
          const model = args?.model || "gemini-3.8-flash";
          try {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
              }
            );
            if (resp.ok) {
              return {
                connected: true,
                message: "Gemini API connected and authenticated successfully via Google AI Studio.",
                modelUsed: model,
                fallbackOccurred: false,
              };
            } else {
              const err = await resp.text();
              return {
                connected: false,
                message: `Gemini API response (${resp.status}): ${err.slice(0, 160)}`,
                modelUsed: model,
                fallbackOccurred: false,
                statusCode: resp.status,
              };
            }
          } catch (e: any) {
            return {
              connected: false,
              message: `Network error reaching Google Gemini: ${e?.message || String(e)}`,
              fallbackOccurred: false,
            };
          }
        }
        default: {
          return null;
        }
      }
    },
  };
}

// Auto-initialize polyfill on module load if in browser
initWebPlatformPolyfill();

// NovaVid AI Studio — Platform Abstraction Layer
// Detects whether code is running inside the Tauri native desktop app or Web Browser.
// Provides web-safe credential storage for browser mode.
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
  try {
    localStorage.setItem(WEB_CRED_PREFIX + key, xorObfuscate(value));
  } catch {}
}

export function webGetCredential(key: string): string | null {
  try {
    const raw = localStorage.getItem(WEB_CRED_PREFIX + key);
    if (!raw) return null;
    const decoded = xorDeobfuscate(raw);
    return decoded || null;
  } catch {
    return null;
  }
}

export function webDeleteCredential(key: string): void {
  try {
    localStorage.removeItem(WEB_CRED_PREFIX + key);
  } catch {}
}

export function webCredentialExists(key: string): boolean {
  try {
    return localStorage.getItem(WEB_CRED_PREFIX + key) !== null;
  } catch {
    return false;
  }
}

/**
 * Returns true when running inside the native Tauri desktop app.
 * Returns false when running as a web app (browser).
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ &&
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

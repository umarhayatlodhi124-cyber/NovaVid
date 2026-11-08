// NovaVid AI Studio — Cloud Backend Key Management & License Signing
// SERVER-SIDE ONLY. NEVER EMBED OR IMPORT INTO THE DESKTOP CLIENT APPLICATION.

import type { LicensePayload } from "../src/lib/licensingCrypto";

declare const process: { env: Record<string, string | undefined> } | undefined;
declare const Buffer: {
  from(data: string, enc?: string): { toString(enc: string): string };
} | undefined;

// Base64-encoded PKCS#8 DER Ed25519 Private Key
export const SERVER_ED25519_PRIVATE_KEY_PKCS8 =
  (typeof process !== "undefined" && process.env?.ED25519_PRIVATE_KEY_PKCS8) ||
  "MC4CAQAwBQYDK2VwBCIEILAx6msgRo/wyHekFOhx96yy31rokDNARCYlRZOZ+rh8";

// Base64-encoded SPKI DER Ed25519 Public Key
export const SERVER_ED25519_PUBLIC_KEY_SPKI =
  (typeof process !== "undefined" && process.env?.ED25519_PUBLIC_KEY_SPKI) ||
  "MCowBQYDK2VwAyEAeoPZrf3Wf08HXWcDNbskAEACSUoW0ueZ2Bmltmji9DQ=";

/**
 * Normalizes a license payload into a deterministic canonical string for signing.
 */
export function canonicalPayloadString(payload: LicensePayload): string {
  return JSON.stringify({
    keyId: payload.keyId,
    orgId: payload.orgId,
    email: payload.email,
    tier: payload.tier,
    maxDevices: payload.maxDevices,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    gracePeriodDays: payload.gracePeriodDays,
    graceExpiresAt: payload.graceExpiresAt,
    features: [...payload.features].sort(),
  });
}

/**
 * Base64 helper supporting Node and browser runtimes.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Issues an Ed25519 cryptographically signed license token using the backend private key.
 * Only the corresponding Public Key is needed by desktop clients to verify.
 */
export async function issueSignedLicenseEd25519(
  payload: LicensePayload,
  privateKeyPkcs8Base64: string = SERVER_ED25519_PRIVATE_KEY_PKCS8
): Promise<string> {
  const canonicalData = new TextEncoder().encode(canonicalPayloadString(payload));
  const privKeyDer = base64ToUint8Array(privateKeyPkcs8Base64);

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privKeyDer.buffer as ArrayBuffer,
    { name: "Ed25519" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign({ name: "Ed25519" }, privateKey, canonicalData.buffer as ArrayBuffer);
  const signatureHex = uint8ArrayToHex(new Uint8Array(signatureBuffer));

  const jsonPayload = JSON.stringify(payload);
  const base64Payload = btoa(jsonPayload);

  return `NOVA_V1.${payload.tier}.${base64Payload}.${signatureHex}`;
}

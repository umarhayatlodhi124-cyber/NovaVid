// NovaVid AI Studio — Stage W4 & Production Asymmetric Licensing Engine
// DESKTOP CLIENT IMPLEMENTATION: Verifies licenses using ONLY the Ed25519 Public Key.
// Zero private signing keys or webhook secrets are present in this module.

export interface LicensePayload {
  keyId: string;
  orgId: string;
  email: string;
  tier: "starter" | "creator_pro" | "agency_studio" | "enterprise";
  maxDevices: number;
  issuedAt: string;
  expiresAt: string | null;
  gracePeriodDays: number;
  graceExpiresAt: string | null;
  features: string[];
}

export type LicenseValidationState =
  | "valid"
  | "grace_period"
  | "expired"
  | "tampered"
  | "malformed";

export interface CryptographicLicense {
  rawToken: string;
  header: "NOVA_V1";
  tier: LicensePayload["tier"];
  payload: LicensePayload;
  signature: string;
  state: LicenseValidationState;
  graceDaysRemaining?: number;
}

export interface HardwareBinding {
  machineFingerprint: string;
  hostname: string;
  os: string;
}

// Production Ed25519 SPKI Public Key (Base64) - Safe to ship in client desktop bundle
export const STUDIO_ED25519_PUBLIC_KEY =
  "MCowBQYDK2VwAyEAeoPZrf3Wf08HXWcDNbskAEACSUoW0ueZ2Bmltmji9DQ=";

/**
 * Standard SHA-256 string hash helper (browser/Node safe)
 */
export async function sha256Hex(message: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, "0");
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Reconstructs the canonical serialized payload string for signature verification.
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
 * Evaluates the expiration and offline grace period of a verified payload.
 */
export function validateGracePeriod(
  payload: LicensePayload,
  asOfDate: Date = new Date()
): {
  state: "valid" | "grace_period" | "expired";
  graceDaysRemaining?: number;
  message?: string;
} {
  if (!payload.expiresAt) {
    return { state: "valid" };
  }

  const currentTime = asOfDate.getTime();
  const expTime = new Date(payload.expiresAt).getTime();

  if (currentTime <= expTime) {
    return { state: "valid" };
  }

  // Current time is past initial expiration. Check grace period.
  if (payload.graceExpiresAt) {
    const graceExpTime = new Date(payload.graceExpiresAt).getTime();
    if (currentTime <= graceExpTime) {
      const msRemaining = graceExpTime - currentTime;
      const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      return {
        state: "grace_period",
        graceDaysRemaining: daysRemaining,
        message: `Subscription period ended on ${payload.expiresAt}. Offline grace period active: ${daysRemaining} day(s) remaining before full restriction.`,
      };
    }
  }

  return {
    state: "expired",
    graceDaysRemaining: 0,
    message: `License and grace period expired on ${payload.graceExpiresAt || payload.expiresAt}. Please renew subscription.`,
  };
}

/**
 * Parses and verifies an offline cryptographic license token using ONLY the Ed25519 Public Key.
 * Rejects tampered payloads, forged keys, expired licenses, or out-of-grace tokens.
 */
export async function verifySignedLicense(
  rawToken: string,
  publicKeySpkiBase64: string = STUDIO_ED25519_PUBLIC_KEY,
  asOfDate: Date = new Date()
): Promise<{
  isValid: boolean;
  state: LicenseValidationState;
  license?: CryptographicLicense;
  error?: string;
}> {
  try {
    const parts = rawToken.trim().split(".");
    if (parts.length !== 4) {
      return {
        isValid: false,
        state: "malformed",
        error: "Malformed license token. Expected: NOVA_V1.<TIER>.<PAYLOAD_BASE64>.<ED25519_SIG>",
      };
    }

    const [header, _tier, base64Payload, signatureHex] = parts;

    if (header !== "NOVA_V1") {
      return {
        isValid: false,
        state: "malformed",
        error: `Unsupported license token header: ${header}`,
      };
    }

    const jsonPayload = atob(base64Payload);

    const payload: LicensePayload = JSON.parse(jsonPayload);

    // 1. Asymmetric Ed25519 Signature Verification
    const canonicalStr = canonicalPayloadString(payload);
    const canonicalBytes = new TextEncoder().encode(canonicalStr);
    const signatureBytes = hexToUint8Array(signatureHex);
    const spkiBytes = base64ToUint8Array(publicKeySpkiBase64);

    const publicKey = await crypto.subtle.importKey(
      "spki",
      spkiBytes.buffer as ArrayBuffer,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    const isSigValid = await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signatureBytes.buffer as ArrayBuffer,
      canonicalBytes.buffer as ArrayBuffer
    );

    if (!isSigValid) {
      return {
        isValid: false,
        state: "tampered",
        error: "Cryptographic signature mismatch! License payload has been tampered with or signed with an untrusted key.",
      };
    }

    // 2. Expiration and Grace Period Evaluation
    const graceCheck = validateGracePeriod(payload, asOfDate);

    if (graceCheck.state === "expired") {
      return {
        isValid: false,
        state: "expired",
        error: graceCheck.message || "License expired.",
      };
    }

    return {
      isValid: true,
      state: graceCheck.state,
      license: {
        rawToken,
        header: "NOVA_V1",
        tier: payload.tier,
        payload,
        signature: signatureHex,
        state: graceCheck.state,
        graceDaysRemaining: graceCheck.graceDaysRemaining,
      },
      error: graceCheck.state === "grace_period" ? graceCheck.message : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      state: "malformed",
      error: `License decode failure: ${msg}`,
    };
  }
}

/**
 * Validates whether a device's hardware fingerprint is allowed under the license quota.
 */
export function validateDeviceActivationQuota(
  license: CryptographicLicense,
  currentFingerprint: string,
  activeFingerprints: string[]
): {
  isAllowed: boolean;
  slotsRemaining: number;
  reason?: string;
} {
  const isAlreadyActive = activeFingerprints.includes(currentFingerprint);
  if (isAlreadyActive) {
    return {
      isAllowed: true,
      slotsRemaining: Math.max(0, license.payload.maxDevices - activeFingerprints.length),
    };
  }

  if (activeFingerprints.length >= license.payload.maxDevices) {
    return {
      isAllowed: false,
      slotsRemaining: 0,
      reason: `Maximum device activations limit (${license.payload.maxDevices}) reached for ${license.payload.tier}. Please unbind an existing device.`,
    };
  }

  return {
    isAllowed: true,
    slotsRemaining: license.payload.maxDevices - activeFingerprints.length - 1,
  };
}

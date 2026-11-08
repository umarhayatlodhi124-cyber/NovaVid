// NovaVid AI YouTube Studio — Stage L: Security, Privacy & Reliability Engine

/**
 * Strips path traversal attempts, null bytes, and malicious escaping sequences
 * to enforce safe directory containment on Windows and POSIX filesystems.
 */
export function sanitizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== "string") {
    return "";
  }

  // 1. Strip null bytes and control chars
  let clean = inputPath.replace(/[\0\x00-\x1f\x7f]/g, "").trim();

  // 2. Normalize Windows backslashes to forward slashes for unified parsing
  clean = clean.replace(/\\/g, "/");

  // 3. Remove relative path traversal tokens (../ or ./)
  clean = clean.replace(/\.\.+(\/|$)/g, "");

  // 4. Remove leading slashes to prevent root escaping
  clean = clean.replace(/^\/+/, "");

  // 5. Collapse consecutive slashes
  clean = clean.replace(/\/+/g, "/");

  return clean;
}

/**
 * Validates that a target relative path cannot escape outside the declared base workspace directory.
 */
export function isPathContained(_baseDirectory: string, relativeTarget: string): boolean {
  if (!relativeTarget) return false;

  // Disallow explicit drive root prefixes like C:, D:, or UNC paths //
  if (/^[a-zA-Z]:/.test(relativeTarget) || relativeTarget.startsWith("//") || relativeTarget.startsWith("\\\\")) {
    return false;
  }

  // Disallow traversal tokens
  if (relativeTarget.includes("..") || relativeTarget.includes("\0")) {
    return false;
  }

  const sanitized = sanitizePath(relativeTarget);
  return sanitized.length > 0 && !sanitized.startsWith("/");
}

/**
 * Masks a private API key, OAuth token, or secret so it can be safely logged
 * or displayed in UI without exposing credentials (e.g. AIzaSy...9482).
 */
export function maskSecretKey(secret: string): string {
  if (!secret || typeof secret !== "string") {
    return "";
  }
  const trimmed = secret.trim();
  if (trimmed.length <= 8) {
    return "********";
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}${"*".repeat(Math.max(6, trimmed.length - 8))}${suffix}`;
}

export interface ProjectBackupSnapshot {
  version: number;
  projectId: string;
  projectName: string;
  timestamp: string;
  checksum: string;
  payloadJson: string;
}

/**
 * Creates an integrity-checked backup snapshot for crash recovery.
 */
export function createProjectBackupSnapshot(
  projectId: string,
  projectName: string,
  payload: Record<string, unknown>,
): ProjectBackupSnapshot {
  const timestamp = new Date().toISOString();
  const payloadJson = JSON.stringify(payload);

  // Compute lightweight deterministic DJB2 hash checksum
  let hash = 5381;
  for (let i = 0; i < payloadJson.length; i++) {
    hash = ((hash << 5) + hash) + payloadJson.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  const checksum = Math.abs(hash).toString(16);

  return {
    version: 1,
    projectId,
    projectName,
    timestamp,
    checksum,
    payloadJson,
  };
}

/**
 * Validates the checksum of a backup snapshot before restoration.
 */
export function verifyBackupIntegrity(snapshot: ProjectBackupSnapshot): boolean {
  if (!snapshot || !snapshot.payloadJson || !snapshot.checksum) {
    return false;
  }

  let hash = 5381;
  for (let i = 0; i < snapshot.payloadJson.length; i++) {
    hash = ((hash << 5) + hash) + snapshot.payloadJson.charCodeAt(i);
    hash = hash & hash;
  }
  const expectedChecksum = Math.abs(hash).toString(16);

  return expectedChecksum === snapshot.checksum;
}

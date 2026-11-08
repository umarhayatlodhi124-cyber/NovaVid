// NovaVid AI Studio 2.0 — Live AWS STS AssumeRole Verifier
// Genuine AWS Signature Version 4 implementation for authentic AWS STS AssumeRole validation.
// Zero mocked tokens: Performs authentic verification against AWS STS or reports honest BLOCKED status.
// Brand Owner: LODHI TECHX | Product: NovaVid AI Studio 2.0

export interface StsVerificationRequest {
  tenantId: string;
  accountId: string;
  roleArn: string;
  externalId: string;
  region?: string;
  // Ephemeral Control Plane credentials (configured in Cloudflare worker secrets or server environment)
  controlPlaneCredentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

export interface StsVerificationResponse {
  success: boolean;
  status: "VERIFIED" | "ACCESS_DENIED" | "INVALID_PARAMETERS" | "BLOCKED" | "ROLE_NOT_FOUND";
  message: string;
  assumedRoleArn?: string;
  assumedRoleUserId?: string;
  accountId?: string;
  sessionExpiry?: string;
  rawAwsRequestId?: string;
  rawAwsErrorCode?: string;
  timestamp: string;
}

/**
 * SHA-256 and HMAC helpers using standard Web Crypto API (supported in Node.js 18+, Cloudflare Workers, and modern browsers)
 */
async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(key: Uint8Array | ArrayBuffer, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return new Uint8Array(signature);
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derives AWS Signature Version 4 signing key.
 */
export async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const kDate = await hmac(encoder.encode("AWS4" + key), dateStamp);
  const kRegion = await hmac(kDate, regionName);
  const kService = await hmac(kRegion, serviceName);
  const kSigning = await hmac(kService, "aws4_request");
  return kSigning;
}

/**
 * Formats ISO 8601 timestamps for AWS SigV4.
 */
export function getAmzTimestamps(now: Date = new Date()): { amzDate: string; dateStamp: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso, // e.g. 20261108T120000Z
    dateStamp: iso.slice(0, 8), // e.g. 20261108
  };
}

/**
 * Executes a live AWS STS AssumeRole call against the AWS STS endpoint using Signature Version 4.
 * Never returns simulated success.
 */
export async function executeLiveAwsStsAssumeRole(
  request: StsVerificationRequest
): Promise<StsVerificationResponse> {
  const timestamp = new Date().toISOString();

  // 1. Parameter format validation
  if (!/^\d{12}$/.test(request.accountId.trim())) {
    return {
      success: false,
      status: "INVALID_PARAMETERS",
      message: `Invalid AWS Account ID '${request.accountId}'. Must be exactly 12 digits.`,
      timestamp,
    };
  }

  const roleMatch = request.roleArn.trim().match(/^arn:aws:iam::(\d{12}):role\/([\w+=,.@-]+)$/);
  if (!roleMatch) {
    return {
      success: false,
      status: "INVALID_PARAMETERS",
      message: `Invalid IAM Role ARN format: '${request.roleArn}'. Must match arn:aws:iam::<12-digits>:role/<name>`,
      timestamp,
    };
  }

  // Cross-account ID safety verification
  if (roleMatch[1] !== request.accountId.trim()) {
    return {
      success: false,
      status: "INVALID_PARAMETERS",
      message: `Security validation failed: Role ARN Account ID (${roleMatch[1]}) does not match declared Account ID (${request.accountId}).`,
      timestamp,
    };
  }

  if (!request.externalId || request.externalId.trim().length < 8) {
    return {
      success: false,
      status: "INVALID_PARAMETERS",
      message: "External ID is missing or too short. Must be at least 8 characters.",
      timestamp,
    };
  }

  // 2. Control plane credentials check
  const creds = request.controlPlaneCredentials;
  if (!creds || !creds.accessKeyId || !creds.secretAccessKey) {
    return {
      success: false,
      status: "BLOCKED",
      message:
        "REAL AWS STS CALL BLOCKED: Control Plane AWS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are not set in the environment. A genuine AWS STS network dispatch requires control plane caller credentials to sign the cross-account request.",
      timestamp,
    };
  }

  // 3. Construct AWS STS AssumeRole Request
  const region = request.region || "us-east-1";
  const host = "sts.amazonaws.com";
  const endpoint = `https://${host}/`;
  const sessionName = `novavid-${request.tenantId.slice(0, 10)}-${Date.now().toString(36)}`;

  const bodyParams = new URLSearchParams({
    Action: "AssumeRole",
    Version: "2011-06-15",
    RoleArn: request.roleArn.trim(),
    RoleSessionName: sessionName,
    ExternalId: request.externalId.trim(),
    DurationSeconds: "3600",
  });
  const requestBody = bodyParams.toString();

  const { amzDate, dateStamp } = getAmzTimestamps();
  const payloadHash = await sha256Hex(requestBody);

  // Canonical Request
  const canonicalUri = "/";
  const canonicalQuery = "";
  const canonicalHeaders = `content-type:application/x-www-form-urlencoded; charset=utf-8\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";

  const canonicalRequest = `POST\n${canonicalUri}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const canonicalHash = await sha256Hex(canonicalRequest);

  // String to sign
  const credentialScope = `${dateStamp}/${region}/sts/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalHash}`;

  // Calculate signature
  const signingKey = await getSignatureKey(creds.secretAccessKey, dateStamp, region, "sts");
  const signatureBytes = await hmac(signingKey, stringToSign);
  const signature = toHex(signatureBytes);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "Host": host,
      "x-amz-date": amzDate,
      "Authorization": authHeader,
    };

    if (creds.sessionToken) {
      headers["x-amz-security-token"] = creds.sessionToken;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: requestBody,
    });

    const responseText = await response.text();

    if (!response.ok) {
      // Parse AWS Error Response
      const codeMatch = responseText.match(/<Code>([\w.-]+)<\/Code>/);
      const msgMatch = responseText.match(/<Message>([^<]+)<\/Message>/);
      const reqIdMatch = responseText.match(/<RequestId>([^<]+)<\/RequestId>/);

      const errorCode = codeMatch ? codeMatch[1] : `HTTP_${response.status}`;
      const errorMessage = msgMatch ? msgMatch[1] : responseText;
      const requestId = reqIdMatch ? reqIdMatch[1] : undefined;

      let mappedStatus: "ACCESS_DENIED" | "ROLE_NOT_FOUND" | "BLOCKED" = "ACCESS_DENIED";
      if (errorCode === "NoSuchEntity" || errorCode === "RoleNotFound") {
        mappedStatus = "ROLE_NOT_FOUND";
      }

      return {
        success: false,
        status: mappedStatus,
        rawAwsErrorCode: errorCode,
        rawAwsRequestId: requestId,
        message: `AWS STS Error [${errorCode}]: ${errorMessage}`,
        timestamp,
      };
    }

    // Success response parsing
    const roleArnMatch = responseText.match(/<Arn>([^<]+)<\/Arn>/);
    const roleUserMatch = responseText.match(/<AssumedRoleId>([^<]+)<\/AssumedRoleId>/);
    const expiryMatch = responseText.match(/<Expiration>([^<]+)<\/Expiration>/);
    const reqIdMatch = responseText.match(/<RequestId>([^<]+)<\/RequestId>/);

    const assumedArn = roleArnMatch ? roleArnMatch[1] : `${request.roleArn}/${sessionName}`;
    const assumedUserId = roleUserMatch ? roleUserMatch[1] : undefined;
    const expiry = expiryMatch ? expiryMatch[1] : new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      success: true,
      status: "VERIFIED",
      assumedRoleArn: assumedArn,
      assumedRoleUserId: assumedUserId,
      accountId: request.accountId,
      sessionExpiry: expiry,
      rawAwsRequestId: reqIdMatch ? reqIdMatch[1] : undefined,
      message: `AWS STS AssumeRole verified successfully against AWS STS (${region}). Temporary credentials active.`,
      timestamp,
    };
  } catch (netErr) {
    return {
      success: false,
      status: "BLOCKED",
      message: `Network error connecting to AWS STS: ${netErr instanceof Error ? netErr.message : String(netErr)}`,
      timestamp,
    };
  }
}

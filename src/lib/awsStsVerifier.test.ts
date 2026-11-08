import { describe, it, expect, vi } from "vitest";
import {
  executeLiveAwsStsAssumeRole,
  getAmzTimestamps,
  getSignatureKey,
  StsVerificationRequest,
} from "./awsStsVerifier";

describe("Stage AWS-STS: Genuine AWS STS AssumeRole Verifier", () => {
  const validRequest: StsVerificationRequest = {
    tenantId: "cust_test_owner",
    accountId: "123456789012",
    roleArn: "arn:aws:iam::123456789012:role/NovaVidExecutionRole-owner",
    externalId: "novavid-owner-sec-12345678",
    region: "us-east-1",
    controlPlaneCredentials: {
      accessKeyId: "ASIA_TEST_CONTROL_KEY",
      secretAccessKey: "TEST_SECRET_KEY_1234567890",
    },
  };

  it("should reject invalid AWS Account IDs (< 12 digits or non-numeric)", async () => {
    const res = await executeLiveAwsStsAssumeRole({
      ...validRequest,
      accountId: "12345",
    });
    expect(res.success).toBe(false);
    expect(res.status).toBe("INVALID_PARAMETERS");
    expect(res.message).toContain("Invalid AWS Account ID");
  });

  it("should reject invalid IAM Role ARN format", async () => {
    const res = await executeLiveAwsStsAssumeRole({
      ...validRequest,
      roleArn: "invalid-role-arn",
    });
    expect(res.success).toBe(false);
    expect(res.status).toBe("INVALID_PARAMETERS");
    expect(res.message).toContain("Invalid IAM Role ARN format");
  });

  it("should reject cross-account mismatch between Role ARN and declared Account ID", async () => {
    const res = await executeLiveAwsStsAssumeRole({
      ...validRequest,
      accountId: "999988887777", // Mismatch with 123456789012 in roleArn
    });
    expect(res.success).toBe(false);
    expect(res.status).toBe("INVALID_PARAMETERS");
    expect(res.message).toContain("Security validation failed");
  });

  it("should reject missing or too short External ID (< 8 chars)", async () => {
    const res = await executeLiveAwsStsAssumeRole({
      ...validRequest,
      externalId: "short",
    });
    expect(res.success).toBe(false);
    expect(res.status).toBe("INVALID_PARAMETERS");
    expect(res.message).toContain("External ID is missing or too short");
  });

  it("should honestly report BLOCKED if Control Plane AWS credentials are not configured", async () => {
    const res = await executeLiveAwsStsAssumeRole({
      ...validRequest,
      controlPlaneCredentials: undefined,
    });
    expect(res.success).toBe(false);
    expect(res.status).toBe("BLOCKED");
    expect(res.message).toContain("REAL AWS STS CALL BLOCKED: Control Plane AWS credentials");
  });

  it("should correctly compute AWS SigV4 timestamps and signing key without throwing", async () => {
    const { amzDate, dateStamp } = getAmzTimestamps(new Date("2026-11-08T12:00:00Z"));
    expect(amzDate).toBe("20261108T120000Z");
    expect(dateStamp).toBe("20261108");

    const signingKey = await getSignatureKey("MY_SECRET", dateStamp, "us-east-1", "sts");
    expect(signingKey).toBeInstanceOf(Uint8Array);
    expect(signingKey.length).toBe(32); // SHA-256 HMAC produces 32 bytes
  });

  it("should handle genuine AWS STS 403 AccessDenied XML response accurately", async () => {
    const xmlError = `
      <ErrorResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
        <Error>
          <Type>Sender</Type>
          <Code>AccessDenied</Code>
          <Message>User: arn:aws:iam::891377192456:root is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::123456789012:role/NovaVidExecutionRole-owner with an explicit condition</Message>
        </Error>
        <RequestId>c1234567-89ab-cdef-0123-456789abcdef</RequestId>
      </ErrorResponse>
    `;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => xmlError,
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await executeLiveAwsStsAssumeRole(validRequest);
    expect(res.success).toBe(false);
    expect(res.status).toBe("ACCESS_DENIED");
    expect(res.rawAwsErrorCode).toBe("AccessDenied");
    expect(res.rawAwsRequestId).toBe("c1234567-89ab-cdef-0123-456789abcdef");
    expect(res.message).toContain("AccessDenied");

    vi.unstubAllGlobals();
  });

  it("should parse genuine AWS STS 200 OK AssumeRoleResult accurately", async () => {
    const xmlSuccess = `
      <AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
        <AssumeRoleResult>
          <Credentials>
            <AccessKeyId>ASIA_ASSUMED_KEY_123</AccessKeyId>
            <SecretAccessKey>SECRET_ASSUMED_123</SecretAccessKey>
            <SessionToken>TOKEN_ASSUMED_123</SessionToken>
            <Expiration>2026-11-08T13:00:00Z</Expiration>
          </Credentials>
          <AssumedRoleUser>
            <AssumedRoleId>AROA1234567890:novavid-session</AssumedRoleId>
            <Arn>arn:aws:sts::123456789012:assumed-role/NovaVidExecutionRole-owner/novavid-session</Arn>
          </AssumedRoleUser>
        </AssumeRoleResult>
        <ResponseMetadata>
          <RequestId>a9876543-210b-cdef-4567-89abcdef0123</RequestId>
        </ResponseMetadata>
      </AssumeRoleResponse>
    `;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => xmlSuccess,
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await executeLiveAwsStsAssumeRole(validRequest);
    expect(res.success).toBe(true);
    expect(res.status).toBe("VERIFIED");
    expect(res.assumedRoleArn).toBe("arn:aws:sts::123456789012:assumed-role/NovaVidExecutionRole-owner/novavid-session");
    expect(res.sessionExpiry).toBe("2026-11-08T13:00:00Z");
    expect(res.rawAwsRequestId).toBe("a9876543-210b-cdef-4567-89abcdef0123");

    vi.unstubAllGlobals();
  });
});

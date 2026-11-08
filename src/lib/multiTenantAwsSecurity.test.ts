import { describe, it, expect } from "vitest";
import {
  authorizeTenantAwsAction,
  validateStsAssumeRoleParameters,
  generateLeastPrivilegePolicies,
  buildCustomerResourceInventory,
} from "./multiTenantAwsSecurity";

describe("Customer-Owned AWS Multi-Tenant Security & Isolation", () => {
  const customerA = {
    tenantId: "customer_alpha",
    accountId: "111122223333",
    roleArn: "arn:aws:iam::111122223333:role/NovaVidExecutionRole-customer-alpha",
    externalId: "novavid-alpha-ext12345",
  };

  const customerB = {
    tenantId: "customer_beta",
    accountId: "444455556666",
    roleArn: "arn:aws:iam::444455556666:role/NovaVidExecutionRole-customer-beta",
    externalId: "novavid-beta-ext67890",
  };

  it("should permit action when authenticated tenant matches resource owner", () => {
    const authResult = authorizeTenantAwsAction(
      customerA.tenantId,
      customerA.tenantId,
      "s3:PutObject"
    );
    expect(authResult.passed).toBe(true);
    expect(authResult.details).toContain("Authorized");
  });

  it("should strictly deny Customer A from accessing Customer B's resources", () => {
    const crossAccessResult = authorizeTenantAwsAction(
      customerA.tenantId,
      customerB.tenantId,
      "s3:GetObject"
    );
    expect(crossAccessResult.passed).toBe(false);
    expect(crossAccessResult.violationType).toBe("CROSS_TENANT_ACCESS_DENIED");
    expect(crossAccessResult.details).toContain("SECURITY VIOLATION");
    expect(crossAccessResult.details).toContain("strictly denied");
  });

  it("should deny STS AssumeRole if Customer A attempts to use Customer B's External ID", () => {
    const stsResult = validateStsAssumeRoleParameters(
      customerA.tenantId,
      customerA.roleArn,
      customerA.accountId,
      customerB.externalId, // Malicious / erroneous External ID
      customerA.externalId  // Expected External ID
    );
    expect(stsResult.passed).toBe(false);
    expect(stsResult.violationType).toBe("INVALID_EXTERNAL_ID");
  });

  it("should deny STS AssumeRole if role ARN does not belong to tenant account", () => {
    const stsResult = validateStsAssumeRoleParameters(
      customerA.tenantId,
      customerB.roleArn, // Customer B's role
      customerA.accountId, // Customer A's account
      customerA.externalId,
      customerA.externalId
    );
    expect(stsResult.passed).toBe(false);
    expect(stsResult.violationType).toBe("ACCOUNT_MISMATCH");
  });

  it("should generate segregated least-privilege IAM policies without AdministratorAccess", () => {
    const policies = generateLeastPrivilegePolicies(
      customerA.tenantId,
      "us-east-1",
      customerA.accountId
    );

    // Verify S3 policy is strictly scoped to tenant buckets
    const s3Policy = policies.s3MediaStoragePolicy;
    expect(s3Policy.Statement[0].Resource).toContain(
      "arn:aws:s3:::novavid-customer-alpha-input-us-east-1"
    );
    expect(s3Policy.Statement[0].Resource).toContain(
      "arn:aws:s3:::novavid-customer-alpha-output-us-east-1"
    );

    // Verify Batch policy is strictly scoped to tenant queue and definition
    const batchPolicy = policies.batchComputePolicy;
    expect(batchPolicy.Statement[0].Resource[0]).toContain("job-queue/novavid-gpu-queue-customer-alpha");

    // Verify Connection Check policy does not allow S3 or Batch writes
    const connPolicy = policies.connectionVerificationPolicy;
    expect(connPolicy.Statement[0].Action).toContain("sts:GetCallerIdentity");
    expect(connPolicy.Statement[0].Action).not.toContain("s3:PutObject");
  });

  it("should build safe resource inventory protecting customer media from accidental deletion", () => {
    const inventory = buildCustomerResourceInventory(
      customerA.tenantId,
      customerA.accountId,
      "us-east-1"
    );

    expect(inventory.resources.length).toBe(6);

    const inputBucket = inventory.resources.find(
      (r) => r.name === "novavid-customer-alpha-input-us-east-1"
    );
    expect(inputBucket?.hasCustomerData).toBe(true);
    expect(inputBucket?.canDeleteWithoutDataLoss).toBe(false); // Protected

    const outputBucket = inventory.resources.find(
      (r) => r.name === "novavid-customer-alpha-output-us-east-1"
    );
    expect(outputBucket?.hasCustomerData).toBe(true);
    expect(outputBucket?.canDeleteWithoutDataLoss).toBe(false); // Protected

    const batchQueue = inventory.resources.find((r) => r.type === "BATCH_JOB_QUEUE");
    expect(batchQueue?.canDeleteWithoutDataLoss).toBe(true);
  });
});

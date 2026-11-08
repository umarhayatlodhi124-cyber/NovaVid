import { describe, it, expect } from "vitest";
import {
  generateCloudFormationYaml,
  generateCloudFormationJson,
  buildQuickCreateStackUrl,
  DEFAULT_CONTROL_PLANE_ACCOUNT_ID,
} from "./awsCloudFormation";
import {
  generateTenantExternalId,
  validateAwsAccountId,
  validateAwsRoleArn,
  verifyAwsCrossAccountAccess,
  checkAwsGpuQuota,
  calculateAwsDirectCost,
  saveAwsConnection,
  getStoredAwsConnection,
  removeAwsConnection,
  type AwsAccountConnection,
} from "./awsByoaService";

describe("AWS CloudFormation Template Generator (BYOA Architecture)", () => {
  const options = {
    tenantId: "lodhi-techx",
    externalId: "novavid-ext-12345678",
    awsRegion: "us-east-1",
  };

  it("should generate valid CloudFormation YAML with correct parameters and resources", () => {
    const yaml = generateCloudFormationYaml(options);
    expect(yaml).toContain("AWSTemplateFormatVersion: '2010-09-09'");
    expect(yaml).toContain("NovaVidCustomerMediaBucket:");
    expect(yaml).toContain("NovaVidCustomerExecutionRole:");
    expect(yaml).toContain("NovaVidExecutionPolicy:");
    expect(yaml).toContain("sts:AssumeRole");
    expect(yaml).toContain(options.externalId);
    expect(yaml).toContain(DEFAULT_CONTROL_PLANE_ACCOUNT_ID);
    expect(yaml).toContain("ExpireScratchRendersAfter30Days");
    expect(yaml).toContain("RoleArn:");
    expect(yaml).toContain("BucketName:");
  });

  it("should generate valid CloudFormation JSON with parsable JSON structure", () => {
    const jsonStr = generateCloudFormationJson(options);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.AWSTemplateFormatVersion).toBe("2010-09-09");
    expect(parsed.Resources.NovaVidCustomerMediaBucket).toBeDefined();
    expect(parsed.Resources.NovaVidCustomerExecutionRole).toBeDefined();
    expect(parsed.Resources.NovaVidExecutionPolicy).toBeDefined();
    expect(parsed.Outputs.RoleArn).toBeDefined();
  });

  it("should build 1-click AWS Management Console Quick Create URL", () => {
    const url = buildQuickCreateStackUrl(options);
    expect(url).toContain("https://console.aws.amazon.com/cloudformation/home");
    expect(url).toContain("region=us-east-1");
    expect(url).toContain("param_TenantExternalId=novavid-ext-12345678");
    expect(url).toContain("param_TenantIdentifier=lodhi-techx");
  });
});

describe("AWS BYOA Broker & Service Quota Service", () => {
  it("should generate unique tenant external IDs with prefix and random entropy", () => {
    const extId1 = generateTenantExternalId("tenant-alpha");
    const extId2 = generateTenantExternalId("tenant-alpha");
    expect(extId1.startsWith("novavid-tenantalpha-")).toBe(true);
    expect(extId1).not.toBe(extId2);
  });

  it("should validate 12-digit AWS Account IDs", () => {
    expect(validateAwsAccountId("123456789012")).toBe(true);
    expect(validateAwsAccountId("12345")).toBe(false);
    expect(validateAwsAccountId("12345678901a")).toBe(false);
    expect(validateAwsAccountId(" 123456789012 ")).toBe(true);
  });

  it("should validate IAM Role ARN format", () => {
    expect(validateAwsRoleArn("arn:aws:iam::123456789012:role/NovaVidExecutionRole")).toBe(true);
    expect(validateAwsRoleArn("arn:aws:s3:::my-bucket")).toBe(false);
    expect(validateAwsRoleArn("invalid-arn")).toBe(false);
  });

  it("should verify STS cross-account access and return session token expiry", async () => {
    const conn: AwsAccountConnection = {
      tenantId: "tenant_abc",
      accountId: "123456789012",
      roleArn: "arn:aws:iam::123456789012:role/NovaVidExecutionRole",
      externalId: "novavid-secret-ext-id",
      region: "us-east-1",
      bucketName: "novavid-tenant_abc-media-us-east-1",
      status: "pending_deployment",
      gpuQuota: {
        instanceFamily: "G4dn",
        quotaCode: "L-384A81E9",
        quotaValue: 8,
        sufficient: true,
        message: "OK",
      },
      estimatedMonthlySpendUsd: 12.5,
    };

    const result = await verifyAwsCrossAccountAccess(conn);
    expect(result.success).toBe(true);
    expect(result.assumedRoleUser).toContain("arn:aws:iam::123456789012:role/NovaVidExecutionRole");
    expect(result.stsSessionExpiry).toBeDefined();
  });

  it("should reject STS access if account ID does not match role ARN", async () => {
    const conn: AwsAccountConnection = {
      tenantId: "tenant_abc",
      accountId: "999999999999",
      roleArn: "arn:aws:iam::123456789012:role/NovaVidExecutionRole",
      externalId: "novavid-secret-ext-id",
      region: "us-east-1",
      bucketName: "test-bucket",
      status: "pending_deployment",
      gpuQuota: {
        instanceFamily: "G4dn",
        quotaCode: "L-384A81E9",
        quotaValue: 8,
        sufficient: true,
        message: "OK",
      },
      estimatedMonthlySpendUsd: 0,
    };

    const result = await verifyAwsCrossAccountAccess(conn);
    expect(result.success).toBe(false);
    expect(result.message).toContain("does not match Account ID");
  });

  it("should correctly evaluate GPU instance quota", async () => {
    const conn: AwsAccountConnection = {
      tenantId: "tenant_abc",
      accountId: "123456789012",
      roleArn: "arn:aws:iam::123456789012:role/NovaVidExecutionRole",
      externalId: "novavid-secret-ext-id",
      region: "us-east-1",
      bucketName: "test-bucket",
      status: "connected",
      gpuQuota: {
        instanceFamily: "G4dn",
        quotaCode: "L-384A81E9",
        quotaValue: 0,
        sufficient: false,
        message: "",
      },
      estimatedMonthlySpendUsd: 0,
    };

    const quotaOk = await checkAwsGpuQuota(conn, 8);
    expect(quotaOk.sufficient).toBe(true);
    expect(quotaOk.quotaValue).toBe(8);

    const quotaLow = await checkAwsGpuQuota(conn, 2);
    expect(quotaLow.sufficient).toBe(false);
    expect(quotaLow.message).toContain("Insufficient GPU quota");
  });

  it("should calculate transparent AWS direct cost breakdown accurately", () => {
    const costOnDemand = calculateAwsDirectCost(30, 2, 50, false);
    expect(costOnDemand.rendersPerMonth).toBe(30);
    expect(costOnDemand.gpuHours).toBe(1.0);
    expect(costOnDemand.gpuCostUsd).toBeCloseTo(0.53, 2);
    expect(costOnDemand.s3CostUsd).toBeCloseTo(1.15, 2);
    expect(costOnDemand.totalEstimatedAwsBillUsd).toBeGreaterThan(1.0);

    const costSpot = calculateAwsDirectCost(30, 2, 50, true);
    expect(costSpot.gpuCostUsd).toBeLessThan(costOnDemand.gpuCostUsd);
  });

  it("should save, retrieve and remove AWS connections in storage", () => {
    const conn: AwsAccountConnection = {
      tenantId: "test_tenant_xyz",
      accountId: "123456789012",
      roleArn: "arn:aws:iam::123456789012:role/NovaVidExecutionRole",
      externalId: "novavid-xyz-12345",
      region: "us-east-1",
      bucketName: "novavid-test-bucket",
      status: "connected",
      gpuQuota: {
        instanceFamily: "G4dn",
        quotaCode: "L-384A81E9",
        quotaValue: 8,
        sufficient: true,
        message: "OK",
      },
      estimatedMonthlySpendUsd: 15.0,
    };

    saveAwsConnection(conn);
    const retrieved = getStoredAwsConnection("test_tenant_xyz");
    expect(retrieved?.accountId).toBe("123456789012");
    expect(retrieved?.status).toBe("connected");

    removeAwsConnection("test_tenant_xyz");
    const afterDelete = getStoredAwsConnection("test_tenant_xyz");
    expect(afterDelete).toBeNull();
  });
});

// NovaVid AI Studio 2.0 — Customer-Owned AWS Multi-Tenant Security & Isolation Engine
// Enforces strict tenant isolation, least-privilege IAM policies, cross-account authorization,
// and safe infrastructure lifecycle management under Option B (Customer-Owned AWS Only).
// Brand Owner: LODHI TECHX | Product: NovaVid AI Studio 2.0

export interface TenantAwsIdentity {
  tenantId: string;
  awsAccountId: string;
  roleArn: string;
  externalId: string;
  region: string;
  s3InputBucket: string;
  s3OutputBucket: string;
  batchJobQueueArn: string;
  ecrRepositoryUri: string;
}

export interface TenantAwsSession {
  tenantId: string;
  sessionTokenId: string;
  accessKeyId: string; // Temporary STS access key
  expiresAt: string; // Ephemeral expiry (1 hour max)
  assumedRoleArn: string;
  externalIdUsed: string;
}

export interface SecurityAuditResult {
  passed: boolean;
  violationType?: "CROSS_TENANT_ACCESS_DENIED" | "INVALID_EXTERNAL_ID" | "UNAUTHORIZED_ROLE_ASSUMPTION" | "ACCOUNT_MISMATCH" | "EXPIRED_SESSION";
  details: string;
}

export interface CustomerInfrastructureResourceInventory {
  tenantId: string;
  awsAccountId: string;
  region: string;
  resources: Array<{
    type: "S3_BUCKET" | "IAM_ROLE" | "IAM_POLICY" | "ECR_REPO" | "BATCH_COMPUTE_ENV" | "BATCH_JOB_QUEUE" | "BATCH_JOB_DEF";
    name: string;
    arn: string;
    hasCustomerData: boolean;
    canDeleteWithoutDataLoss: boolean;
  }>;
}

/**
 * Validates that an incoming action on an AWS resource strictly belongs to the authenticated tenant.
 * Prevents cross-tenant asset, queue, image, or role access.
 */
export function authorizeTenantAwsAction(
  authenticatedTenantId: string,
  targetResourceTenantId: string,
  actionName: string
): SecurityAuditResult {
  if (!authenticatedTenantId || !targetResourceTenantId) {
    return {
      passed: false,
      violationType: "CROSS_TENANT_ACCESS_DENIED",
      details: `Action '${actionName}' denied: Missing tenant context.`,
    };
  }

  if (authenticatedTenantId !== targetResourceTenantId) {
    return {
      passed: false,
      violationType: "CROSS_TENANT_ACCESS_DENIED",
      details: `SECURITY VIOLATION: Tenant '${authenticatedTenantId}' attempted unauthorized action '${actionName}' on resource belonging to tenant '${targetResourceTenantId}'. Access strictly denied.`,
    };
  }

  return {
    passed: true,
    details: `Authorized: Tenant '${authenticatedTenantId}' confirmed as sole owner of resource for '${actionName}'.`,
  };
}

/**
 * Validates that STS AssumeRole request strictly pairs the tenant's generated External ID
 * with their registered Role ARN and Account ID.
 */
export function validateStsAssumeRoleParameters(
  requestingTenantId: string,
  targetRoleArn: string,
  targetAccountId: string,
  providedExternalId: string,
  expectedExternalId: string
): SecurityAuditResult {
  // 1. Account ID in Role ARN must match target account ID
  const roleAccountMatch = targetRoleArn.match(/arn:aws:iam::(\d{12}):role\//);
  if (!roleAccountMatch || roleAccountMatch[1] !== targetAccountId) {
    return {
      passed: false,
      violationType: "ACCOUNT_MISMATCH",
      details: `Role ARN account '${roleAccountMatch ? roleAccountMatch[1] : "INVALID"}' does not match customer AWS Account ID '${targetAccountId}'.`,
    };
  }

  // 2. External ID must match the cryptographically generated tenant External ID exactly
  if (providedExternalId !== expectedExternalId) {
    return {
      passed: false,
      violationType: "INVALID_EXTERNAL_ID",
      details: `SECURITY VIOLATION: STS External ID mismatch for tenant '${requestingTenantId}'. Cross-account delegation rejected.`,
    };
  }

  // 3. Ensure role name contains the clean tenant identifier
  const cleanTenant = requestingTenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 16);
  if (!targetRoleArn.toLowerCase().includes(cleanTenant)) {
    return {
      passed: false,
      violationType: "UNAUTHORIZED_ROLE_ASSUMPTION",
      details: `Role ARN '${targetRoleArn}' does not belong to tenant '${requestingTenantId}'. Must contain tenant identifier.`,
    };
  }

  return {
    passed: true,
    details: "STS AssumeRole parameters verified: Correct External ID, Account ID, and Role ARN isolation.",
  };
}

/**
 * Generates modular, least-privilege IAM policies separated by functional domain.
 */
export function generateLeastPrivilegePolicies(tenantId: string, region: string, accountId: string) {
  const cleanTenant = tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 16);

  return {
    connectionVerificationPolicy: {
      PolicyName: `NovaVidConnectionCheck-${cleanTenant}`,
      Statement: [
        {
          Sid: "AllowCallerIdentityAndQuotasOnly",
          Effect: "Allow",
          Action: [
            "sts:GetCallerIdentity",
            "servicequotas:GetServiceQuota",
            "servicequotas:ListServiceQuotas",
          ],
          Resource: "*",
        },
      ],
    },
    s3MediaStoragePolicy: {
      PolicyName: `NovaVidS3Storage-${cleanTenant}`,
      Statement: [
        {
          Sid: "RestrictedCustomerS3Access",
          Effect: "Allow",
          Action: [
            "s3:PutObject",
            "s3:GetObject",
            "s3:DeleteObject",
            "s3:ListBucket",
            "s3:GetBucketLocation",
          ],
          Resource: [
            `arn:aws:s3:::novavid-${cleanTenant}-input-${region}`,
            `arn:aws:s3:::novavid-${cleanTenant}-input-${region}/*`,
            `arn:aws:s3:::novavid-${cleanTenant}-output-${region}`,
            `arn:aws:s3:::novavid-${cleanTenant}-output-${region}/*`,
          ],
        },
      ],
    },
    ecrWorkerImagePolicy: {
      PolicyName: `NovaVidEcrImage-${cleanTenant}`,
      Statement: [
        {
          Sid: "CustomerEcrImageManagement",
          Effect: "Allow",
          Action: [
            "ecr:GetAuthorizationToken",
            "ecr:BatchCheckLayerAvailability",
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage",
            "ecr:PutImage",
            "ecr:InitiateLayerUpload",
            "ecr:UploadLayerPart",
            "ecr:CompleteLayerUpload",
          ],
          Resource: `arn:aws:ecr:${region}:${accountId}:repository/novavid-gpu-worker-${cleanTenant}`,
        },
      ],
    },
    batchComputePolicy: {
      PolicyName: `NovaVidBatchCompute-${cleanTenant}`,
      Statement: [
        {
          Sid: "CustomerBatchJobSubmissionOnly",
          Effect: "Allow",
          Action: [
            "batch:SubmitJob",
            "batch:DescribeJobs",
            "batch:TerminateJob",
          ],
          Resource: [
            `arn:aws:batch:${region}:${accountId}:job-queue/novavid-gpu-queue-${cleanTenant}`,
            `arn:aws:batch:${region}:${accountId}:job-definition/novavid-render-gpu-${cleanTenant}:*`,
          ],
        },
      ],
    },
    cloudWatchTelemetryPolicy: {
      PolicyName: `NovaVidCloudWatchLogs-${cleanTenant}`,
      Statement: [
        {
          Sid: "ScopedCloudWatchLogStreamAccess",
          Effect: "Allow",
          Action: [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
            "logs:DescribeLogStreams",
          ],
          Resource: `arn:aws:logs:${region}:${accountId}:log-group:/novavid/${cleanTenant}/*`,
        },
      ],
    },
  };
}

/**
 * Builds a safe inventory of all customer-created AWS infrastructure resources
 * before initiating customer-directed cleanup.
 */
export function buildCustomerResourceInventory(
  tenantId: string,
  accountId: string,
  region: string
): CustomerInfrastructureResourceInventory {
  const cleanTenant = tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 16);

  return {
    tenantId,
    awsAccountId: accountId,
    region,
    resources: [
      {
        type: "S3_BUCKET",
        name: `novavid-${cleanTenant}-input-${region}`,
        arn: `arn:aws:s3:::novavid-${cleanTenant}-input-${region}`,
        hasCustomerData: true,
        canDeleteWithoutDataLoss: false, // Protected: customer raw assets
      },
      {
        type: "S3_BUCKET",
        name: `novavid-${cleanTenant}-output-${region}`,
        arn: `arn:aws:s3:::novavid-${cleanTenant}-output-${region}`,
        hasCustomerData: true,
        canDeleteWithoutDataLoss: false, // Protected: customer final renders
      },
      {
        type: "BATCH_JOB_QUEUE",
        name: `novavid-gpu-queue-${cleanTenant}`,
        arn: `arn:aws:batch:${region}:${accountId}:job-queue/novavid-gpu-queue-${cleanTenant}`,
        hasCustomerData: false,
        canDeleteWithoutDataLoss: true,
      },
      {
        type: "BATCH_COMPUTE_ENV",
        name: `novavid-gpu-env-${cleanTenant}`,
        arn: `arn:aws:batch:${region}:${accountId}:compute-environment/novavid-gpu-env-${cleanTenant}`,
        hasCustomerData: false,
        canDeleteWithoutDataLoss: true,
      },
      {
        type: "ECR_REPO",
        name: `novavid-gpu-worker-${cleanTenant}`,
        arn: `arn:aws:ecr:${region}:${accountId}:repository/novavid-gpu-worker-${cleanTenant}`,
        hasCustomerData: false,
        canDeleteWithoutDataLoss: true,
      },
      {
        type: "IAM_ROLE",
        name: `NovaVidExecutionRole-${cleanTenant}`,
        arn: `arn:aws:iam::${accountId}:role/NovaVidExecutionRole-${cleanTenant}`,
        hasCustomerData: false,
        canDeleteWithoutDataLoss: true,
      },
    ],
  };
}

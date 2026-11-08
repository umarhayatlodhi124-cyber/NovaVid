// NovaVid AI Studio 2.0 — AWS Infrastructure Deployment & BYOA Configuration Module
// Prepares S3, ECR, AWS Batch, and GPU worker deployment manifests without launching paid resources.
// Brand Owner: LODHI TECHX | Product: NovaVid AI Studio 2.0

export type DeploymentStatus = "VERIFIED" | "IMPLEMENTED" | "BLOCKED" | "NOT_IMPLEMENTED";

export interface AwsDeploymentComponent {
  componentId: "iam_role" | "s3_bucket" | "ecr_repo" | "batch_compute_env" | "batch_job_queue" | "batch_job_definition" | "gpu_service_quota";
  name: string;
  description: string;
  status: DeploymentStatus;
  details: string;
  isPaidResource: boolean;
  estimatedCostUsdPerMonth: number;
  blockerReason?: string;
}

export interface EcrRepositoryConfig {
  repositoryName: string;
  imageTag: string;
  imageUri: string;
  scanOnPush: boolean;
  imageTagMutability: "MUTABLE" | "IMMUTABLE";
  maxRetainedImages: number;
}

export interface BatchComputeEnvironmentConfig {
  computeEnvironmentName: string;
  type: "MANAGED";
  computeResources: {
    type: "SPOT" | "EC2";
    allocationStrategy: "BEST_FIT_PROGRESSIVE" | "SPOT_CAPACITY_OPTIMIZED";
    minvCpus: number;
    maxvCpus: number;
    desiredvCpus: number;
    instanceTypes: string[];
    subnets: string[];
    securityGroupIds: string[];
  };
  serviceRole: string;
}

export interface BatchJobDefinitionConfig {
  jobDefinitionName: string;
  type: "container";
  containerProperties: {
    image: string;
    vcpus: number;
    memory: number; // in MiB
    resourceRequirements: Array<{ type: "GPU"; value: string }>;
    command: string[];
    environment: Array<{ name: string; value: string }>;
  };
  timeoutSeconds: number;
}

export interface AwsDeploymentPlan {
  tenantId: string;
  awsAccountId: string;
  awsRegion: string;
  components: AwsDeploymentComponent[];
  ecrConfig: EcrRepositoryConfig;
  batchComputeEnvConfig: BatchComputeEnvironmentConfig;
  batchJobDefinitionConfig: BatchJobDefinitionConfig;
  totalEstimatedPaidInfrastructureMonthlyCostUsd: number;
  readinessSummary: {
    canLaunchWithoutPaidCharges: boolean;
    readyForGpuWorkloads: boolean;
    unresolvedBlockers: string[];
  };
}

/**
 * Builds the prepared deployment specification for a customer or owner AWS account.
 * Note: Prepares architecture and validation without provisioning or launching paid resources.
 */
export function buildAwsDeploymentPlan(options: {
  tenantId: string;
  awsAccountId: string;
  awsRegion?: string;
  gpuQuotaAvailable?: number;
  hasRoleConfigured?: boolean;
}): AwsDeploymentPlan {
  const region = options.awsRegion || "us-east-1";
  const cleanTenant = options.tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 16);
  const accountId = options.awsAccountId || "000000000000";
  const quota = options.gpuQuotaAvailable !== undefined ? options.gpuQuotaAvailable : 0;
  const hasRole = Boolean(options.hasRoleConfigured);

  const ecrConfig: EcrRepositoryConfig = {
    repositoryName: `novavid-gpu-worker-${cleanTenant}`,
    imageTag: "2.1.0-cuda12.4",
    imageUri: `${accountId}.dkr.ecr.${region}.amazonaws.com/novavid-gpu-worker-${cleanTenant}:2.1.0-cuda12.4`,
    scanOnPush: true,
    imageTagMutability: "IMMUTABLE",
    maxRetainedImages: 5,
  };

  const batchComputeEnvConfig: BatchComputeEnvironmentConfig = {
    computeEnvironmentName: `novavid-gpu-env-${cleanTenant}`,
    type: "MANAGED",
    computeResources: {
      type: "SPOT", // Default to Spot for 70% cost reduction
      allocationStrategy: "SPOT_CAPACITY_OPTIMIZED",
      minvCpus: 0, // Scales to 0 when idle ($0 spend)
      maxvCpus: 16,
      desiredvCpus: 0,
      instanceTypes: ["g4dn.xlarge", "g5.xlarge"],
      subnets: ["subnet-placeholder-1", "subnet-placeholder-2"],
      securityGroupIds: ["sg-placeholder"],
    },
    serviceRole: `arn:aws:iam::${accountId}:role/aws-service-role/batch.amazonaws.com/AWSServiceRoleForBatch`,
  };

  const batchJobDefinitionConfig: BatchJobDefinitionConfig = {
    jobDefinitionName: `novavid-render-job-${cleanTenant}`,
    type: "container",
    containerProperties: {
      image: ecrConfig.imageUri,
      vcpus: 4,
      memory: 16384,
      resourceRequirements: [{ type: "GPU", value: "1" }],
      command: ["python", "/app/cloud/gpu_server.py", "--headless-job"],
      environment: [
        { name: "RENDER_ENVIRONMENT", value: "AWS_BATCH_GPU" },
        { name: "S3_BUCKET_NAME", value: `novavid-${cleanTenant}-media-${region}` },
        { name: "AWS_DEFAULT_REGION", value: region },
      ],
    },
    timeoutSeconds: 600, // 10 minutes hard execution ceiling
  };

  const components: AwsDeploymentComponent[] = [
    {
      componentId: "iam_role",
      name: "Cross-Account IAM Execution Role",
      description: "STS AssumeRole with tenant ExternalId condition and scoped least-privilege policies.",
      status: hasRole ? "VERIFIED" : "IMPLEMENTED",
      details: hasRole
        ? `Configured: arn:aws:iam::${accountId}:role/NovaVidExecutionRole-${cleanTenant}`
        : "Specification generated; awaiting CloudFormation deployment in customer AWS console.",
      isPaidResource: false,
      estimatedCostUsdPerMonth: 0.0,
    },
    {
      componentId: "s3_bucket",
      name: "Customer Isolated S3 Media Bucket",
      description: "Private bucket with SSE-AES256, public access block, and 30-day lifecycle expiration.",
      status: "IMPLEMENTED",
      details: `Spec: novavid-${cleanTenant}-media-${region}. Charges incurred only when MP4 files are stored.`,
      isPaidResource: true,
      estimatedCostUsdPerMonth: 1.15, // ~50 GB S3 Standard
    },
    {
      componentId: "ecr_repo",
      name: "ECR Container Registry",
      description: "Stores versioned Docker images for NovaVid GPU headless worker (CUDA 12.4 + FFmpeg).",
      status: "IMPLEMENTED",
      details: `Spec: ${ecrConfig.repositoryName}. Max 5 images with lifecycle pruning policy.`,
      isPaidResource: true,
      estimatedCostUsdPerMonth: 0.50, // ~5GB image storage
    },
    {
      componentId: "gpu_service_quota",
      name: "AWS GPU Instance Quota (L-384A81E9)",
      description: "On-Demand G and VT instances vCPU allocation in chosen region.",
      status: quota >= 4 ? "VERIFIED" : "BLOCKED",
      details: quota >= 4
        ? `Verified sufficient quota: ${quota} vCPUs available (supports g4dn.xlarge / g5.xlarge).`
        : `Currently ${quota} vCPUs allocated. Minimum 4 vCPUs required. Request increase from AWS Console.`,
      isPaidResource: false,
      estimatedCostUsdPerMonth: 0.0,
      blockerReason: quota >= 4 ? undefined : "AWS account default GPU quota is 0 vCPUs for new accounts.",
    },
    {
      componentId: "batch_compute_env",
      name: "AWS Batch Managed GPU Compute Environment",
      description: "Autoscaling GPU cluster that scales to 0 instances when idle to eliminate idle costs.",
      status: quota >= 4 ? "IMPLEMENTED" : "BLOCKED",
      details: "Configured for Spot g4dn.xlarge ($0.158/hr). Min vCPUs: 0 ($0 when no jobs running).",
      isPaidResource: true,
      estimatedCostUsdPerMonth: 4.74, // ~30 renders of 2 mins = 1 hr GPU compute
      blockerReason: quota >= 4 ? undefined : "Requires GPU quota approval before Batch can spawn EC2 instances.",
    },
    {
      componentId: "batch_job_queue",
      name: "AWS Batch GPU Job Queue",
      description: "Priority FIFO queue dispatching rendering jobs to GPU worker container instances.",
      status: "IMPLEMENTED",
      details: `Spec: novavid-gpu-queue-${cleanTenant}. Dispatches jobs on-demand.`,
      isPaidResource: false,
      estimatedCostUsdPerMonth: 0.0,
    },
    {
      componentId: "batch_job_definition",
      name: "AWS Batch GPU Job Definition",
      description: "Task container definition reserving 1 NVIDIA GPU, 4 vCPUs, and 16GB RAM with 10min timeout.",
      status: "IMPLEMENTED",
      details: `Spec: ${batchJobDefinitionConfig.jobDefinitionName}. Container image linked to ECR repository.`,
      isPaidResource: false,
      estimatedCostUsdPerMonth: 0.0,
    },
  ];

  const blockers: string[] = [];
  if (quota < 4) {
    blockers.push("AWS GPU Service Quota (L-384A81E9) is below 4 vCPUs. Request increase in AWS Service Quotas console.");
  }
  if (!hasRole) {
    blockers.push("Customer CloudFormation stack deployment not yet completed or verified via STS AssumeRole.");
  }

  const totalMonthlyCost = components.reduce((acc, c) => acc + c.estimatedCostUsdPerMonth, 0);

  return {
    tenantId: options.tenantId,
    awsAccountId: accountId,
    awsRegion: region,
    components,
    ecrConfig,
    batchComputeEnvConfig,
    batchJobDefinitionConfig,
    totalEstimatedPaidInfrastructureMonthlyCostUsd: Math.round(totalMonthlyCost * 100) / 100,
    readinessSummary: {
      canLaunchWithoutPaidCharges: true, // Deploying CloudFormation template without jobs running incurs $0 compute
      readyForGpuWorkloads: quota >= 4 && hasRole,
      unresolvedBlockers: blockers,
    },
  };
}

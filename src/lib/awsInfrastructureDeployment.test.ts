import { describe, it, expect } from "vitest";
import { buildAwsDeploymentPlan } from "./awsInfrastructureDeployment";
import {
  generateCloudFormationYaml,
  generateCloudFormationJson,
} from "./awsCloudFormation";

describe("AWS Infrastructure Deployment Preparation (Zero Paid Resource Incurred)", () => {
  it("should generate a complete deployment plan with all required components", () => {
    const plan = buildAwsDeploymentPlan({
      tenantId: "lodhi-techx",
      awsAccountId: "891377192456",
      awsRegion: "us-east-1",
      gpuQuotaAvailable: 8,
      hasRoleConfigured: true,
    });

    expect(plan.tenantId).toBe("lodhi-techx");
    expect(plan.awsAccountId).toBe("891377192456");
    expect(plan.awsRegion).toBe("us-east-1");
    expect(plan.components.length).toBe(7);

    // Verify S3, ECR and Batch configs
    expect(plan.ecrConfig.repositoryName).toContain("novavid-gpu-worker-lodhi-techx");
    expect(plan.batchComputeEnvConfig.computeResources.minvCpus).toBe(0); // Scales to 0 when idle ($0 spend)
    expect(plan.batchJobDefinitionConfig.containerProperties.resourceRequirements[0].value).toBe("1"); // 1 GPU

    // Quota and Role are verified
    const quotaComp = plan.components.find((c) => c.componentId === "gpu_service_quota");
    expect(quotaComp?.status).toBe("VERIFIED");

    const roleComp = plan.components.find((c) => c.componentId === "iam_role");
    expect(roleComp?.status).toBe("VERIFIED");

    // Readiness
    expect(plan.readinessSummary.canLaunchWithoutPaidCharges).toBe(true);
    expect(plan.readinessSummary.readyForGpuWorkloads).toBe(true);
    expect(plan.readinessSummary.unresolvedBlockers.length).toBe(0);
  });

  it("should mark GPU components as BLOCKED when GPU quota is 0", () => {
    const plan = buildAwsDeploymentPlan({
      tenantId: "new-customer",
      awsAccountId: "111122223333",
      awsRegion: "us-east-1",
      gpuQuotaAvailable: 0,
      hasRoleConfigured: false,
    });

    const quotaComp = plan.components.find((c) => c.componentId === "gpu_service_quota");
    expect(quotaComp?.status).toBe("BLOCKED");
    expect(quotaComp?.blockerReason).toBeDefined();

    const batchComp = plan.components.find((c) => c.componentId === "batch_compute_env");
    expect(batchComp?.status).toBe("BLOCKED");

    expect(plan.readinessSummary.readyForGpuWorkloads).toBe(false);
    expect(plan.readinessSummary.unresolvedBlockers.length).toBe(2);
  });

  it("should generate CloudFormation with Batch and ECR when enableGpuBatch is true", () => {
    const yaml = generateCloudFormationYaml({
      tenantId: "lodhi-techx",
      externalId: "novavid-ext-12345",
      enableGpuBatch: true,
    });

    expect(yaml).toContain("NovaVidGpuWorkerEcrRepo:");
    expect(yaml).toContain("NovaVidGpuJobDefinition:");
    expect(yaml).toContain("EcrRepoUri:");
    expect(yaml).toContain("JobDefinitionArn:");

    const jsonStr = generateCloudFormationJson({
      tenantId: "lodhi-techx",
      externalId: "novavid-ext-12345",
      enableGpuBatch: true,
    });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.Resources.NovaVidGpuWorkerEcrRepo).toBeDefined();
    expect(parsed.Resources.NovaVidGpuJobDefinition).toBeDefined();
    expect(parsed.Outputs.EcrRepoUri).toBeDefined();
  });
});

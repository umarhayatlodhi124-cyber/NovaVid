import React, { useState, useEffect } from "react";
import {
  generateCloudFormationYaml,
  generateCloudFormationJson,
  buildQuickCreateStackUrl,
  DEFAULT_CONTROL_PLANE_ACCOUNT_ID,
} from "../lib/awsCloudFormation";
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
} from "../lib/awsByoaService";
import { buildAwsDeploymentPlan } from "../lib/awsInfrastructureDeployment";
import { buildCustomerResourceInventory } from "../lib/multiTenantAwsSecurity";

interface AwsConnectionCenterProps {
  tenantId?: string;
  isOwner?: boolean;
}

export const OWNER_AWS_ACCOUNT_ID = "946935221857";
export const OWNER_AWS_REGION = "ap-southeast-2";
export const OWNER_CREDITS_USD = 120;

export const AwsConnectionCenter: React.FC<AwsConnectionCenterProps> = ({
  tenantId = "lodhi-techx",
  isOwner = true,
}) => {
  const [connection, setConnection] = useState<AwsAccountConnection>(() => {
    const existing = getStoredAwsConnection(tenantId);
    if (existing) return existing;
    return {
      tenantId,
      accountId: isOwner ? OWNER_AWS_ACCOUNT_ID : "",
      roleArn: isOwner ? `arn:aws:iam::${OWNER_AWS_ACCOUNT_ID}:role/NovaVidExecutionRole-lodhi-techx` : "",
      externalId: generateTenantExternalId(tenantId),
      region: isOwner ? OWNER_AWS_REGION : "ap-southeast-2",
      bucketName: `novavid-${tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-media-${isOwner ? OWNER_AWS_REGION : "ap-southeast-2"}`,
      status: "unconnected",
      gpuQuota: {
        instanceFamily: "G4dn",
        quotaCode: "L-384A81E9",
        quotaValue: 0,
        sufficient: false,
        message: "GPU quota unverified. Default for new AWS accounts is 0 vCPUs (minimum 4 vCPUs required).",
      },
      connectedAt: undefined,
      lastTestedAt: undefined,
      estimatedMonthlySpendUsd: 0,
    };
  });

  const [wizardViewMode, setWizardViewMode] = useState<"wizard" | "advanced">("wizard");
  const [accountIdInput, setAccountIdInput] = useState(connection.accountId || (isOwner ? OWNER_AWS_ACCOUNT_ID : ""));
  const [roleArnInput, setRoleArnInput] = useState(
    connection.roleArn || (isOwner ? `arn:aws:iam::${OWNER_AWS_ACCOUNT_ID}:role/NovaVidExecutionRole-lodhi-techx` : "")
  );
  const [regionInput, setRegionInput] = useState(connection.region || (isOwner ? OWNER_AWS_REGION : "ap-southeast-2"));
  const [gpuQuotaInput, setGpuQuotaInput] = useState<number>(connection.gpuQuota.quotaValue || 0);
  const [templateFormat, setTemplateFormat] = useState<"yaml" | "json">("yaml");
  const [templateScope, setTemplateScope] = useState<"role_only" | "full">("role_only");
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedExtId, setCopiedExtId] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatusMessage, setVerifyStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Cost calculator state
  const [monthlyVideos, setMonthlyVideos] = useState(30);
  const [avgMinutes, setAvgMinutes] = useState(2);
  const [storageGb, setStorageGb] = useState(25);
  const [useSpotPricing, setUseSpotPricing] = useState(true);
  const [enableGpuBatch, setEnableGpuBatch] = useState(false);
  const [renderTarget, setRenderTarget] = useState<"byoa_aws" | "runpod_serverless" | "local_host">(
    "byoa_aws"
  );

  const costBreakdown = calculateAwsDirectCost(
    monthlyVideos,
    avgMinutes,
    storageGb,
    useSpotPricing
  );

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [confirmDeployAck, setConfirmDeployAck] = useState(false);
  const [confirmDisconnectAck, setConfirmDisconnectAck] = useState(false);

  const resourceInventory = buildCustomerResourceInventory(
    tenantId,
    connection.accountId || "123456789012",
    regionInput
  );

  const deploymentPlan = buildAwsDeploymentPlan({
    tenantId,
    awsAccountId: connection.accountId || accountIdInput,
    awsRegion: regionInput,
    gpuQuotaAvailable: connection.gpuQuota.quotaValue,
    hasRoleConfigured: connection.status === "connected",
  });

  const cfOptions = {
    tenantId,
    externalId: connection.externalId,
    awsRegion: regionInput,
    controlPlaneAccountId: DEFAULT_CONTROL_PLANE_ACCOUNT_ID,
    enableGpuBatch,
    roleOnly: templateScope === "role_only",
  };

  const cfTemplateContent =
    templateFormat === "yaml"
      ? generateCloudFormationYaml(cfOptions)
      : generateCloudFormationJson(cfOptions);

  const quickCreateUrl = buildQuickCreateStackUrl(cfOptions);

  useEffect(() => {
    saveAwsConnection(connection);
  }, [connection]);

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(cfTemplateContent);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleCopyExtId = () => {
    navigator.clipboard.writeText(connection.externalId);
    setCopiedExtId(true);
    setTimeout(() => setCopiedExtId(false), 2500);
  };

  const handleRegenerateExtId = () => {
    const newExtId = generateTenantExternalId(tenantId);
    setConnection((prev) => ({
      ...prev,
      externalId: newExtId,
      status: "unconnected",
    }));
    setVerifyStatusMessage({
      type: "info",
      text: "New External ID generated. Update your CloudFormation stack or IAM Trust Policy.",
    });
  };

  const handleVerifyConnection = async () => {
    setIsVerifying(true);
    setVerifyStatusMessage(null);

    if (!validateAwsAccountId(accountIdInput)) {
      setIsVerifying(false);
      setConnection((prev) => ({ ...prev, status: "invalid_credentials" }));
      setVerifyStatusMessage({ type: "error", text: "Invalid AWS Account ID. Must be exactly 12 digits." });
      return;
    }

    if (!validateAwsRoleArn(roleArnInput)) {
      setIsVerifying(false);
      setConnection((prev) => ({ ...prev, status: "invalid_credentials" }));
      setVerifyStatusMessage({ type: "error", text: "Invalid IAM Role ARN. Format: arn:aws:iam::<12-digits>:role/<name>" });
      return;
    }

    const testConn: AwsAccountConnection = {
      ...connection,
      accountId: accountIdInput.trim(),
      roleArn: roleArnInput.trim(),
      region: regionInput,
      bucketName: `novavid-${tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-media-${regionInput}`,
    };

    const stsResult = await verifyAwsCrossAccountAccess(testConn);

    if (!stsResult.success) {
      setIsVerifying(false);
      setConnection((prev) => ({ ...prev, status: "invalid_credentials" }));
      setVerifyStatusMessage({ type: "error", text: stsResult.message });
      return;
    }

    const quotaResult = await checkAwsGpuQuota(testConn, gpuQuotaInput);

    setConnection({
      ...testConn,
      status: stsResult.success ? (quotaResult.sufficient ? "connected" : "quota_exceeded") : "invalid_credentials",
      gpuQuota: quotaResult,
      connectedAt: connection.connectedAt || new Date().toISOString(),
      lastTestedAt: new Date().toISOString(),
      estimatedMonthlySpendUsd: costBreakdown.totalEstimatedAwsBillUsd,
    });

    setIsVerifying(false);
    setVerifyStatusMessage({
      type: "success",
      text: `AWS Connection verified successfully! Assumed Role: ${stsResult.assumedRoleUser}. ${quotaResult.message}`,
    });
  };

  const handleDisconnect = () => {
    removeAwsConnection(tenantId);
    setConnection({
      tenantId,
      accountId: "",
      roleArn: "",
      externalId: generateTenantExternalId(tenantId),
      region: "us-east-1",
      bucketName: `novavid-${tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-media-us-east-1`,
      status: "unconnected",
      gpuQuota: {
        instanceFamily: "G4dn",
        quotaCode: "L-384A81E9",
        quotaValue: 0,
        sufficient: false,
        message: "No connection active.",
      },
      estimatedMonthlySpendUsd: 0,
    });
    setAccountIdInput("");
    setRoleArnInput("");
    setVerifyStatusMessage({
      type: "info",
      text: "AWS account disconnected. Temporary credentials expired and local configuration cleared.",
    });
  };

  const handleAutoFillOwnerProfile = () => {
    setAccountIdInput(OWNER_AWS_ACCOUNT_ID);
    setRegionInput(OWNER_AWS_REGION);
    const expectedRoleArn = `arn:aws:iam::${OWNER_AWS_ACCOUNT_ID}:role/NovaVidExecutionRole-${tenantId}`;
    setRoleArnInput(expectedRoleArn);
    setConnection((prev) => ({
      ...prev,
      accountId: OWNER_AWS_ACCOUNT_ID,
      region: OWNER_AWS_REGION,
      roleArn: expectedRoleArn,
      bucketName: `novavid-${tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-media-${OWNER_AWS_REGION}`,
    }));
    setVerifyStatusMessage({
      type: "info",
      text: `⚡ Owner AWS Profile loaded automatically: Account ${OWNER_AWS_ACCOUNT_ID} in Sydney (${OWNER_AWS_REGION}). Zero manual configuration required.`,
    });
  };

  const quickCreateSydneyUrl = buildQuickCreateStackUrl({
    tenantId,
    externalId: connection.externalId,
    awsRegion: OWNER_AWS_REGION,
    controlPlaneAccountId: DEFAULT_CONTROL_PLANE_ACCOUNT_ID,
    enableGpuBatch,
    roleOnly: true,
    stackName: "NovaVid-Execution-Stack",
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              AWS BRING YOUR OWN ACCOUNT (BYOA)
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Zero Shared Billing • Direct Customer AWS Invoicing
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
              STS Cross-Account Role • ExternalId Protected
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">
            AWS Cloud Infrastructure & BYOA Center
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Connect your own AWS account to host GPU rendering, store MP4 media in your private S3 bucket, and pay AWS directly with zero SaaS markup.
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center space-x-3 bg-gray-900 border border-gray-800 p-3 rounded-xl">
          <div
            className={`w-3.5 h-3.5 rounded-full animate-pulse ${
              connection.status === "connected"
                ? "bg-emerald-500"
                : connection.status === "quota_exceeded"
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
          />
          <div className="text-left">
            <p className="text-xs font-bold text-gray-300">
              {connection.status === "connected"
                ? "CONNECTED TO AWS"
                : connection.status === "quota_exceeded"
                ? "QUOTA WARNING"
                : "NOT CONNECTED"}
            </p>
            <p className="text-[11px] text-gray-400 font-mono">
              {connection.accountId ? `Account: ${connection.accountId}` : "BYOA Standby"}
            </p>
          </div>
        </div>
      </div>

      {/* Status Feedback Alert */}
      {verifyStatusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm ${
            verifyStatusMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : verifyStatusMessage.type === "error"
              ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
              : "bg-sky-950/40 border-sky-500/40 text-sky-300"
          }`}
        >
          {verifyStatusMessage.text}
        </div>
      )}

      {/* Owner AWS Pre-Configured Profile Card */}
      <div className="bg-gradient-to-r from-amber-950/40 via-gray-900 to-amber-950/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-amber-500 text-black">
                LODHI TECHX • OWNER PROFILE
              </span>
              <span className="text-xs text-amber-400 font-semibold">
                Pre-Detected AWS Account &amp; Sydney Region
              </span>
            </div>
            <p className="text-sm font-bold text-white">
              AWS Account ID: <span className="font-mono text-amber-300">{OWNER_AWS_ACCOUNT_ID}</span> • Region: <span className="font-mono text-emerald-400">{OWNER_AWS_REGION} (Asia Pacific - Sydney)</span>
            </p>
            <p className="text-xs text-gray-400">
              Free Plan with <span className="text-emerald-400 font-semibold">${OWNER_CREDITS_USD} available credits</span> • GPU Quota: <span className="font-mono text-amber-400">{connection.gpuQuota.quotaValue} vCPUs</span> • Scale-to-Zero Guarantee
            </p>
          </div>
          <button
            type="button"
            onClick={handleAutoFillOwnerProfile}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-lg transition-all shadow-md shadow-amber-500/20 whitespace-nowrap flex items-center space-x-2"
          >
            <span>⚡ Auto-Configure Owner Profile</span>
          </button>
        </div>
      </div>

      {/* View Mode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-3 gap-3">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setWizardViewMode("wizard")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
              wizardViewMode === "wizard"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "bg-gray-900 text-gray-400 hover:text-white"
            }`}
          >
            <span>🪄 1-Click Automated Setup Wizard (Recommended)</span>
          </button>
          <button
            type="button"
            onClick={() => setWizardViewMode("advanced")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
              wizardViewMode === "advanced"
                ? "bg-gray-800 text-white border border-gray-700"
                : "bg-gray-900 text-gray-400 hover:text-white"
            }`}
          >
            <span>⚙️ Advanced IAM &amp; Infrastructure Matrix</span>
          </button>
        </div>
        <div className="text-xs text-gray-400 font-mono flex items-center space-x-2">
          <span>Control-Plane SaaS Account:</span>
          <span className="text-amber-400 font-bold">{DEFAULT_CONTROL_PLANE_ACCOUNT_ID}</span>
        </div>
      </div>

      {/* GUIDED AUTOMATED WIZARD VIEW */}
      {wizardViewMode === "wizard" && (
        <div className="space-y-6">
          {/* Step 1: 1-Click CloudFormation Stack Launch */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-xs">
                    1
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Step 1: Launch Pre-Configured CloudFormation Stack
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Zero technical settings to write in AWS Console. All parameters are pre-filled for Sydney (ap-southeast-2).
                </p>
              </div>
              <span className="px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold self-start sm:self-auto">
                $0 Free IAM Stack
              </span>
            </div>

            {/* Bilingual Instruction Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-950 border border-gray-800 rounded-xl">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-amber-400 flex items-center space-x-1.5">
                  <span>🇵🇰</span> <span>اردو ہدایات (Urdu Guide):</span>
                </p>
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  Aapko AWS Console me koi technical parameter ya IAM trust policy likhne ki zaroorat nahi hai. Niche diye gaye <strong>"🚀 1-Click Launch Stack in AWS Console"</strong> button par click karein. CloudFormation QuickCreate page seedha Sydney (ap-southeast-2) me saare parameters ke sath open hoga. Page ke aakhir me sirf checkbox <em>"I acknowledge that AWS CloudFormation might create IAM resources"</em> ko tick karein aur <strong>"Create stack"</strong> par click karein.
                </p>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-sky-400 flex items-center space-x-1.5">
                  <span>🌐</span> <span>English Instructions:</span>
                </p>
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  Zero technical configuration needed. Click the button below to open AWS CloudFormation QuickCreate in <strong>ap-southeast-2 (Sydney)</strong>. External ID, Control-Plane account, and Tenant ID are pre-filled. Scroll down, check <em>"I acknowledge that AWS CloudFormation might create IAM resources"</em>, and click <strong>"Create stack"</strong>.
                </p>
              </div>
            </div>

            {/* Pre-filled Parameter Summary Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-950/70 border border-gray-800 rounded-lg text-xs">
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Target Region</span>
                <span className="text-emerald-400 font-mono font-semibold">ap-southeast-2 (Sydney)</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Stack Name</span>
                <span className="text-white font-mono font-semibold">NovaVid-Execution-Stack</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Control Plane Root</span>
                <span className="text-gray-300 font-mono text-[11px]">{DEFAULT_CONTROL_PLANE_ACCOUNT_ID}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Tenant External ID</span>
                <span className="text-amber-400 font-mono text-[11px] truncate block" title={connection.externalId}>
                  {connection.externalId}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={quickCreateSydneyUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center space-x-2"
              >
                <span>🚀 1-Click Launch Stack in AWS Console (Sydney ap-southeast-2)</span>
              </a>
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="w-full sm:w-auto px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-all border border-gray-700 flex items-center justify-center space-x-1.5"
              >
                <span>{copiedTemplate ? "✓ Template Copied" : "📋 Copy Template (YAML)"}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyExtId}
                className="w-full sm:w-auto px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-all border border-gray-700 flex items-center justify-center space-x-1.5"
              >
                <span>{copiedExtId ? "✓ External ID Copied" : "🔑 Copy External ID"}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Auto-Verification with Real STS AssumeRole */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-xs">
                    2
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Step 2: Verify AWS Connection &amp; Credentials (STS)
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Validates STS AssumeRole connection with the created IAM Role in your AWS account.
                </p>
              </div>
              <span
                className={`px-3 py-1 text-xs rounded-full font-bold border ${
                  connection.status === "connected"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {connection.status === "connected" ? "✓ VERIFIED LIVE" : "AWAITING VERIFICATION"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Target AWS Account ID
                </label>
                <input
                  type="text"
                  value={accountIdInput}
                  onChange={(e) => setAccountIdInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Target AWS Region
                </label>
                <select
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                >
                  <option value="ap-southeast-2">ap-southeast-2 (Asia Pacific - Sydney) • Owner Assigned</option>
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="us-west-2">us-west-2 (Oregon)</option>
                  <option value="eu-west-1">eu-west-1 (Ireland)</option>
                  <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                  <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Assumed IAM Role ARN
                </label>
                <input
                  type="text"
                  value={roleArnInput}
                  onChange={(e) => setRoleArnInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-gray-300 font-semibold">Security Model: Zero Permanent Access Keys Stored</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  NovaVid control plane exchanges your Tenant External ID for ephemeral 1-hour STS session tokens.
                </p>
              </div>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyConnection}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 whitespace-nowrap"
              >
                {isVerifying ? "Verifying Real STS AssumeRole..." : "⚡ Auto-Verify AWS Connection (STS)"}
              </button>
            </div>

            {connection.status === "connected" && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-xs space-y-2">
                <p className="font-bold text-emerald-400 flex items-center space-x-2">
                  <span>✅</span> <span>AWS Connection Verified &amp; Authenticated</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300 text-[11px] font-mono">
                  <div>• Assumed Role: {connection.roleArn}</div>
                  <div>• Region: {connection.region}</div>
                  <div>• Connected At: {connection.connectedAt || "Active"}</div>
                  <div>• Zero Permanent Keys: Protected by AWS STS</div>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: GPU Quota, Cloud Balance & Cost Safety */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-xs">
                    3
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Step 3: GPU Quota &amp; Cloud Balance Protection
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Real quota monitoring for NVIDIA T4 GPU instances (g4dn.xlarge). Direct billing from AWS.
                </p>
              </div>
              <span className="px-3 py-1 text-xs rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold self-start sm:self-auto">
                Scale-to-Zero Guaranteed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-1">
                <p className="text-gray-400 text-xs font-semibold">Current GPU Quota</p>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  {connection.gpuQuota.quotaValue} <span className="text-xs text-gray-400">vCPUs</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  Initial AWS default limit is 0 vCPUs for new accounts.
                </p>
              </div>

              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-1">
                <p className="text-gray-400 text-xs font-semibold">Required for GPU Render</p>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  4 <span className="text-xs text-gray-400">vCPUs</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  Quota Code: <span className="text-gray-300 font-mono">L-384A81E9</span> (G &amp; VT instances)
                </p>
              </div>

              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-1">
                <p className="text-gray-400 text-xs font-semibold">Owner Available Credits</p>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  ${OWNER_CREDITS_USD} <span className="text-xs text-gray-400">USD</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  AWS Free Tier Credits cover ~750+ render minutes on Spot.
                </p>
              </div>
            </div>

            {/* 1-Click Direct Link to AWS Sydney Service Quota */}
            <div className="p-4 bg-gradient-to-r from-sky-950/40 to-gray-950 border border-sky-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span>⚡ Request 4 or 8 vCPUs in AWS Sydney Console</span>
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Click to open the exact EC2 Service Quota page for <strong>L-384A81E9</strong> in Sydney (ap-southeast-2). Click &quot;Request quota increase&quot;, enter <strong>8</strong>, and submit.
                </p>
              </div>
              <a
                href="https://ap-southeast-2.console.aws.amazon.com/servicequotas/home/services/ec2/quotas/L-384A81E9"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all whitespace-nowrap"
              >
                <span>Open Sydney Quota Console →</span>
              </a>
            </div>

            {/* Safety & Cost Guarantee */}
            <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2 text-xs text-gray-400">
              <p className="font-bold text-gray-200">🛡️ Lodhi TechX Direct Billing Protection:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li><strong>$0 Idle Compute Cost:</strong> AWS Batch auto-scales to 0 instances when no render is in progress.</li>
                <li><strong>Direct AWS Billing:</strong> Charges appear on your AWS credit card directly. NovaVid charges $0 markup.</li>
                <li><strong>Data Ownership:</strong> All project MP4 files, audio clips, and thumbnails remain strictly in your private S3 bucket.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED IAM & INFRASTRUCTURE MATRIX VIEW */}
      {wizardViewMode === "advanced" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connection Setup & CloudFormation (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: CloudFormation 1-Click Deployment */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Step 1: Deploy CloudFormation Stack in Your AWS Account
                </h2>
                <p className="text-xs text-gray-400">
                  Deploys your isolated S3 Media Bucket and cross-account IAM Role with zero access outside your account.
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                AWS Quick-Create Ready
              </span>
            </div>

            <div className="p-4 bg-gray-950 border border-gray-800 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">1-Click Automated AWS Console Deployment</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pre-fills Region, Tenant Identifier, and External ID directly in AWS CloudFormation.
                </p>
              </div>
              <a
                href={quickCreateUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5 whitespace-nowrap"
              >
                <span>🚀 Launch Stack in AWS Console</span>
              </a>
            </div>

            {/* CloudFormation Stack Configuration Options */}
            <div className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-lg text-xs">
              <div>
                <span className="font-semibold text-gray-200">Include AWS Batch & ECR Container Resources</span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Provisions ECR repository, Batch GPU Job Definition, and autoscaling compute environment.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableGpuBatch}
                onChange={(e) => setEnableGpuBatch(e.target.checked)}
                className="accent-amber-500 h-4 w-4 rounded"
              />
            </div>

            {/* Template Viewer & Copier */}
            <div className="space-y-2">
              <div className="flex flex-wrap justify-between items-center text-xs text-gray-400 gap-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                    <button
                      type="button"
                      onClick={() => setTemplateScope("role_only")}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        templateScope === "role_only"
                          ? "bg-amber-600 text-white font-semibold"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      🛡️ Role Only ($0 Free)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateScope("full")}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        templateScope === "full"
                          ? "bg-amber-600 text-white font-semibold"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      📦 Full Infrastructure
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setTemplateFormat("yaml")}
                      className={`px-2 py-0.5 rounded ${
                        templateFormat === "yaml"
                          ? "bg-gray-700 text-white font-bold"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      YAML
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateFormat("json")}
                      className={`px-2 py-0.5 rounded ${
                        templateFormat === "json"
                          ? "bg-gray-700 text-white font-bold"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyTemplate}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs transition-colors"
                >
                  {copiedTemplate ? "✓ Copied to Clipboard" : "📋 Copy Template Code"}
                </button>
              </div>

              <textarea
                readOnly
                value={cfTemplateContent}
                rows={8}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-emerald-400 font-mono leading-relaxed focus:outline-none"
              />
            </div>
          </div>

          {/* Infrastructure Readiness & Security Status Matrix */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  AWS Infrastructure Readiness & Security Status
                </h2>
                <p className="text-xs text-gray-400">
                  Pre-flight validation matrix for customer & owner AWS account components. Zero paid compute active.
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold">
                {deploymentPlan.readinessSummary.readyForGpuWorkloads ? "READY FOR GPU JOBS" : "CONFIGURATION PENDING"}
              </span>
            </div>

            <div className="space-y-2">
              {deploymentPlan.components.map((comp) => (
                <div
                  key={comp.componentId}
                  className="p-3 bg-gray-950 border border-gray-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-200">{comp.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          comp.status === "VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : comp.status === "IMPLEMENTED"
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                            : comp.status === "BLOCKED"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {comp.status}
                      </span>
                      {comp.isPaidResource ? (
                        <span className="text-[10px] text-amber-400 font-mono">~$0 (idle)</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400">FREE</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">{comp.details}</p>
                    {comp.blockerReason && (
                      <p className="text-[11px] text-rose-400 italic">⚠️ Blocker: {comp.blockerReason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {deploymentPlan.readinessSummary.unresolvedBlockers.length > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs text-amber-300 space-y-1">
                <p className="font-bold">Active Configuration Requirements:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {deploymentPlan.readinessSummary.unresolvedBlockers.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Step 2: Role Delegation & Connection Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Step 2: Connect IAM Role & Validate Credentials
            </h2>
            <p className="text-xs text-gray-400">
              Provide your 12-digit AWS Account ID and the Role ARN created by the CloudFormation stack.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  AWS Account ID (12 Digits)
                </label>
                <input
                  type="text"
                  value={accountIdInput}
                  onChange={(e) => setAccountIdInput(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  AWS Region
                </label>
                <select
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                >
                  <option value="ap-southeast-2">ap-southeast-2 (Asia Pacific - Sydney) • Owner Assigned</option>
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="us-west-2">us-west-2 (Oregon)</option>
                  <option value="eu-west-1">eu-west-1 (Ireland)</option>
                  <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                  <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  IAM Role ARN
                </label>
                <input
                  type="text"
                  value={roleArnInput}
                  onChange={(e) => setRoleArnInput(e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/NovaVidExecutionRole-tenant"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 p-3 bg-gray-950 border border-gray-800 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-300">Tenant External ID (Security Token):</p>
                  <p className="text-xs text-emerald-400 font-mono mt-0.5">{connection.externalId}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyExtId}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs transition-colors"
                  >
                    {copiedExtId ? "✓ Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateExtId}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                  >
                    Rotate
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyConnection}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isVerifying ? "Verifying STS Cross-Account Access..." : "⚡ Verify Connection & Check Quotas"}
              </button>

              {(connection.status === "connected" || connection.status === "quota_exceeded") && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsDeployModalOpen(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs rounded-lg shadow-lg shadow-amber-500/20 transition-all whitespace-nowrap"
                  >
                    🚀 Deploy My NovaVid Cloud Infrastructure
                  </button>

                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleVerifyConnection}
                    className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs rounded-lg transition-all"
                  >
                    🔄 Reconnect / Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCleanupModalOpen(true)}
                    className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-semibold text-xs rounded-lg transition-all whitespace-nowrap"
                  >
                    ⚠️ Disconnect & Safe Cleanup
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quotas, Spend Forecaster & Execution Engine (1 col) */}
        <div className="space-y-6">
          {/* GPU Quotas Monitor */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>🖥️ AWS GPU Service Quotas</span>
            </h3>

            <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Instance Family:</span>
                <span className="text-white font-bold">{connection.gpuQuota.instanceFamily} (NVIDIA T4)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Quota Code:</span>
                <span className="font-mono text-gray-300">{connection.gpuQuota.quotaCode}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Allocated Limit:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {connection.gpuQuota.quotaValue} vCPUs
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-800">
                <span className="text-gray-400">Granted Limit (vCPUs):</span>
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={gpuQuotaInput}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setGpuQuotaInput(val);
                  }}
                  className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-right font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-2 border-t border-gray-800 pt-2">
                {connection.gpuQuota.message}
              </p>
            </div>

            <a
              href="https://console.aws.amazon.com/servicequotas/home/services/ec2/quotas/L-384A81E9"
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-sky-400 hover:text-sky-300 hover:underline"
            >
              Request AWS GPU Quota Increase →
            </a>
          </div>

          {/* Render Execution Target Selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-white">Render Execution Target</h3>
            <p className="text-xs text-gray-400">Select where NovaVid dispatches video rendering jobs:</p>

            <div className="space-y-2">
              {[
                {
                  id: "byoa_aws",
                  title: "BYOA AWS Batch/ECS Worker",
                  desc: "Runs in your AWS account. Direct billing from AWS with zero SaaS markup.",
                },
                {
                  id: "runpod_serverless",
                  title: "RunPod Serverless Cloud",
                  desc: "Zero infrastructure setup. Fast NVIDIA RTX 4090 / A4000 GPU instances.",
                },
                {
                  id: "local_host",
                  title: "Local Host Rendering",
                  desc: "Uses your local machine CPU/GPU. Free, requires PC to stay on.",
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRenderTarget(t.id as typeof renderTarget)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                    renderTarget === t.id
                      ? "bg-amber-950/40 border-amber-500 text-white font-semibold"
                      : "bg-gray-950 border-gray-800 text-gray-300 hover:bg-gray-800/40"
                  }`}
                >
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Transparent Direct AWS Cost Forecaster */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">AWS Direct Cost Forecaster</h3>
              <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                NO SAAS MARKUP
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Videos / Month:</span>
                  <span className="text-white font-bold">{monthlyVideos}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={monthlyVideos}
                  onChange={(e) => setMonthlyVideos(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Avg Duration / Video:</span>
                  <span className="text-white font-bold">{avgMinutes} min</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={avgMinutes}
                  onChange={(e) => setAvgMinutes(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>S3 Media Storage:</span>
                  <span className="text-white font-bold">{storageGb} GB</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={storageGb}
                  onChange={(e) => setStorageGb(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-gray-400">Use Spot GPU Instances (70% savings):</span>
                <input
                  type="checkbox"
                  checked={useSpotPricing}
                  onChange={(e) => setUseSpotPricing(e.target.checked)}
                  className="accent-amber-500 h-4 w-4 rounded"
                />
              </div>

              <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg space-y-2 mt-2">
                <div className="flex justify-between text-gray-400">
                  <span>GPU Compute ({costBreakdown.gpuHours} hrs):</span>
                  <span className="text-white font-mono">${costBreakdown.gpuCostUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>S3 Storage ({storageGb} GB):</span>
                  <span className="text-white font-mono">${costBreakdown.s3CostUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Bandwidth & Egress:</span>
                  <span className="text-white font-mono">${costBreakdown.dataTransferCostUsd.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-800 pt-2 flex justify-between font-bold text-sm">
                  <span className="text-white">Estimated Monthly AWS Bill:</span>
                  <span className="text-emerald-400 font-mono">
                    ${costBreakdown.totalEstimatedAwsBillUsd.toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic">
                * Note: This amount is billed directly to your AWS credit card by Amazon Web Services. NovaVid charges $0 fee.
              </p>

              <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-lg text-[11px] text-amber-300">
                <span className="font-bold">⚠️ Notice on AWS Budgets:</span> AWS Budgets and CloudWatch Billing Alarms provide alerts via email/SNS, but do not automatically terminate running EC2/Batch instances. Set budget alerts in your AWS Console.
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Modal 1: Deploy Customer Cloud Infrastructure Confirmation (Phase 4) */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>🚀 Deploy My NovaVid Cloud Infrastructure</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300">
              You are about to launch your customer-owned rendering infrastructure stack in your AWS account ({connection.accountId || "Connected"}).
            </p>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-gray-200">Resources to be provisioned in your AWS Account:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400 bg-gray-950 p-3 rounded-lg border border-gray-800">
                <li><span className="text-white font-mono">S3 Input Bucket:</span> Raw project media, audio clips & fonts</li>
                <li><span className="text-white font-mono">S3 Output Bucket:</span> Rendered MP4 videos & YouTube thumbnails</li>
                <li><span className="text-white font-mono">ECR Repository:</span> NovaVid headless GPU worker container image</li>
                <li><span className="text-white font-mono">AWS Batch Compute Environment:</span> Managed Spot GPU cluster (scales to 0 min vCPUs)</li>
                <li><span className="text-white font-mono">AWS Batch Job Queue & Definition:</span> 1 GPU, 4 vCPUs, 16GB RAM container spec</li>
              </ul>
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-lg text-xs text-amber-300 space-y-1">
              <p className="font-bold">Cost & Quota Disclosure:</p>
              <p className="text-[11px] leading-relaxed">
                • Minimum GPU compute is set to 0. Zero compute charges accrue while idle ($0/hr).<br />
                • When rendering, Spot compute is billed by AWS at ~$0.158/hr. S3 storage is ~$0.023/GB.<br />
                • If your GPU service quota (L-384A81E9) is 0, Batch jobs will queue until AWS grants your vCPU quota increase.
              </p>
            </div>

            <label className="flex items-start space-x-2 text-xs text-gray-300 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmDeployAck}
                onChange={(e) => setConfirmDeployAck(e.target.checked)}
                className="accent-amber-500 h-4 w-4 mt-0.5 rounded"
              />
              <span>
                I confirm that I own this AWS account, authorize creation of these CloudFormation resources, and agree to pay AWS directly for my usage with zero SaaS markup.
              </span>
            </label>

            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <a
                href={quickCreateUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsDeployModalOpen(false)}
                className={`px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold rounded-lg text-xs shadow-lg transition-all ${
                  confirmDeployAck ? "opacity-100 hover:from-amber-500 hover:to-amber-400" : "opacity-40 pointer-events-none"
                }`}
              >
                Confirm & Launch Stack in AWS Console →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Disconnect & Safe Infrastructure Cleanup (Phase 8) */}
      {isCleanupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>⚠️ Disconnect AWS Account & Safe Cleanup</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCleanupModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Review resource inventory before disconnecting AWS Account ({connection.accountId}).
            </p>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-gray-200">Customer AWS Resource Inventory:</p>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-2 max-h-48 overflow-y-auto font-mono text-[11px]">
                {resourceInventory.resources.map((res) => (
                  <div key={res.arn} className="flex justify-between items-center border-b border-gray-800/60 pb-1">
                    <div>
                      <span className="text-white font-semibold">{res.name}</span>
                      <p className="text-[10px] text-gray-500">{res.type}</p>
                    </div>
                    {res.hasCustomerData ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        PROTECTED MEDIA
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-[10px]">
                        SAFE TO DELETE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-lg text-xs text-rose-300 space-y-1">
              <p className="font-bold">Data Protection Policy:</p>
              <p className="text-[11px]">
                NovaVid will **never delete your customer S3 media buckets** automatically. Your raw assets and rendered videos remain safely preserved in your AWS account unless you manually delete them from your AWS S3 Console.
              </p>
            </div>

            <label className="flex items-start space-x-2 text-xs text-gray-300 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmDisconnectAck}
                onChange={(e) => setConfirmDisconnectAck(e.target.checked)}
                className="accent-rose-500 h-4 w-4 mt-0.5 rounded"
              />
              <span>
                I understand that disconnecting revokes STS temporary session tokens, cancels active render queue monitoring, and clears local AWS connection credentials.
              </span>
            </label>

            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsCleanupModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmDisconnectAck}
                onClick={() => {
                  handleDisconnect();
                  setIsCleanupModalOpen(false);
                }}
                className={`px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs shadow-lg transition-all ${
                  confirmDisconnectAck ? "opacity-100 hover:bg-rose-500" : "opacity-40 cursor-not-allowed"
                }`}
              >
                Confirm Disconnect & Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

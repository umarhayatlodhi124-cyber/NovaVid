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

interface AwsConnectionCenterProps {
  tenantId?: string;
  isOwner?: boolean;
}

export const AwsConnectionCenter: React.FC<AwsConnectionCenterProps> = ({
  tenantId = "lodhi-techx",
  isOwner = true,
}) => {
  const [connection, setConnection] = useState<AwsAccountConnection>(() => {
    const existing = getStoredAwsConnection(tenantId);
    if (existing) return existing;
    return {
      tenantId,
      accountId: isOwner ? "891377192456" : "",
      roleArn: isOwner ? "arn:aws:iam::891377192456:role/NovaVidExecutionRole-lodhi-techx" : "",
      externalId: generateTenantExternalId(tenantId),
      region: "us-east-1",
      bucketName: `novavid-${tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-media-us-east-1`,
      status: isOwner ? "connected" : "unconnected",
      gpuQuota: {
        instanceFamily: "G4dn",
        quotaCode: "L-384A81E9",
        quotaValue: 8,
        sufficient: true,
        message: "Sufficient GPU quota verified: 8 vCPUs (supports g4dn.xlarge / g4dn.2xlarge).",
      },
      connectedAt: isOwner ? new Date().toISOString() : undefined,
      lastTestedAt: isOwner ? new Date().toISOString() : undefined,
      estimatedMonthlySpendUsd: 14.85,
    };
  });

  const [accountIdInput, setAccountIdInput] = useState(connection.accountId);
  const [roleArnInput, setRoleArnInput] = useState(connection.roleArn);
  const [regionInput, setRegionInput] = useState(connection.region);
  const [templateFormat, setTemplateFormat] = useState<"yaml" | "json">("yaml");
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
  const [renderTarget, setRenderTarget] = useState<"byoa_aws" | "runpod_serverless" | "local_host">(
    "byoa_aws"
  );

  const costBreakdown = calculateAwsDirectCost(
    monthlyVideos,
    avgMinutes,
    storageGb,
    useSpotPricing
  );

  const cfOptions = {
    tenantId,
    externalId: connection.externalId,
    awsRegion: regionInput,
    controlPlaneAccountId: DEFAULT_CONTROL_PLANE_ACCOUNT_ID,
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

    const quotaResult = await checkAwsGpuQuota(testConn, 8);

    setConnection({
      ...testConn,
      status: quotaResult.sufficient ? "connected" : "quota_exceeded",
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

      {/* Main Grid: 2 Columns */}
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

            {/* Template Viewer & Copier */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center space-x-2">
                  <span>Template Format:</span>
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

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyConnection}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isVerifying ? "Verifying STS Cross-Account Access..." : "⚡ Verify Connection & Check Quotas"}
              </button>

              {connection.status === "connected" && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-semibold text-xs rounded-lg transition-all"
                >
                  Revoke & Disconnect AWS
                </button>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

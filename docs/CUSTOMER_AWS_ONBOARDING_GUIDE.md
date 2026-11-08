# NOVAVID AI STUDIO 2.0 — CUSTOMER AWS ONBOARDING GUIDE
## Complete Self-Service Guide for Customer-Owned AWS Infrastructure (BYOA Option B)

**Brand Owner:** LODHI TECHX  
**Product:** NovaVid AI Studio 2.0  
**Founder:** Umar Hayat  
**Document Version:** 2.1.0  
**Target Audience:** NovaVid Customers & Enterprise Tenants  

---

## 1. INTRODUCTION & PHILOSOPHY

NovaVid AI Studio 2.0 is built on a **100% Customer-Owned AWS Architecture (Option B)**. This means:

1. **You Own Your Infrastructure**: All rendering compute, S3 storage buckets, and ECR containers run directly inside your own Amazon Web Services (AWS) account.
2. **Direct Billing from AWS**: You pay AWS directly at wholesale cost ($0.00 NovaVid markup).
3. **Scale-to-Zero Guarantee**: When you are not actively rendering videos, all GPU compute nodes scale to **0 vCPUs**, incurring **$0.00/hour** in idle compute charges.
4. **Complete Data Privacy**: Your raw media footage, narration audio, generated video files, and YouTube credentials remain strictly within your AWS boundary.
5. **Zero Permanent Secrets**: NovaVid never asks for, receives, or stores your AWS root password, IAM user passwords, or permanent AWS Access Keys (`AKIA...`). NovaVid connects exclusively via ephemeral AWS STS (Security Token Service) assume-role sessions.

---

## 2. PREREQUISITES

Before connecting to NovaVid, ensure you have:
- An active [AWS Account](https://aws.amazon.com/).
- Administrative or IAM management access to your AWS account.
- Your 12-digit AWS Account ID (found in the top-right corner of the AWS Management Console).
- Your desired deployment region (recommended: `us-east-1` (N. Virginia), `us-west-2` (Oregon), or `eu-central-1` (Frankfurt)).

---

## 3. STEP-BY-STEP ONBOARDING WALKTHROUGH

### Step 1: Open the NovaVid AWS Connection Center
1. Launch NovaVid AI Studio 2.0 and log in with your customer account.
2. Navigate to **Cloud Infrastructure** > **AWS Connection Center** in the sidebar.
3. Observe your uniquely generated **External ID** (e.g., `novavid-cust_a1b2c3d4-7f8e9a0b`). This External ID prevents "confused deputy" attacks and is cryptographically tied to your tenant account.

---

### Step 2: Choose Your Deployment Method

NovaVid provides two methods to provision your infrastructure:
- **Method A (Recommended — 1-Click CloudFormation)**: Automatically provisions your S3 buckets, IAM execution role, ECR repository, and AWS Batch GPU queue in under 3 minutes.
- **Method B (Manual IAM Role Setup)**: Manually configure an IAM role using the AWS Console or CLI.

---

### Method A: 1-Click AWS CloudFormation Deployment (Recommended)

1. In the NovaVid AWS Connection Center, click **🚀 Deploy My NovaVid Cloud Infrastructure**.
2. A deployment review modal will open displaying:
   - Your S3 Input and Output bucket names
   - Your ECR container repository name
   - Your AWS Batch GPU queue configuration (`minvCpus: 0`, `maxvCpus: 16`)
   - Cost disclosure and scale-to-zero confirmation
3. Check the confirmation checkbox and click **Launch CloudFormation Stack**.
4. NovaVid will open the AWS CloudFormation Console with the pre-filled template.
5. Review the stack parameters:
   - `TenantId`: Your NovaVid tenant identifier.
   - `ExternalId`: Your unique External ID.
   - `NovaVidControlPlaneAccountId`: `891377192456`.
6. Scroll to the bottom, check **"I acknowledge that AWS CloudFormation might create IAM resources with custom names"**, and click **Create Stack**.
7. Wait 2–3 minutes until the stack status displays **CREATE_COMPLETE**.
8. Go to the **Outputs** tab of your stack in the AWS Console. Copy the `NovaVidExecutionRoleArn` value.
9. Return to NovaVid, paste the Role ARN, and click **Verify STS Connection**.

---

### Method B: Manual IAM Execution Role Setup

If your organization prefers manual IAM role provisioning, follow these steps:

#### 1. Create the IAM Role
1. Sign in to the [AWS IAM Console](https://console.aws.amazon.com/iam/).
2. In the navigation pane, choose **Roles** > **Create role**.
3. Select **Custom trust policy** and paste the following policy, replacing `<YOUR_EXTERNAL_ID>` with the External ID shown in your NovaVid Connection Center:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "NovaVidControlPlaneAssumeRole",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::891377192456:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "<YOUR_EXTERNAL_ID>"
        }
      }
    }
  ]
}
```

#### 2. Attach Least-Privilege Policy
Attach an inline policy named `NovaVidCustomerExecutionPolicy` scoped strictly to your tenant resources:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ScopedMediaAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::novavid-<YOUR_TENANT_ID>-*",
        "arn:aws:s3:::novavid-<YOUR_TENANT_ID>-*/*"
      ]
    },
    {
      "Sid": "BatchScopedJobExecution",
      "Effect": "Allow",
      "Action": [
        "batch:SubmitJob",
        "batch:DescribeJobs",
        "batch:TerminateJob",
        "batch:CancelJob"
      ],
      "Resource": [
        "arn:aws:batch:*:<YOUR_ACCOUNT_ID>:job-queue/novavid-gpu-queue-<YOUR_TENANT_ID>",
        "arn:aws:batch:*:<YOUR_ACCOUNT_ID>:job-definition/novavid-render-task:*"
      ]
    },
    {
      "Sid": "ECRScopedImagePull",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchScopedTelemetry",
      "Effect": "Allow",
      "Action": [
        "logs:GetLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:<YOUR_ACCOUNT_ID>:log-group:/aws/batch/job:*"
    }
  ]
}
```

#### 3. Save the Role
Name the role `NovaVidExecutionRole-<YOUR_TENANT_ID>` and copy its ARN (e.g., `arn:aws:iam::123456789012:role/NovaVidExecutionRole-cust_a1b2c3d4`).

---

### Step 3: STS Cross-Account Verification
1. In NovaVid, enter:
   - **AWS Account ID**: Your 12-digit AWS Account ID.
   - **AWS Region**: e.g., `us-east-1`.
   - **IAM Role ARN**: The ARN created in Step 2.
2. Click **Verify STS Connection**.
3. NovaVid will request an ephemeral STS session using your External ID.
4. Once verified, a green badge **"CONNECTED (BYOA)"** will appear, displaying session token expiry (3600 seconds) and account confirmation.

---

### Step 4: Requesting GPU Quota (`L-384A81E9`)

New AWS accounts have a default quota of **0 vCPUs** for GPU instances. Until approved by AWS, GPU rendering will be blocked.

#### How to Request Quota:
1. In the AWS Management Console, open [Service Quotas](https://console.aws.amazon.com/servicequotas/).
2. In the navigation pane, select **AWS services** > **Amazon Elastic Compute Cloud (Amazon EC2)**.
3. In the search box, search for: `Running On-Demand G and VT instances` (Quota Code: `L-384A81E9`).
4. Select the quota and click **Request quota increase**.
5. Set the new requested value to at least **8 vCPUs** (this allows running one `g4dn.2xlarge` or two `g4dn.xlarge` instances).
6. In the use case description, enter:  
   *"Rendering and neural avatar video encoding using NovaVid studio worker on EC2 G4dn instances."*
7. Submit the request. Approval typically takes between 15 minutes and 24 hours.
8. Once approved, enter your approved quota in NovaVid's **Granted Quota Input** and click **Refresh Status**. The status will transition from `BLOCKED (0 vCPUs)` to `HEALTHY (8 vCPUs)`.

---

### Step 5: Setting Up AWS Budgets & Alerts

NovaVid is engineered to scale to zero, but you should always maintain cost safety guardrails.

> **Important Note:** AWS Budgets are notification and alert mechanisms; they do **not** automatically stop running instances. However, NovaVid's AWS Batch compute environment automatically terminates worker instances as soon as rendering finishes (`minvCpus: 0`).

#### To configure an AWS Budget:
1. Open the [AWS Budgets Console](https://console.aws.amazon.com/billing/home#/budgets).
2. Click **Create budget** > **Cost budget**.
3. Set your target monthly spend (e.g., `$20.00` or `$50.00`).
4. Configure email notification thresholds at 50%, 80%, and 100% of budgeted spend.
5. Save the budget.

---

### Step 6: Disconnecting & Safe Cleanup

If you ever wish to disconnect NovaVid or delete your cloud resources:
1. Open the **AWS Connection Center** in NovaVid.
2. Click **⚠️ Disconnect & Safe Cleanup**.
3. The Protected Resource Inventory modal will display:
   - Your S3 Input and Output buckets (marked as containing your customer data).
   - Your AWS Batch Compute Environment and Job Queue (safe to delete).
   - Your ECR Repository and IAM Role.
4. Choose your action:
   - **Disconnect Control Plane**: Detaches NovaVid from your AWS account immediately. Zero cloud resources are deleted; your data remains untouched.
   - **Full Stack Teardown via CloudFormation**: If you wish to delete the infrastructure, go to CloudFormation in the AWS Console and delete the stack. S3 buckets with existing video assets will be protected according to your deletion policy.

---

## 4. ESTIMATED AWS OPERATIONAL COSTS

All costs below are billed directly by Amazon Web Services:

| Component | AWS Resource | Estimated Rate | Typical Cost per 60s Video |
|---|---|---|---|
| **GPU Rendering** | EC2 `g4dn.xlarge` (Spot) | $0.158 / hour | ~$0.005 (runs in ~2 min) |
| **GPU Rendering** | EC2 `g4dn.xlarge` (On-Demand) | $0.526 / hour | ~$0.018 (runs in ~2 min) |
| **Video Storage** | Amazon S3 Standard | $0.023 / GB / month | ~$0.001 / month (50MB MP4) |
| **Container Registry** | Amazon ECR | $0.10 / GB / month | ~$0.30 / month (3GB image) |
| **Idle Cost** | AWS Batch (`minvCpus: 0`) | $0.00 / hour | **$0.00 / hour** |

---

## 5. SUPPORT & TROUBLESHOOTING

- **STS AssumeRole Access Denied**: Ensure the External ID in your IAM role trust policy matches the exact string shown in NovaVid.
- **GPU Quota Blocked**: Verify that your quota increase request for `L-384A81E9` was submitted in the **same region** specified in NovaVid.
- **Support Contact**: Reach out to LODHI TECHX support via the NovaVid Help Center.

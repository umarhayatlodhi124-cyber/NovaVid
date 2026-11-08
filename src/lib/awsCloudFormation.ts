// NovaVid AI Studio 2.0 — AWS CloudFormation Template Generator (BYOA Architecture)
// Enables customers and owners to deploy dedicated rendering infrastructure to their own AWS account.
// NovaVid control-plane assumes the cross-account role using AWS STS with unique External ID.

export interface CloudFormationOptions {
  tenantId: string;
  externalId: string;
  controlPlaneAccountId?: string;
  controlPlaneRoleName?: string;
  awsRegion?: string;
  stackName?: string;
  enableGpuBatch?: boolean;
  roleOnly?: boolean;
}

export const DEFAULT_CONTROL_PLANE_ACCOUNT_ID = "891377192456";
export const DEFAULT_CONTROL_PLANE_ROLE = "NovaVidControlPlaneRole";

/**
 * Generates a lean, $0.00 cost, IAM-only onboarding CloudFormation template.
 * Creates strictly the NovaVidCustomerExecutionRole and NovaVidExecutionPolicy.
 * Does not create S3 buckets, ECR repositories, Batch environments, or EC2 instances.
 */
export function generateCustomerRoleOnboardingTemplate(options: CloudFormationOptions): string {
  const controlPlaneAccountId = options.controlPlaneAccountId || DEFAULT_CONTROL_PLANE_ACCOUNT_ID;
  const cleanTenant = options.tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 20);

  return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'NovaVid AI Studio 2.0 — Customer-Owned AWS Onboarding Role & Security Policy'

Parameters:
  NovaVidControlPlaneAccountId:
    Type: String
    Default: '${controlPlaneAccountId}'
    Description: 'NovaVid central SaaS control plane AWS Account ID.'
  TenantExternalId:
    Type: String
    Default: '${options.externalId}'
    Description: 'Unique secure tenant External ID for STS AssumeRole delegation.'
  TenantIdentifier:
    Type: String
    Default: '${cleanTenant}'
    Description: 'Tenant short identifier for resource naming.'

Resources:
  # Cross-account execution role assumed by NovaVid Control Plane
  NovaVidCustomerExecutionRole:
    Type: 'AWS::IAM::Role'
    Properties:
      RoleName: !Sub 'NovaVidExecutionRole-\${TenantIdentifier}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::\${NovaVidControlPlaneAccountId}:root'
            Action: 'sts:AssumeRole'
            Condition:
              StringEquals:
                'sts:ExternalId': !Ref TenantExternalId
      Tags:
        - Key: 'ManagedBy'
          Value: 'NovaVid-AI-Studio'
        - Key: 'TenantId'
          Value: !Ref TenantIdentifier

  # Least-privilege scoped permissions for rendering, storage and telemetry
  NovaVidExecutionPolicy:
    Type: 'AWS::IAM::Policy'
    Properties:
      PolicyName: !Sub 'NovaVidExecutionPolicy-\${TenantIdentifier}'
      Roles:
        - !Ref NovaVidCustomerExecutionRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          # S3 access strictly restricted to the customer tenant buckets
          - Sid: S3CustomerMediaAccess
            Effect: Allow
            Action:
              - 's3:PutObject'
              - 's3:GetObject'
              - 's3:DeleteObject'
              - 's3:ListBucket'
              - 's3:GetBucketLocation'
            Resource:
              - !Sub 'arn:aws:s3:::novavid-\${TenantIdentifier}-*'
              - !Sub 'arn:aws:s3:::novavid-\${TenantIdentifier}-*/*'

          # CloudWatch Logs for render job execution telemetry
          - Sid: CloudWatchLogTelemetry
            Effect: Allow
            Action:
              - 'logs:CreateLogGroup'
              - 'logs:CreateLogStream'
              - 'logs:PutLogEvents'
              - 'logs:DescribeLogStreams'
            Resource:
              - !Sub 'arn:aws:logs:\${AWS::Region}:\${AWS::AccountId}:log-group:/novavid/*'

          # Read-only quota inspection for GPU instances
          - Sid: ServiceQuotasInspection
            Effect: Allow
            Action:
              - 'servicequotas:GetServiceQuota'
              - 'servicequotas:ListServiceQuotas'
            Resource: '*'

Outputs:
  RoleArn:
    Description: 'Cross-account IAM Role ARN to paste into NovaVid AI Studio'
    Value: !GetAtt NovaVidCustomerExecutionRole.Arn
    Export:
      Name: !Sub '\${AWS::StackName}-RoleArn'
`;
}

/**
 * Generates an AWS CloudFormation YAML template for customer account deployment.
 */
export function generateCloudFormationYaml(options: CloudFormationOptions): string {
  if (options.roleOnly) {
    return generateCustomerRoleOnboardingTemplate(options);
  }
  const controlPlaneAccountId = options.controlPlaneAccountId || DEFAULT_CONTROL_PLANE_ACCOUNT_ID;
  const cleanTenant = options.tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 20);

  return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'NovaVid AI Studio 2.0 — BYOA Customer Render & Storage Infrastructure'

Parameters:
  NovaVidControlPlaneAccountId:
    Type: String
    Default: '${controlPlaneAccountId}'
    Description: 'NovaVid central SaaS control plane AWS Account ID.'
  TenantExternalId:
    Type: String
    Default: '${options.externalId}'
    Description: 'Unique secure tenant External ID for STS AssumeRole delegation.'
  TenantIdentifier:
    Type: String
    Default: '${cleanTenant}'
    Description: 'Tenant short identifier for resource naming.'

Resources:
  # Isolated customer media and render bucket
  NovaVidCustomerMediaBucket:
    Type: 'AWS::S3::Bucket'
    Properties:
      BucketName: !Sub 'novavid-\${TenantIdentifier}-media-\${AWS::Region}'
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: 'AES256'
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        IgnorePublicAcls: true
        BlockPublicPolicy: true
        RestrictPublicBuckets: true
      CorsConfiguration:
        CorsRules:
          - AllowedHeaders: ['*']
            AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD']
            AllowedOrigins: ['*']
            MaxAge: 3600
      LifecycleConfiguration:
        Rules:
          - Id: ExpireScratchRendersAfter30Days
            Status: Enabled
            Prefix: renders/temp/
            ExpirationInDays: 30

  # Dedicated customer raw asset input bucket
  NovaVidCustomerInputBucket:
    Type: 'AWS::S3::Bucket'
    Properties:
      BucketName: !Sub 'novavid-\${TenantIdentifier}-input-\${AWS::Region}'
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: 'AES256'
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        IgnorePublicAcls: true
        BlockPublicPolicy: true
        RestrictPublicBuckets: true

  # Dedicated customer finished video output bucket
  NovaVidCustomerOutputBucket:
    Type: 'AWS::S3::Bucket'
    Properties:
      BucketName: !Sub 'novavid-\${TenantIdentifier}-output-\${AWS::Region}'
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: 'AES256'
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        IgnorePublicAcls: true
        BlockPublicPolicy: true
        RestrictPublicBuckets: true

  # Cross-account execution role assumed by NovaVid Control Plane
  NovaVidCustomerExecutionRole:
    Type: 'AWS::IAM::Role'
    Properties:
      RoleName: !Sub 'NovaVidExecutionRole-\${TenantIdentifier}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::\${NovaVidControlPlaneAccountId}:root'
            Action: 'sts:AssumeRole'
            Condition:
              StringEquals:
                'sts:ExternalId': !Ref TenantExternalId
      Tags:
        - Key: 'ManagedBy'
          Value: 'NovaVid-AI-Studio'
        - Key: 'TenantId'
          Value: !Ref TenantIdentifier

  # Least-privilege scoped permissions for rendering, storage and telemetry
  NovaVidExecutionPolicy:
    Type: 'AWS::IAM::Policy'
    Properties:
      PolicyName: !Sub 'NovaVidExecutionPolicy-\${TenantIdentifier}'
      Roles:
        - !Ref NovaVidCustomerExecutionRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          # S3 access strictly restricted to the customer tenant bucket
          - Sid: S3CustomerMediaAccess
            Effect: Allow
            Action:
              - 's3:PutObject'
              - 's3:GetObject'
              - 's3:DeleteObject'
              - 's3:ListBucket'
              - 's3:GetBucketLocation'
            Resource:
              - !GetAtt NovaVidCustomerMediaBucket.Arn
              - !Sub '\${NovaVidCustomerMediaBucket.Arn}/*'
              - !GetAtt NovaVidCustomerInputBucket.Arn
              - !Sub '\${NovaVidCustomerInputBucket.Arn}/*'
              - !GetAtt NovaVidCustomerOutputBucket.Arn
              - !Sub '\${NovaVidCustomerOutputBucket.Arn}/*'

          # CloudWatch Logs for render job execution telemetry
          - Sid: CloudWatchLogTelemetry
            Effect: Allow
            Action:
              - 'logs:CreateLogGroup'
              - 'logs:CreateLogStream'
              - 'logs:PutLogEvents'
              - 'logs:DescribeLogStreams'
            Resource:
              - !Sub 'arn:aws:logs:\${AWS::Region}:\${AWS::AccountId}:log-group:/novavid/*'

          # Read-only quota inspection for GPU instances
          - Sid: ServiceQuotasInspection
            Effect: Allow
            Action:
              - 'servicequotas:GetServiceQuota'
              - 'servicequotas:ListServiceQuotas'
            Resource: '*'

          # Batch and ECS dispatch for containerized headless GPU render workers
          - Sid: BatchAndEcsGPUDispatch
            Effect: Allow
            Action:
              - 'batch:SubmitJob'
              - 'batch:DescribeJobs'
              - 'batch:TerminateJob'
              - 'ecs:RunTask'
              - 'ecs:DescribeTasks'
              - 'ecs:StopTask'
            Resource: '*'
${
  options.enableGpuBatch
    ? `
  # Optional customer ECR repository for containerized GPU worker image
  NovaVidGpuWorkerEcrRepo:
    Type: 'AWS::ECR::Repository'
    Properties:
      RepositoryName: !Sub 'novavid-gpu-worker-\${TenantIdentifier}'
      ImageScanningConfiguration:
        ScanOnPush: true
      ImageTagMutability: IMMUTABLE

  # Batch Job Definition for headless GPU video composition
  NovaVidGpuJobDefinition:
    Type: 'AWS::Batch::JobDefinition'
    Properties:
      JobDefinitionName: !Sub 'novavid-render-gpu-\${TenantIdentifier}'
      Type: container
      ContainerProperties:
        Image: !Sub '\${AWS::AccountId}.dkr.ecr.\${AWS::Region}.amazonaws.com/novavid-gpu-worker-\${TenantIdentifier}:latest'
        Vcpus: 4
        Memory: 16384
        ResourceRequirements:
          - Type: GPU
            Value: '1'
        Command: ['python', '/app/cloud/gpu_server.py']
        Environment:
          - Name: S3_BUCKET_NAME
            Value: !Ref NovaVidCustomerMediaBucket
          - Name: AWS_DEFAULT_REGION
            Value: !Ref 'AWS::Region'
      Timeout:
        AttemptDurationSeconds: 600
`
    : ""
}
Outputs:
  RoleArn:
    Description: 'Cross-account IAM Role ARN to paste into NovaVid AI Studio'
    Value: !GetAtt NovaVidCustomerExecutionRole.Arn
    Export:
      Name: !Sub '\${AWS::StackName}-RoleArn'

  BucketName:
    Description: 'Customer S3 Media Bucket Name'
    Value: !Ref NovaVidCustomerMediaBucket
    Export:
      Name: !Sub '\${AWS::StackName}-BucketName'

  InputBucketName:
    Description: 'Customer S3 Raw Media Input Bucket Name'
    Value: !Ref NovaVidCustomerInputBucket
    Export:
      Name: !Sub '\${AWS::StackName}-InputBucketName'

  OutputBucketName:
    Description: 'Customer S3 Final Video Output Bucket Name'
    Value: !Ref NovaVidCustomerOutputBucket
    Export:
      Name: !Sub '\${AWS::StackName}-OutputBucketName'

  Region:
    Description: 'AWS Region of deployment'
    Value: !Ref 'AWS::Region'
${
  options.enableGpuBatch
    ? `
  EcrRepoUri:
    Description: 'ECR Repository URI for NovaVid GPU Worker container image'
    Value: !GetAtt NovaVidGpuWorkerEcrRepo.RepositoryUri
    Export:
      Name: !Sub '\${AWS::StackName}-EcrRepoUri'

  JobDefinitionArn:
    Description: 'AWS Batch GPU Job Definition ARN'
    Value: !Ref NovaVidGpuJobDefinition
    Export:
      Name: !Sub '\${AWS::StackName}-JobDefArn'
`
    : ""
}`;
}

/**
 * Generates an AWS CloudFormation JSON template for customer account deployment.
 */
export function generateCloudFormationJson(options: CloudFormationOptions): string {
  const controlPlaneAccountId = options.controlPlaneAccountId || DEFAULT_CONTROL_PLANE_ACCOUNT_ID;
  const cleanTenant = options.tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 20);

  const doc = {
    AWSTemplateFormatVersion: "2010-09-09",
    Description: "NovaVid AI Studio 2.0 — BYOA Customer Render & Storage Infrastructure",
    Parameters: {
      NovaVidControlPlaneAccountId: {
        Type: "String",
        Default: controlPlaneAccountId,
        Description: "NovaVid central SaaS control plane AWS Account ID.",
      },
      TenantExternalId: {
        Type: "String",
        Default: options.externalId,
        Description: "Unique secure tenant External ID for STS AssumeRole delegation.",
      },
      TenantIdentifier: {
        Type: "String",
        Default: cleanTenant,
        Description: "Tenant short identifier for resource naming.",
      },
    },
    Resources: {
      NovaVidCustomerMediaBucket: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: {
            "Fn::Sub": "novavid-${TenantIdentifier}-media-${AWS::Region}",
          },
          BucketEncryption: {
            ServerSideEncryptionConfiguration: [
              {
                ServerSideEncryptionByDefault: {
                  SSEAlgorithm: "AES256",
                },
              },
            ],
          },
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
            BlockPublicPolicy: true,
            RestrictPublicBuckets: true,
          },
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedHeaders: ["*"],
                AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
                AllowedOrigins: ["*"],
                MaxAge: 3600,
              },
            ],
          },
          LifecycleConfiguration: {
            Rules: [
              {
                Id: "ExpireScratchRendersAfter30Days",
                Status: "Enabled",
                Prefix: "renders/temp/",
                ExpirationInDays: 30,
              },
            ],
          },
        },
      },
      NovaVidCustomerExecutionRole: {
        Type: "AWS::IAM::Role",
        Properties: {
          RoleName: {
            "Fn::Sub": "NovaVidExecutionRole-${TenantIdentifier}",
          },
          AssumeRolePolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  AWS: {
                    "Fn::Sub": "arn:aws:iam://${NovaVidControlPlaneAccountId}:root",
                  },
                },
                Action: "sts:AssumeRole",
                Condition: {
                  StringEquals: {
                    "sts:ExternalId": { Ref: "TenantExternalId" },
                  },
                },
              },
            ],
          },
          Tags: [
            { Key: "ManagedBy", Value: "NovaVid-AI-Studio" },
            { Key: "TenantId", Value: { Ref: "TenantIdentifier" } },
          ],
        },
      },
      NovaVidExecutionPolicy: {
        Type: "AWS::IAM::Policy",
        Properties: {
          PolicyName: {
            "Fn::Sub": "NovaVidExecutionPolicy-${TenantIdentifier}",
          },
          Roles: [{ Ref: "NovaVidCustomerExecutionRole" }],
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "S3CustomerMediaAccess",
                Effect: "Allow",
                Action: [
                  "s3:PutObject",
                  "s3:GetObject",
                  "s3:DeleteObject",
                  "s3:ListBucket",
                  "s3:GetBucketLocation",
                ],
                Resource: [
                  { "Fn::GetAtt": ["NovaVidCustomerMediaBucket", "Arn"] },
                  {
                    "Fn::Sub": "${NovaVidCustomerMediaBucket.Arn}/*",
                  },
                ],
              },
              {
                Sid: "CloudWatchLogTelemetry",
                Effect: "Allow",
                Action: [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents",
                  "logs:DescribeLogStreams",
                ],
                Resource: [
                  {
                    "Fn::Sub": "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/novavid/*",
                  },
                ],
              },
              {
                Sid: "ServiceQuotasInspection",
                Effect: "Allow",
                Action: [
                  "servicequotas:GetServiceQuota",
                  "servicequotas:ListServiceQuotas",
                ],
                Resource: "*",
              },
              {
                Sid: "BatchAndEcsGPUDispatch",
                Effect: "Allow",
                Action: [
                  "batch:SubmitJob",
                  "batch:DescribeJobs",
                  "batch:TerminateJob",
                  "ecs:RunTask",
                  "ecs:DescribeTasks",
                  "ecs:StopTask",
                ],
                Resource: "*",
              },
            ],
          },
        },
      },
    },
    Outputs: {
      RoleArn: {
        Description: "Cross-account IAM Role ARN to paste into NovaVid AI Studio",
        Value: { "Fn::GetAtt": ["NovaVidCustomerExecutionRole", "Arn"] },
      },
      BucketName: {
        Description: "Customer S3 Media Bucket Name",
        Value: { Ref: "NovaVidCustomerMediaBucket" },
      },
      Region: {
        Description: "AWS Region of deployment",
        Value: { Ref: "AWS::Region" },
      },
    },
  };

  if (options.enableGpuBatch) {
    (doc.Resources as Record<string, unknown>).NovaVidGpuWorkerEcrRepo = {
      Type: "AWS::ECR::Repository",
      Properties: {
        RepositoryName: { "Fn::Sub": "novavid-gpu-worker-${TenantIdentifier}" },
        ImageScanningConfiguration: { ScanOnPush: true },
        ImageTagMutability: "IMMUTABLE",
      },
    };

    (doc.Resources as Record<string, unknown>).NovaVidGpuJobDefinition = {
      Type: "AWS::Batch::JobDefinition",
      Properties: {
        JobDefinitionName: { "Fn::Sub": "novavid-render-gpu-${TenantIdentifier}" },
        Type: "container",
        ContainerProperties: {
          Image: {
            "Fn::Sub": "${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/novavid-gpu-worker-${TenantIdentifier}:latest",
          },
          Vcpus: 4,
          Memory: 16384,
          ResourceRequirements: [{ Type: "GPU", Value: "1" }],
          Command: ["python", "/app/cloud/gpu_server.py"],
          Environment: [
            { Name: "S3_BUCKET_NAME", Value: { Ref: "NovaVidCustomerMediaBucket" } },
            { Name: "AWS_DEFAULT_REGION", Value: { Ref: "AWS::Region" } },
          ],
        },
        Timeout: { AttemptDurationSeconds: 600 },
      },
    };

    (doc.Outputs as Record<string, unknown>).EcrRepoUri = {
      Description: "ECR Repository URI for NovaVid GPU Worker container image",
      Value: { "Fn::GetAtt": ["NovaVidGpuWorkerEcrRepo", "RepositoryUri"] },
    };

    (doc.Outputs as Record<string, unknown>).JobDefinitionArn = {
      Description: "AWS Batch GPU Job Definition ARN",
      Value: { Ref: "NovaVidGpuJobDefinition" },
    };
  }

  return JSON.stringify(doc, null, 2);
}

/**
 * Builds the 1-click AWS Management Console Quick Create URL.
 */
export function buildQuickCreateStackUrl(options: CloudFormationOptions): string {
  const region = options.awsRegion || "us-east-1";
  const stackName = options.stackName || `NovaVid-Worker-${options.tenantId.slice(0, 10)}`;
  const cleanTenant = options.tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 20);
  const controlPlaneAccountId = options.controlPlaneAccountId || DEFAULT_CONTROL_PLANE_ACCOUNT_ID;

  // Encoded parameters for AWS CloudFormation QuickCreate
  const params = new URLSearchParams({
    region,
    stackName,
    param_NovaVidControlPlaneAccountId: controlPlaneAccountId,
    param_TenantExternalId: options.externalId,
    param_TenantIdentifier: cleanTenant,
  });

  return `https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/quickcreate?${params.toString()}`;
}

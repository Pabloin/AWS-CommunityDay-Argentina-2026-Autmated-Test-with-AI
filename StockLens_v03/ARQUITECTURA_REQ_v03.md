# StockLens v03 - Architecture Requirements

## Document Purpose

This file is the architecture contract for StockLens v03. It keeps the repo,
Terraform, CI/CD, backend, frontends and talk narrative aligned.

Use it to answer:

- What is v03 supposed to prove?
- Which AWS services are intentionally part of this version?
- What is excluded until a later production-hardening version?
- What must be true before the AWS Community Day Argentina demo?

## Presentation Context

**Event:** AWS Community Day Argentina 2026  
**App:** StockLens  
**Story:** moving from an AI-assisted local prototype to a serverless AWS system
with public web/mobile entry points and CI/CD.

Architecture progression:

| Version | Scope | Message |
| --- | --- | --- |
| v03 | AWS pipeline with AI-generated tests | Confidence gate before production deploys. |

## v03 Architecture Decision

StockLens v03 keeps the integrated cloud app and adds the workshop pipeline:
AWS CodePipeline orchestrates source, AI-assisted test generation, Playwright
execution and deployment.

Key decisions:

- Keep `front_web/` and `front_mobile/` inside `StockLens_v03/`.
- Host both frontends in private S3 buckets behind CloudFront.
- Use ACM in `us-east-1` for CloudFront certificates.
- Use Route53 alias records for public domains.
- Use API Gateway HTTP API for backend traffic.
- Use one Lambda Node.js 20 backend API for v03 business logic.
- Use a second Lambda Node.js 20 function as the AI test generator.
- Use Amazon Bedrock to propose Playwright tests from selected source files.
- Use CodePipeline as the primary workshop pipeline.
- Use CodeBuild for build, generated-test execution and deployment.
- Use CodeStar Connections for GitHub source integration.
- Use DynamoDB on-demand with a single-table design for core application data.
- Use S3 for photo/evidence objects.
- Use AWS-native pipeline services for the v03 workshop path.
- Keep frontend artifact upload in CodeBuild deploy, not inside Terraform.
- Keep Terraform responsible for infrastructure, IAM and DNS records.
- Store Terraform state in an S3 backend with native S3 lockfile support.
- Do not use a DynamoDB lock table for Terraform state locking in this version.
- Apply common tags through Terraform provider `default_tags`.
- Create AWS Resource Groups so the stack is visible from Resource Groups and Tag Editor.

## Repository Shape

```text
StockLens_v03/
├── ARQUITECTURA_REQ_v03.md
├── README.md
├── front_web/
│   ├── package.json
│   └── src/
├── front_mobile/
│   ├── package.json
│   └── src/
├── backend/
│   ├── package.json
│   └── functions/
│       └── api.mjs
├── ai_test_generator/
│   └── index.mjs
├── buildspec-quality.yml
├── buildspec-deploy.yml
├── terraform/
│   ├── backend.hcl.example
│   ├── versions.tf
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── .terraform.lock.hcl
├── terraform-bootstrap/
│   ├── versions.tf
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── scripts/
    ├── build-all.sh
    ├── create-demo-user.sh
    └── deploy.sh
```

Root-level CI/CD:

```text
AWS CodePipeline: Source -> AIQualityGate -> Deploy
```

## Public Domains

Requested public endpoints:

- Web/admin: `stock-v3.lens.glaciar.org`
- Mobile: `mobile-v3.lens.glaciar.org`

Terraform variables:

- `public_hosted_zone_name`
- `public_hosted_zone_id`
- `web_domain_name`
- `mobile_domain_name`
- `github_owner`
- `github_repo`
- `github_oidc_provider_arn`

Important DNS requirement:

The Route53 hosted zone must be authoritative for the records being created.
For this version, `lens.glaciar.org` already exists in the `sebas` AWS account
as hosted zone `Z05243802169NOT55L8H8`. Terraform consumes that hosted zone by
ID and does not create a duplicate public zone.

Required delegation:

- Terraform then creates `stock-v3.lens.glaciar.org` and `mobile-v3.lens.glaciar.org`
  inside the delegated Route53 zone.
- If the account already has the GitHub Actions OIDC provider, pass its ARN with
  `github_oidc_provider_arn`; Terraform still owns the StockLens deploy role and
  its policies.

## Terraform State

Terraform state for StockLens v03 must live in S3, not in a committed local
state file. Locking must use the S3 backend native lockfile mechanism, not a
DynamoDB lock table.

Backend declaration:

```hcl
terraform {
  backend "s3" {}
}
```

Expected local backend config:

```hcl
bucket       = "stocklens-terraform-state-442809140287"
key          = "stocklens/v03/terraform.tfstate"
region       = "us-east-1"
use_lockfile = true
encrypt      = true
profile      = "YOUR_AWS_PROFILE"
```

Requirements:

- Bootstrap the state bucket from `terraform-bootstrap/` before first app deploy.
- Commit `terraform/backend.hcl.example`.
- Do not commit `terraform/backend.hcl`.
- Do not commit `terraform.tfstate`, `terraform.tfstate.*` or `tfplan`.
- Do not configure `dynamodb_table` in the Terraform backend.
- Initialize with `terraform init -backend-config=backend.hcl`.

## Runtime Architecture

```text
Users
  |
  | HTTPS
  v
CloudFront distributions
  |                         \
  | OAC private access       \ OAC private access
  v                          v
S3 front_web bucket          S3 front_mobile bucket
  |
  | HTTPS API calls
  v
API Gateway HTTP API
  |
  v
Lambda API
  |\
  | v
  | DynamoDB: assets, movements, audit records
  |
  v
S3 evidence bucket: product photos and label photos
```

Pipeline AI path:

```text
GitHub repository
  |
  v
CodePipeline Source
  |
  v
CodeBuild AIQualityGate
  |
  |---- Lambda ai-test-generator
  |       |
  |       v
  |     Amazon Bedrock
  |
  |---- Generated Playwright test
  |---- npm build
  |---- Playwright chromium
  v
CodeBuild Deploy
  |---- S3 frontend sync
  |---- Lambda API update
  |---- CloudFront invalidation
```

## AWS Services

| Service | v03 Use |
| --- | --- |
| S3 | Static frontend buckets and evidence/photo bucket. |
| CloudFront | Public HTTPS delivery for web and mobile frontends. |
| ACM | TLS certificate for frontend domains. |
| Route53 | DNS validation and alias records. |
| API Gateway HTTP API | Public API entry point. |
| Lambda | Backend logic for assets and movements. |
| DynamoDB | Serverless persistence. |
| Cognito | User authentication and JWT claims. |
| IAM | Least-privilege roles for Lambda, CodeBuild, CodePipeline and optional GitHub OIDC compatibility. |
| CodePipeline | Native AWS delivery pipeline for the workshop. |
| CodeBuild | Build, AI quality gate, Playwright execution and deploy. |
| CodeStar Connections | GitHub source integration for CodePipeline. |
| Amazon Bedrock | Test generation assistant. |
| Resource Groups | Tag-based discovery for the deployed stack. |
| GitHub Actions | Not the primary v03 pipeline. |

## Tagging Requirements

Terraform must apply common tags through provider-level `default_tags`.

Required tags:

```text
Event        = aws-cday-argentina-2026
Project      = stocklens-v03
Owner        = pablo-inchausti
Environment  = demo
ManagedBy    = terraform
Repository   = repository URL
Release      = stocklens-v03
DeploymentId = default
CostCenter   = community-day-demo
```

Resources may add component-specific tags such as:

```text
App       = StockLens
Version   = v03
Component = frontend | backend | database | resource-management
Purpose   = event-cost-tracking
```

The stack must create Resource Groups for:

- Full StockLens v03 stack.
- Resources by owner.
- Resources by event/release.

The bootstrap state bucket must also use provider-level `default_tags`, with
`Environment = shared` and `Component = terraform-state`.

The Terraform outputs must include:

- `resource_group_url`
- `resource_group_by_owner_url`
- `resource_group_by_event_url`
- `tag_editor_url`

## Multi-Tenant and Users

v03 must support multiple users and be designed for multiple tenants, while
shipping with one enabled demo tenant.

Default tenant:

```text
aws-cday-argentina-2026
```

Identity model:

```text
Tenant = organization, event or customer boundary
User   = Cognito user inside one tenant
Role   = admin | operator | auditor | viewer
```

Cognito custom claims:

```text
custom:tenantId
custom:role
```

Rules:

- Lambda derives `tenantId` from Cognito JWT claims.
- Frontends must not be trusted as the source of tenant authority.
- All tenant-owned DynamoDB items include `tenantId`.
- S3 photo keys must begin with `tenants/{tenantId}/`.
- Presigned URLs are generated only for assets inside the caller tenant.

Initial v03 roles:

| Role | Allowed |
| --- | --- |
| admin | Create assets, upload photos, create movements, audit. |
| operator | Create assets, upload photos, create movements. |
| auditor | Upload audit photos, create audit movements. |
| viewer | Read-only access. |

## Backend Boundary

v03 should use one backend API, not multiple independent backends.

Current shape:

```text
backend/
├── package.json
└── functions/
    └── api.mjs
```

Reasoning:

- Keeps the demo understandable.
- Keeps deployment simple.
- Keeps IAM and API Gateway wiring small.
- Avoids premature service decomposition.
- Still allows the code to be organized internally by domain.

Suggested internal modules for the next backend iteration:

```text
backend/src/
├── assets/
├── movements/
├── photos/
├── tenants/
├── auth/
└── audit/
```

Split into multiple Lambdas only when there is a real operational reason, such
as different scaling, permissions, runtime needs or asynchronous processing.

Likely future split:

- `assets-api`: assets, lots, locations.
- `photos-api`: presigned upload/download URLs and photo metadata.
- `movements-api`: stock movements and adjustments.
- `ocr-worker`: S3/Textract processing.
- `notifications-worker`: low stock, expiration and audit alerts.

## Data Storage Decision

DynamoDB is the primary database for StockLens v03.

Use DynamoDB for:

- Tenants.
- Users and memberships.
- Roles.
- Assets.
- Lots.
- Locations.
- Movements.
- Photo metadata.
- Audit records.
- OCR jobs.
- Quotas and usage counters.

Do not store image binaries in DynamoDB. Store photos in S3 and keep only
metadata and object keys in DynamoDB.

Photo object key pattern:

```text
tenants/{tenantId}/assets/{assetId}/photos/{photoId}.jpg
```

Photo metadata item example:

```json
{
  "pk": "TENANT#aws-cday-argentina-2026#ASSET#SL-MAT-001",
  "sk": "PHOTO#2026-08-31T10:31:00Z#PHOTO123",
  "tenantId": "aws-cday-argentina-2026",
  "assetId": "SL-MAT-001",
  "photoType": "etiqueta",
  "bucket": "stocklens-v03-evidence-ACCOUNT_ID",
  "key": "tenants/aws-cday-argentina-2026/assets/SL-MAT-001/photos/PHOTO123.jpg",
  "contentType": "image/jpeg",
  "status": "uploaded"
}
```

Use another store only when a concrete access pattern requires it:

- S3/Athena for analytical reports over large history.
- OpenSearch for full-text search.
- Aurora/PostgreSQL for complex relational workflows.
- ElastiCache for hot shared cache.

These are out of scope for v03.

## DynamoDB Single-Table Model

Primary keys:

```text
pk
sk
gsi1pk
gsi1sk
```

Baseline records:

```text
Tenant:
pk = TENANT#{tenantId}
sk = METADATA

Membership:
pk = TENANT#{tenantId}
sk = USER#{userSub}

Asset:
pk = TENANT#{tenantId}
sk = ASSET#{assetId}

Asset movement:
pk = TENANT#{tenantId}#ASSET#{assetId}
sk = MOVEMENT#{timestamp}#{movementId}

Asset photo:
pk = TENANT#{tenantId}#ASSET#{assetId}
sk = PHOTO#{timestamp}#{photoId}

Tenant audit event:
pk = TENANT#{tenantId}
sk = AUDIT#{timestamp}#{eventId}
```

Every item that belongs to a tenant must include `tenantId` as an attribute.
Every API query must derive tenant scope from the authenticated user/session,
not from a caller-provided tenant ID.

## API Contract Baseline

Initial endpoints:

```text
GET  /health
GET  /assets
GET  /assets/{assetId}
POST /assets
POST /assets/{assetId}/photos/presign
POST /movements
```

Next endpoints to add:

```text
GET  /assets/{assetId}
PUT  /assets/{assetId}
POST /assets/{assetId}/photos/presign
POST /assets/{assetId}/audit
POST /assets/{assetId}/status
POST /ocr/jobs
```

## Pipeline Requirements

CodePipeline must:

- Pull source from GitHub through CodeStar Connections.
- Run `buildspec-quality.yml` in CodeBuild.
- Invoke the AI test generator Lambda from the quality gate.
- Use Amazon Bedrock to propose a Playwright test from selected source files.
- Materialize the proposed test as `front_web/tests/ai/ai.generated.spec.ts`.
- Build `front_web`, `front_mobile` and `backend`.
- Run Playwright before deployment.
- Stop the deploy stage if AI generation fails, the generated test is invalid or Playwright fails.
- Allow fallback smoke tests only when `ALLOW_AI_TEST_FALLBACK=true` is deliberately configured for local/demo rehearsal.
- Run `buildspec-deploy.yml` only after the quality gate succeeds.
- Sync `front_web/dist` to the web frontend bucket.
- Sync `front_mobile/dist` to the mobile frontend bucket.
- Update Lambda code from `backend/dist/api.zip`.
- Invalidate both CloudFront distributions.

## Security Requirements

Current v03:

- Frontend buckets are private.
- CloudFront accesses S3 through Origin Access Control.
- No long-lived AWS credentials in GitHub.
- Evidence bucket blocks public access.
- Lambda permissions are scoped to DynamoDB table and evidence bucket.

Out of scope until v04:

- Cognito authentication.
- Per-user authorization.
- WAF rules.
- CloudFront response headers policy.
- CloudWatch alarms/dashboard.
- Object lifecycle/retention policy.
- Full offline sync conflict resolution.

## Demo Readiness Checklist

- `./scripts/build-all.sh` passes.
- `terraform fmt -recursive` passes.
- `terraform validate` passes after `terraform init`.
- `terraform-bootstrap/` is applied once to create the S3 state bucket.
- `terraform/backend.hcl` points to the S3 backend with `use_lockfile = true`.
- Route53 hosted zone matches the chosen public domains.
- GitHub OIDC role ARN is configured in repository secrets.
- Frontend bucket names and Lambda function name are configured in repository variables.
- No `.env`, AWS credentials, Terraform local state or build artifacts are committed.

## Frontend Integration Status

Before the first cloud deploy, the v03 frontends must receive these runtime
values through `.env` locally and GitHub/environment configuration in CI:

```text
VITE_STOCKLENS_API_BASE_URL
VITE_STOCKLENS_COGNITO_USER_POOL_ID
VITE_STOCKLENS_COGNITO_CLIENT_ID
VITE_STOCKLENS_DEFAULT_TENANT_ID
```

The current v03 backend and Terraform are ready for authenticated API calls.
The existing frontends still contain the local prototype workflows and should be
wired to Cognito/API calls in the next implementation step.

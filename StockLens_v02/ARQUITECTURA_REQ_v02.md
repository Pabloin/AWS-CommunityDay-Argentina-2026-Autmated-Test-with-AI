# StockLens v02 - Architecture Requirements

## Document Purpose

This file is the architecture contract for StockLens v02. It keeps the repo,
Terraform, CI/CD, backend, frontends and talk narrative aligned.

Use it to answer:

- What is v02 supposed to prove?
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
| v01 | Local StockLens admin app | AI can quickly create a usable prototype. |
| v02 | Web + mobile + backend + DynamoDB + public domains + CI/CD OIDC | The prototype becomes a cloud application. |
| v03 | Production hardening | Add stronger auth, observability, offline sync, WAF and cost controls. |

## v02 Architecture Decision

StockLens v02 is the first integrated cloud version. It contains both user
experiences and the initial AWS backend.

Key decisions:

- Keep `front_web/` and `front_mobile/` inside `StockLens_v02/`.
- Host both frontends in private S3 buckets behind CloudFront.
- Use ACM in `us-east-1` for CloudFront certificates.
- Use Route53 alias records for public domains.
- Use API Gateway HTTP API for backend traffic.
- Use one Lambda Node.js 20 backend API for v02 business logic.
- Use DynamoDB on-demand with a single-table design for core application data.
- Use S3 for photo/evidence objects.
- Use GitHub Actions with OIDC; do not store long-lived AWS access keys.
- Keep frontend artifact upload in CI/CD, not inside Terraform.
- Keep Terraform responsible for infrastructure, IAM and DNS records.
- Store Terraform state in an S3 backend with native S3 lockfile support.
- Do not use a DynamoDB lock table for Terraform state locking in this version.
- Apply common tags through Terraform provider `default_tags`.
- Create AWS Resource Groups so the stack is visible from Resource Groups and Tag Editor.

## Repository Shape

```text
StockLens_v02/
├── ARQUITECTURA_REQ_v02.md
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
.github/workflows/stocklens-v02.yml
```

## Public Domains

Requested public endpoints:

- Web/admin: `stock.lens.glaciar.org`
- Mobile: `mobile.lens.glaciar.org`

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

- Terraform then creates `stock.lens.glaciar.org` and `mobile.lens.glaciar.org`
  inside the delegated Route53 zone.
- If the account already has the GitHub Actions OIDC provider, pass its ARN with
  `github_oidc_provider_arn`; Terraform still owns the StockLens deploy role and
  its policies.

## Terraform State

Terraform state for StockLens v02 must live in S3, not in a committed local
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
bucket       = "stocklens-terraform-state-YOUR_ACCOUNT_ID"
key          = "stocklens/v02/terraform.tfstate"
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

Future AI path:

```text
S3 evidence upload
  |
  v
Lambda processing
  |------ Textract: OCR from labels
  |------ Bedrock: suggested category, name, expiration, status
```

## AWS Services

| Service | v02 Use |
| --- | --- |
| S3 | Static frontend buckets and evidence/photo bucket. |
| CloudFront | Public HTTPS delivery for web and mobile frontends. |
| ACM | TLS certificate for frontend domains. |
| Route53 | DNS validation and alias records. |
| API Gateway HTTP API | Public API entry point. |
| Lambda | Backend logic for assets and movements. |
| DynamoDB | Serverless persistence. |
| Cognito | User authentication and JWT claims. |
| IAM | Least-privilege Lambda role and GitHub Actions OIDC role. |
| Resource Groups | Tag-based discovery for the deployed stack. |
| GitHub Actions | Build and deployment automation. |

## Tagging Requirements

Terraform must apply common tags through provider-level `default_tags`.

Required tags:

```text
Event        = aws-cday-argentina-2026
Project      = stocklens-v02
Owner        = pablo-inchausti
Environment  = demo
ManagedBy    = terraform
Repository   = repository URL
Release      = stocklens-v02
DeploymentId = default
CostCenter   = community-day-demo
```

Resources may add component-specific tags such as:

```text
App       = StockLens
Version   = v02
Component = frontend | backend | database | resource-management
Purpose   = event-cost-tracking
```

The stack must create Resource Groups for:

- Full StockLens v02 stack.
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

v02 must support multiple users and be designed for multiple tenants, while
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

Initial v02 roles:

| Role | Allowed |
| --- | --- |
| admin | Create assets, upload photos, create movements, audit. |
| operator | Create assets, upload photos, create movements. |
| auditor | Upload audit photos, create audit movements. |
| viewer | Read-only access. |

## Backend Boundary

v02 should use one backend API, not multiple independent backends.

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

DynamoDB is the primary database for StockLens v02.

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
  "bucket": "stocklens-v02-evidence-ACCOUNT_ID",
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

These are out of scope for v02.

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

## CI/CD Requirements

GitHub Actions must:

- Run builds for `front_web` and `front_mobile`.
- Validate/package `backend/functions/api.mjs`.
- Assume AWS role through OIDC.
- Sync `front_web/dist` to the web frontend bucket.
- Sync `front_mobile/dist` to the mobile frontend bucket.
- Update Lambda code from `backend/dist/api.zip`.

GitHub configuration:

Secrets:

- `AWS_REGION`
- `AWS_ROLE_TO_ASSUME`

Variables:

- `STOCKLENS_FRONT_WEB_BUCKET`
- `STOCKLENS_FRONT_MOBILE_BUCKET`
- `STOCKLENS_API_FUNCTION`
- `STOCKLENS_FRONT_WEB_DISTRIBUTION_ID`
- `STOCKLENS_FRONT_MOBILE_DISTRIBUTION_ID`

## Security Requirements

Current v02:

- Frontend buckets are private.
- CloudFront accesses S3 through Origin Access Control.
- No long-lived AWS credentials in GitHub.
- Evidence bucket blocks public access.
- Lambda permissions are scoped to DynamoDB table and evidence bucket.

Out of scope until v03:

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

Before the first cloud deploy, the v02 frontends must receive these runtime
values through `.env` locally and GitHub/environment configuration in CI:

```text
VITE_STOCKLENS_API_BASE_URL
VITE_STOCKLENS_COGNITO_USER_POOL_ID
VITE_STOCKLENS_COGNITO_CLIENT_ID
VITE_STOCKLENS_DEFAULT_TENANT_ID
```

The current v02 backend and Terraform are ready for authenticated API calls.
The existing frontends still contain the local prototype workflows and should be
wired to Cognito/API calls in the next implementation step.

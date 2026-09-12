variable "aws_region" {
  description = "AWS region for StockLens v05."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Resource name prefix."
  type        = string
  default     = "stocklens-v05"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "demo"
}

variable "owner" {
  description = "Owner tag for all resources."
  type        = string
  default     = "pablo-inchausti"
}

variable "event_name" {
  description = "Event tag for all resources."
  type        = string
  default     = "aws-cday-argentina-2026"
}

variable "repository_url" {
  description = "Repository URL tag for all resources."
  type        = string
  default     = "https://github.com/OWNER/REPO"
}

variable "deployment_id" {
  description = "Deployment identifier tag."
  type        = string
  default     = "v5"
}

variable "cost_center" {
  description = "Cost center tag."
  type        = string
  default     = "community-day-demo"
}

variable "default_tenant_id" {
  description = "Tenant tag for StockLens v05."
  type        = string
  default     = "aws-cday-argentina-2026-v5"
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name allowed to assume the deploy roles."
  type        = string
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN. Leave empty to create it in this stack."
  type        = string
  default     = ""
}

variable "public_hosted_zone_name" {
  description = "Route53 public hosted zone that is authoritative for the frontend domain."
  type        = string
  default     = "lens.glaciar.org"
}

variable "public_hosted_zone_id" {
  description = "Existing Route53 public hosted zone ID for lens.glaciar.org."
  type        = string
  default     = "Z05243802169NOT55L8H8"
}

variable "mobile_domain_name" {
  description = "Public DNS name for the StockLens v05 mobile app."
  type        = string
  default     = "mobile-v5.lens.glaciar.org"
}

variable "mobile_domain_aliases" {
  description = "Additional DNS names served by the StockLens v05 mobile distribution."
  type        = list(string)
  default     = []
}

variable "admin_domain_name" {
  description = "Public DNS name for the StockLens v05 web app."
  type        = string
  default     = "web-v5.lens.glaciar.org"
}

variable "admin_domain_aliases" {
  description = "Additional DNS names served by the StockLens v05 web distribution."
  type        = list(string)
  default     = []
}

variable "home_domain_name" {
  description = "Optional standalone domain for the StockLens demo landing page."
  type        = string
  default     = ""
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock vision-capable model used to suggest item metadata from photos."
  type        = string
  default     = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
}

variable "lambda_package_path" {
  description = "Absolute path to the packaged Lambda ZIP."
  type        = string
}

variable "create_storage_buckets" {
  description = "Create S3 buckets or reuse existing shared buckets."
  type        = bool
  default     = true
}

variable "front_mobile_bucket_name" {
  description = "Existing mobile bucket name when create_storage_buckets is false."
  type        = string
  default     = ""
}

variable "front_admin_bucket_name" {
  description = "Existing web bucket name when create_storage_buckets is false."
  type        = string
  default     = ""
}

variable "photos_bucket_name" {
  description = "Existing photos bucket name when create_storage_buckets is false."
  type        = string
  default     = ""
}

variable "frontend_object_prefix" {
  description = "Optional prefix used to isolate frontend objects in shared buckets."
  type        = string
  default     = ""
}

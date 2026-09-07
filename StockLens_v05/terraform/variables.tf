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


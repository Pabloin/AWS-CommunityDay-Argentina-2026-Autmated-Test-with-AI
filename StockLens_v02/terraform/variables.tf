variable "aws_region" {
  description = "AWS region for StockLens v02."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Resource name prefix."
  type        = string
  default     = "stocklens-v02"
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
  default     = "default"
}

variable "cost_center" {
  description = "Cost center tag."
  type        = string
  default     = "community-day-demo"
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name allowed to assume the deploy role."
  type        = string
}

variable "public_hosted_zone_name" {
  description = "Route53 public hosted zone that is authoritative for the frontend domains."
  type        = string
  default     = "lens.glaciar.org"
}

variable "public_hosted_zone_id" {
  description = "Existing Route53 public hosted zone ID for lens.glaciar.org."
  type        = string
  default     = "Z05243802169NOT55L8H8"
}

variable "web_domain_name" {
  description = "Public DNS name for the StockLens web/admin frontend."
  type        = string
  default     = "stock.lens.glaciar.org"
}

variable "mobile_domain_name" {
  description = "Public DNS name for the StockLens mobile frontend."
  type        = string
  default     = "mobile.lens.glaciar.org"
}

variable "default_tenant_id" {
  description = "Initial tenant enabled for the demo."
  type        = string
  default     = "aws-cday-argentina-2026"
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN. Leave empty to create it in this stack."
  type        = string
  default     = ""
}

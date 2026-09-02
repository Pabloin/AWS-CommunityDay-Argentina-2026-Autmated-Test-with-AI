variable "aws_region" {
  description = "AWS region for StockLens v03."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Resource name prefix."
  type        = string
  default     = "stocklens-v03"
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
  default     = "stock-v3.lens.glaciar.org"
}

variable "mobile_domain_name" {
  description = "Public DNS name for the StockLens mobile frontend."
  type        = string
  default     = "mobile-v3.lens.glaciar.org"
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

variable "pipeline_branch_name" {
  description = "Git branch that triggers the AWS CodePipeline v3 quality gate."
  type        = string
  default     = "main"
}

variable "codestar_connection_arn" {
  description = "AWS CodeStar Connections ARN linked to the GitHub account/repository."
  type        = string
  default     = ""
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock model used by the AI test generator Lambda."
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

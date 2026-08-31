variable "aws_region" {
  description = "AWS region for the Terraform state bucket."
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "S3 bucket name for Terraform remote state."
  type        = string
}

variable "project_name" {
  description = "Resource tag project name."
  type        = string
  default     = "stocklens-v02"
}

variable "owner" {
  description = "Owner tag for the Terraform state bucket."
  type        = string
  default     = "pablo-inchausti"
}

variable "event_name" {
  description = "Event tag for the Terraform state bucket."
  type        = string
  default     = "aws-cday-argentina-2026"
}

variable "repository_url" {
  description = "Repository URL tag for the Terraform state bucket."
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

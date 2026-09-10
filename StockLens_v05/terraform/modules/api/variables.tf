variable "aws_region" {
  type = string
}

variable "account_id" {
  type = string
}

variable "project_name" {
  type = string
}

variable "default_tenant_id" {
  type = string
}

variable "bedrock_model_id" {
  type = string
}

variable "lambda_package_path" {
  type = string
}

variable "mobile_domain_name" {
  type = string
}

variable "admin_domain_name" {
  type = string
}

variable "items_table_name" {
  type = string
}

variable "items_table_arn" {
  type = string
}

variable "photos_bucket_name" {
  type = string
}

variable "photos_bucket_arn" {
  type = string
}

variable "tags" {
  type = map(string)
}

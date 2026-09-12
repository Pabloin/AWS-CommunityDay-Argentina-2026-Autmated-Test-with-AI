variable "project_name" {
  type = string
}

variable "github_owner" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "github_oidc_provider_arn" {
  type = string
}

variable "front_mobile_bucket_arn" {
  type = string
}

variable "front_admin_bucket_arn" {
  type = string
}

variable "mobile_objects_arn" {
  type = string
}

variable "admin_objects_arn" {
  type = string
}

variable "front_mobile_distribution_arn" {
  type = string
}

variable "front_admin_distribution_arn" {
  type = string
}

variable "front_home_distribution_arn" {
  type     = string
  default  = null
  nullable = true
}

variable "api_function_arn" {
  type = string
}

variable "tags" {
  type = map(string)
}

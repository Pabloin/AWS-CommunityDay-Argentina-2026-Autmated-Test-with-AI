variable "account_id" {
  type = string
}

variable "project_name" {
  type = string
}

variable "mobile_domain_name" {
  type = string
}

variable "mobile_domain_aliases" {
  type    = list(string)
  default = []
}

variable "admin_domain_name" {
  type = string
}

variable "admin_domain_aliases" {
  type    = list(string)
  default = []
}

variable "public_hosted_zone_name" {
  type = string
}

variable "public_hosted_zone_id" {
  type = string
}

variable "create_storage_buckets" {
  type = bool
}

variable "front_mobile_bucket_name" {
  type = string
}

variable "front_admin_bucket_name" {
  type = string
}

variable "frontend_object_prefix" {
  type = string
}

variable "tags" {
  type = map(string)
}

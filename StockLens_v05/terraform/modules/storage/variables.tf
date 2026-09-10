variable "project_name" {
  type = string
}

variable "account_id" {
  type = string
}

variable "create_storage_buckets" {
  type = bool
}

variable "photos_bucket_name" {
  type = string
}

variable "tags" {
  type = map(string)
}

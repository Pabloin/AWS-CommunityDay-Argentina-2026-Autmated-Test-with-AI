variable "github_owner" {
  description = "GitHub owner allowed by OIDC."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository allowed by OIDC."
  type        = string
}

variable "repository_url" {
  description = "Repository URL stored in resource tags."
  type        = string
}

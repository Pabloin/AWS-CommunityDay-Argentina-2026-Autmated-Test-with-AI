provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Event        = var.event_name
      Project      = var.project_name
      Owner        = var.owner
      Environment  = "shared"
      ManagedBy    = "terraform"
      Repository   = var.repository_url
      Release      = "stocklens-v03"
      DeploymentId = var.deployment_id
      CostCenter   = var.cost_center
    }
  }
}

locals {
  tags = {
    App       = "StockLens"
    Version   = "v03"
    Component = "terraform-state"
    Purpose   = "remote-state-bootstrap"
  }
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name
  tags   = local.tags
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

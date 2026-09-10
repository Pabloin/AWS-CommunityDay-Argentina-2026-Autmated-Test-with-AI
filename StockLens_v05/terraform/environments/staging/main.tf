provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = local.default_tags
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.default_tags
  }
}

locals {
  project_name      = "stocklens-v05-staging"
  environment       = "staging"
  default_tenant_id = "aws-cday-argentina-2026-v5-staging"
  default_tags = {
    Event        = "aws-cday-argentina-2026"
    Project      = local.project_name
    Owner        = "pablo-inchausti"
    Environment  = local.environment
    ManagedBy    = "terraform"
    Repository   = var.repository_url
    Release      = "stocklens-v05"
    Tenant       = local.default_tenant_id
    DeploymentId = "v5-staging"
    CostCenter   = "community-day-demo"
  }
}

module "stocklens" {
  source = "../../modules/stocklens"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  aws_region               = "us-east-1"
  project_name             = local.project_name
  environment              = local.environment
  owner                    = "pablo-inchausti"
  event_name               = "aws-cday-argentina-2026"
  repository_url           = var.repository_url
  deployment_id            = "v5-staging"
  cost_center              = "community-day-demo"
  default_tenant_id        = local.default_tenant_id
  github_owner             = var.github_owner
  github_repo              = var.github_repo
  github_oidc_provider_arn = "arn:aws:iam::442809140287:oidc-provider/token.actions.githubusercontent.com"
  public_hosted_zone_name  = "lens.glaciar.org"
  public_hosted_zone_id    = "Z05243802169NOT55L8H8"
  mobile_domain_name       = "mobile-staging-v5.lens.glaciar.org"
  admin_domain_name        = "web-staging-v5.lens.glaciar.org"
  bedrock_model_id         = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
  lambda_package_path      = abspath("${path.root}/../../../backend/dist/api.zip")
  create_storage_buckets   = false
  front_mobile_bucket_name = "stocklens-v05-front-mobile-442809140287"
  front_admin_bucket_name  = "stocklens-v05-front-admin-442809140287"
  photos_bucket_name       = "stocklens-v05-photos-442809140287"
  frontend_object_prefix   = "staging"
}

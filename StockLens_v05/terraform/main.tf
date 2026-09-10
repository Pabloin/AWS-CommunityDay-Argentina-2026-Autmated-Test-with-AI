provider "aws" {
  region = var.aws_region

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
  default_tags = {
    Event        = var.event_name
    Project      = var.project_name
    Owner        = var.owner
    Environment  = var.environment
    ManagedBy    = "terraform"
    Repository   = var.repository_url
    Release      = "stocklens-v05"
    Tenant       = var.default_tenant_id
    DeploymentId = var.deployment_id
    CostCenter   = var.cost_center
  }
}

module "stocklens" {
  source = "./modules/stocklens"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  aws_region               = var.aws_region
  project_name             = var.project_name
  environment              = var.environment
  owner                    = var.owner
  event_name               = var.event_name
  repository_url           = var.repository_url
  deployment_id            = var.deployment_id
  cost_center              = var.cost_center
  default_tenant_id        = var.default_tenant_id
  github_owner             = var.github_owner
  github_repo              = var.github_repo
  github_oidc_provider_arn = var.github_oidc_provider_arn
  public_hosted_zone_name  = var.public_hosted_zone_name
  public_hosted_zone_id    = var.public_hosted_zone_id
  mobile_domain_name       = var.mobile_domain_name
  admin_domain_name        = var.admin_domain_name
  bedrock_model_id         = var.bedrock_model_id
  lambda_package_path      = abspath("${path.root}/../backend/dist/api.zip")
}

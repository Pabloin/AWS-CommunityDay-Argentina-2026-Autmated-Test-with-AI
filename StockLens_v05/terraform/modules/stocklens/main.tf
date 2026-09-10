data "aws_caller_identity" "current" {}

locals {
  tags = {
    App       = "StockLens"
    Version   = "v05"
    Component = "frontend"
    Purpose   = "home-catalog-mobile"
  }
}

module "storage" {
  source = "../storage"

  project_name           = var.project_name
  account_id             = data.aws_caller_identity.current.account_id
  create_storage_buckets = var.create_storage_buckets
  photos_bucket_name     = var.photos_bucket_name
  tags                   = local.tags
}

module "apps" {
  source = "../apps"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  account_id               = data.aws_caller_identity.current.account_id
  project_name             = var.project_name
  mobile_domain_name       = var.mobile_domain_name
  mobile_domain_aliases    = var.mobile_domain_aliases
  admin_domain_name        = var.admin_domain_name
  admin_domain_aliases     = var.admin_domain_aliases
  public_hosted_zone_name  = var.public_hosted_zone_name
  public_hosted_zone_id    = var.public_hosted_zone_id
  create_storage_buckets   = var.create_storage_buckets
  front_mobile_bucket_name = var.front_mobile_bucket_name
  front_admin_bucket_name  = var.front_admin_bucket_name
  frontend_object_prefix   = var.frontend_object_prefix
  tags                     = local.tags
}

module "api" {
  source = "../api"

  aws_region            = var.aws_region
  account_id            = data.aws_caller_identity.current.account_id
  project_name          = var.project_name
  default_tenant_id     = var.default_tenant_id
  bedrock_model_id      = var.bedrock_model_id
  lambda_package_path   = var.lambda_package_path
  mobile_domain_name    = var.mobile_domain_name
  mobile_domain_aliases = var.mobile_domain_aliases
  admin_domain_name     = var.admin_domain_name
  admin_domain_aliases  = var.admin_domain_aliases
  items_table_name      = module.storage.items_table_name
  items_table_arn       = module.storage.items_table_arn
  photos_bucket_name    = module.storage.photos_bucket_name
  photos_bucket_arn     = module.storage.photos_bucket_arn
  tags                  = local.tags
}

module "cicd" {
  source = "../cicd"

  project_name                  = var.project_name
  github_owner                  = var.github_owner
  github_repo                   = var.github_repo
  github_oidc_provider_arn      = var.github_oidc_provider_arn
  front_mobile_bucket_arn       = module.apps.front_mobile_bucket_arn
  front_admin_bucket_arn        = module.apps.front_admin_bucket_arn
  mobile_objects_arn            = module.apps.mobile_objects_arn
  admin_objects_arn             = module.apps.admin_objects_arn
  front_mobile_distribution_arn = module.apps.front_mobile_distribution_arn
  front_admin_distribution_arn  = module.apps.front_admin_distribution_arn
  api_function_arn              = module.api.function_arn
  tags                          = local.tags
}

resource "aws_resourcegroups_group" "stocklens_stack" {
  name        = "${var.project_name}-${var.environment}"
  description = "StockLens v05 resources for AWS Community Day Argentina 2026"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        { Key = "Event", Values = [var.event_name] },
        { Key = "Project", Values = [var.project_name] },
        { Key = "Environment", Values = [var.environment] },
        { Key = "Release", Values = ["stocklens-v05"] },
        { Key = "Tenant", Values = [var.default_tenant_id] }
      ]
    })
  }

  tags = merge(local.tags, {
    Component = "resource-management"
    Purpose   = "group-stocklens-v05-stack"
  })
}

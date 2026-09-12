output "mobile_url" {
  value = module.apps.mobile_url
}

output "admin_url" {
  value = module.apps.admin_url
}

output "home_url" {
  value = module.apps.home_url
}

output "front_mobile_bucket" {
  value = module.apps.front_mobile_bucket
}

output "front_admin_bucket" {
  value = module.apps.front_admin_bucket
}

output "front_mobile_cloudfront_domain" {
  value = module.apps.front_mobile_cloudfront_domain
}

output "front_admin_cloudfront_domain" {
  value = module.apps.front_admin_cloudfront_domain
}

output "front_mobile_distribution_id" {
  value = module.apps.front_mobile_distribution_id
}

output "front_admin_distribution_id" {
  value = module.apps.front_admin_distribution_id
}

output "front_home_distribution_id" {
  value = module.apps.front_home_distribution_id
}

output "items_table" {
  value = module.storage.items_table_name
}

output "photos_bucket" {
  value = module.storage.photos_bucket_name
}

output "api_endpoint" {
  value = module.api.endpoint
}

output "api_function_name" {
  value = module.api.function_name
}

output "github_actions_app_role_arn" {
  value = module.cicd.app_role_arn
}

output "github_actions_infra_role_arn" {
  value = module.cicd.infra_role_arn
}

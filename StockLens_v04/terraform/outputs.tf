output "api_endpoint" {
  description = "HTTP API endpoint."
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool app client ID for web/mobile apps."
  value       = aws_cognito_user_pool_client.web.id
}

output "web_url" {
  description = "Public HTTPS URL for the web/admin frontend."
  value       = "https://${var.web_domain_name}"
}

output "public_hosted_zone_id" {
  description = "Route53 hosted zone ID for lens.glaciar.org."
  value       = data.aws_route53_zone.public.zone_id
}

output "public_hosted_zone_name_servers" {
  description = "Name servers delegated from the parent DNS zone."
  value       = data.aws_route53_zone.public.name_servers
}

output "mobile_url" {
  description = "Public HTTPS URL for the mobile frontend."
  value       = "https://${var.mobile_domain_name}"
}

output "front_web_cloudfront_domain" {
  description = "CloudFront domain for the web/admin frontend."
  value       = aws_cloudfront_distribution.front_web.domain_name
}

output "front_mobile_cloudfront_domain" {
  description = "CloudFront domain for the mobile frontend."
  value       = aws_cloudfront_distribution.front_mobile.domain_name
}

output "front_web_bucket" {
  description = "S3 bucket for the web/admin frontend."
  value       = aws_s3_bucket.front_web.bucket
}

output "front_mobile_bucket" {
  description = "S3 bucket for the mobile frontend."
  value       = aws_s3_bucket.front_mobile.bucket
}

output "evidence_bucket" {
  description = "S3 bucket for asset photos and labels."
  value       = aws_s3_bucket.evidence.bucket
}

output "playwright_evidence_bucket" {
  description = "S3 bucket for Playwright videos, traces and HTML reports."
  value       = aws_s3_bucket.playwright_evidence.bucket
}

output "github_actions_app_role_arn" {
  description = "Role ARN for the StockLens v04 GitHub Actions application deployment workflow."
  value       = aws_iam_role.github_actions.arn
}

output "github_actions_infra_role_arn" {
  description = "Role ARN for the StockLens v04 GitHub Actions Terraform workflow."
  value       = aws_iam_role.github_actions_infra.arn
}

output "api_function_name" {
  description = "Lambda function name to configure as STOCKLENS_API_FUNCTION in GitHub Actions."
  value       = aws_lambda_function.api.function_name
}

output "front_web_distribution_id" {
  description = "CloudFront distribution ID for the web/admin frontend."
  value       = aws_cloudfront_distribution.front_web.id
}

output "front_mobile_distribution_id" {
  description = "CloudFront distribution ID for the mobile frontend."
  value       = aws_cloudfront_distribution.front_mobile.id
}

output "resource_group_name" {
  description = "Main Resource Group name for the StockLens v04 stack."
  value       = aws_resourcegroups_group.stocklens_stack.name
}

output "resource_group_url" {
  description = "AWS Console URL for the StockLens v04 Resource Group."
  value       = "https://console.aws.amazon.com/resource-groups/group/${aws_resourcegroups_group.stocklens_stack.name}"
}

output "resource_group_by_owner_url" {
  description = "AWS Console URL for owner-filtered resources."
  value       = "https://console.aws.amazon.com/resource-groups/group/${aws_resourcegroups_group.by_owner.name}"
}

output "resource_group_by_event_url" {
  description = "AWS Console URL for event-filtered resources."
  value       = "https://console.aws.amazon.com/resource-groups/group/${aws_resourcegroups_group.by_event.name}"
}

output "tag_editor_url" {
  description = "AWS Tag Editor URL."
  value       = "https://console.aws.amazon.com/resource-groups/tag-editor"
}

output "ai_test_generator_function_name" {
  description = "Lambda function that asks Bedrock for Playwright tests."
  value       = aws_lambda_function.ai_test_generator.function_name
}

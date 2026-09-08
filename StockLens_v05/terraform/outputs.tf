output "mobile_url" {
  description = "Public HTTPS URL for the StockLens v05 mobile app."
  value       = "https://${var.mobile_domain_name}"
}

output "admin_url" {
  description = "Public HTTPS URL for the StockLens v05 admin app."
  value       = "https://${var.admin_domain_name}"
}

output "front_mobile_bucket" {
  description = "S3 bucket for the StockLens v05 mobile app."
  value       = aws_s3_bucket.front_mobile.bucket
}

output "front_admin_bucket" {
  description = "S3 bucket for the StockLens v05 admin app."
  value       = aws_s3_bucket.front_admin.bucket
}

output "front_mobile_cloudfront_domain" {
  description = "CloudFront domain for the StockLens v05 mobile app."
  value       = aws_cloudfront_distribution.front_mobile.domain_name
}

output "front_admin_cloudfront_domain" {
  description = "CloudFront domain for the StockLens v05 admin app."
  value       = aws_cloudfront_distribution.front_admin.domain_name
}

output "front_mobile_distribution_id" {
  description = "CloudFront distribution ID for the StockLens v05 mobile app."
  value       = aws_cloudfront_distribution.front_mobile.id
}

output "front_admin_distribution_id" {
  description = "CloudFront distribution ID for the StockLens v05 admin app."
  value       = aws_cloudfront_distribution.front_admin.id
}

output "items_table" {
  description = "DynamoDB table for StockLens v05 catalog items."
  value       = aws_dynamodb_table.items.name
}

output "photos_bucket" {
  description = "S3 bucket for StockLens v05 catalog photos."
  value       = aws_s3_bucket.photos.bucket
}

output "api_endpoint" {
  description = "HTTP API endpoint for image analysis and catalog persistence."
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "api_function_name" {
  description = "Lambda function name for image analysis and catalog persistence."
  value       = aws_lambda_function.api.function_name
}

output "github_actions_app_role_arn" {
  description = "Role ARN for STOCKLENS_V05_APP_ROLE_ARN."
  value       = aws_iam_role.github_actions_app.arn
}

output "github_actions_infra_role_arn" {
  description = "Role ARN for STOCKLENS_V05_INFRA_ROLE_ARN after bootstrap."
  value       = aws_iam_role.github_actions_infra.arn
}

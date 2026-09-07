output "mobile_url" {
  description = "Public HTTPS URL for the StockLens v05 mobile app."
  value       = "https://${var.mobile_domain_name}"
}

output "front_mobile_bucket" {
  description = "S3 bucket for the StockLens v05 mobile app."
  value       = aws_s3_bucket.front_mobile.bucket
}

output "front_mobile_cloudfront_domain" {
  description = "CloudFront domain for the StockLens v05 mobile app."
  value       = aws_cloudfront_distribution.front_mobile.domain_name
}

output "front_mobile_distribution_id" {
  description = "CloudFront distribution ID for the StockLens v05 mobile app."
  value       = aws_cloudfront_distribution.front_mobile.id
}

output "github_actions_app_role_arn" {
  description = "Role ARN for STOCKLENS_V05_APP_ROLE_ARN."
  value       = aws_iam_role.github_actions_app.arn
}

output "github_actions_infra_role_arn" {
  description = "Role ARN for STOCKLENS_V05_INFRA_ROLE_ARN after bootstrap."
  value       = aws_iam_role.github_actions_infra.arn
}


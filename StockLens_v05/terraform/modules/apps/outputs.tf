output "mobile_url" {
  value = "https://${var.mobile_domain_name}"
}

output "admin_url" {
  value = "https://${var.admin_domain_name}"
}

output "front_mobile_bucket" {
  value = local.front_mobile_bucket
}

output "front_admin_bucket" {
  value = local.front_admin_bucket
}

output "front_mobile_bucket_arn" {
  value = local.front_mobile_bucket_arn
}

output "front_admin_bucket_arn" {
  value = local.front_admin_bucket_arn
}

output "mobile_objects_arn" {
  value = local.mobile_objects_arn
}

output "admin_objects_arn" {
  value = local.admin_objects_arn
}

output "front_mobile_cloudfront_domain" {
  value = aws_cloudfront_distribution.front_mobile.domain_name
}

output "front_admin_cloudfront_domain" {
  value = aws_cloudfront_distribution.front_admin.domain_name
}

output "front_mobile_distribution_id" {
  value = aws_cloudfront_distribution.front_mobile.id
}

output "front_admin_distribution_id" {
  value = aws_cloudfront_distribution.front_admin.id
}

output "front_mobile_distribution_arn" {
  value = aws_cloudfront_distribution.front_mobile.arn
}

output "front_admin_distribution_arn" {
  value = aws_cloudfront_distribution.front_admin.arn
}

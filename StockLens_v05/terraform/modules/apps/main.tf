locals {
  mobile_origin_id        = "${var.project_name}-mobile-origin"
  admin_origin_id         = "${var.project_name}-admin-origin"
  normalized_prefix       = trim(var.frontend_object_prefix, "/")
  mobile_origin_path      = local.normalized_prefix == "" ? null : "/${local.normalized_prefix}/mobile"
  admin_origin_path       = local.normalized_prefix == "" ? null : "/${local.normalized_prefix}/web"
  front_mobile_bucket     = var.create_storage_buckets ? aws_s3_bucket.front_mobile[0].bucket : data.aws_s3_bucket.front_mobile[0].bucket
  front_admin_bucket      = var.create_storage_buckets ? aws_s3_bucket.front_admin[0].bucket : data.aws_s3_bucket.front_admin[0].bucket
  front_mobile_bucket_arn = var.create_storage_buckets ? aws_s3_bucket.front_mobile[0].arn : data.aws_s3_bucket.front_mobile[0].arn
  front_admin_bucket_arn  = var.create_storage_buckets ? aws_s3_bucket.front_admin[0].arn : data.aws_s3_bucket.front_admin[0].arn
  mobile_origin_domain    = var.create_storage_buckets ? aws_s3_bucket.front_mobile[0].bucket_regional_domain_name : data.aws_s3_bucket.front_mobile[0].bucket_regional_domain_name
  admin_origin_domain     = var.create_storage_buckets ? aws_s3_bucket.front_admin[0].bucket_regional_domain_name : data.aws_s3_bucket.front_admin[0].bucket_regional_domain_name
  mobile_objects_arn      = local.normalized_prefix == "" ? "${local.front_mobile_bucket_arn}/*" : "${local.front_mobile_bucket_arn}/${local.normalized_prefix}/mobile/*"
  admin_objects_arn       = local.normalized_prefix == "" ? "${local.front_admin_bucket_arn}/*" : "${local.front_admin_bucket_arn}/${local.normalized_prefix}/web/*"
}

data "aws_route53_zone" "public" {
  zone_id      = var.public_hosted_zone_id
  name         = "${var.public_hosted_zone_name}."
  private_zone = false
}

resource "aws_s3_bucket" "front_mobile" {
  count  = var.create_storage_buckets ? 1 : 0
  bucket = "${var.project_name}-front-mobile-${var.account_id}"
  tags   = var.tags
}

resource "aws_s3_bucket" "front_admin" {
  count  = var.create_storage_buckets ? 1 : 0
  bucket = "${var.project_name}-front-admin-${var.account_id}"
  tags = merge(var.tags, {
    Component = "frontend-admin"
    Purpose   = "catalog-admin"
  })
}

data "aws_s3_bucket" "front_mobile" {
  count  = var.create_storage_buckets ? 0 : 1
  bucket = var.front_mobile_bucket_name
}

data "aws_s3_bucket" "front_admin" {
  count  = var.create_storage_buckets ? 0 : 1
  bucket = var.front_admin_bucket_name
}

resource "aws_s3_bucket_public_access_block" "front_mobile" {
  count                   = var.create_storage_buckets ? 1 : 0
  bucket                  = aws_s3_bucket.front_mobile[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "front_admin" {
  count                   = var.create_storage_buckets ? 1 : 0
  bucket                  = aws_s3_bucket.front_admin[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "mobile" {
  name                              = "${var.project_name}-mobile-oac"
  description                       = "Origin access control for StockLens v05 mobile"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_acm_certificate" "mobile" {
  provider                  = aws.us_east_1
  domain_name               = var.mobile_domain_name
  subject_alternative_names = [var.admin_domain_name]
  validation_method         = "DNS"
  lifecycle {
    create_before_destroy = true
  }
  tags = var.tags
}

resource "aws_route53_record" "mobile_certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.mobile.domain_validation_options :
    option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }
  zone_id = data.aws_route53_zone.public.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "mobile" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.mobile.arn
  validation_record_fqdns = [for record in aws_route53_record.mobile_certificate_validation : record.fqdn]
}

resource "aws_cloudfront_distribution" "front_mobile" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "StockLens v05 home catalog mobile"
  default_root_object = "index.html"
  aliases             = [var.mobile_domain_name]

  origin {
    domain_name              = local.mobile_origin_domain
    origin_access_control_id = aws_cloudfront_origin_access_control.mobile.id
    origin_id                = local.mobile_origin_id
    origin_path              = local.mobile_origin_path
  }
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.mobile_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.mobile.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  tags = var.tags
}

resource "aws_cloudfront_distribution" "front_admin" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "StockLens v05 catalog admin"
  default_root_object = "index.html"
  aliases             = [var.admin_domain_name]

  origin {
    domain_name              = local.admin_origin_domain
    origin_access_control_id = aws_cloudfront_origin_access_control.mobile.id
    origin_id                = local.admin_origin_id
    origin_path              = local.admin_origin_path
  }
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.admin_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.mobile.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  tags = merge(var.tags, {
    Component = "frontend-admin"
    Purpose   = "catalog-admin"
  })
}

resource "aws_s3_bucket_policy" "front_mobile" {
  count  = var.create_storage_buckets ? 1 : 0
  bucket = aws_s3_bucket.front_mobile[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${local.front_mobile_bucket_arn}/*"
      Condition = {
        ArnLike      = { "AWS:SourceArn" = "arn:aws:cloudfront::${var.account_id}:distribution/*" }
        StringEquals = { "AWS:SourceAccount" = var.account_id }
      }
    }]
  })
}

resource "aws_s3_bucket_policy" "front_admin" {
  count  = var.create_storage_buckets ? 1 : 0
  bucket = aws_s3_bucket.front_admin[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${local.front_admin_bucket_arn}/*"
      Condition = {
        ArnLike      = { "AWS:SourceArn" = "arn:aws:cloudfront::${var.account_id}:distribution/*" }
        StringEquals = { "AWS:SourceAccount" = var.account_id }
      }
    }]
  })
}

resource "aws_route53_record" "front_mobile" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = var.mobile_domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.front_mobile.domain_name
    zone_id                = aws_cloudfront_distribution.front_mobile.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "front_admin" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = var.admin_domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.front_admin.domain_name
    zone_id                = aws_cloudfront_distribution.front_admin.hosted_zone_id
    evaluate_target_health = false
  }
}

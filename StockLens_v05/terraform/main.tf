provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
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
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
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
}

data "aws_caller_identity" "current" {}

locals {
  mobile_origin_id = "${var.project_name}-mobile-origin"
  github_oidc_provider_arn = (
    var.github_oidc_provider_arn != ""
    ? var.github_oidc_provider_arn
    : aws_iam_openid_connect_provider.github[0].arn
  )
  github_oidc_subjects = [
    "repo:${var.github_owner}/${var.github_repo}:*",
    "repo:${lower(var.github_owner)}/${var.github_repo}:*",
    "repo:${var.github_owner}@*/${var.github_repo}@*:*",
    "repo:${lower(var.github_owner)}@*/${var.github_repo}@*:*"
  ]

  tags = {
    App       = "StockLens"
    Version   = "v05"
    Component = "frontend"
    Purpose   = "home-catalog-mobile"
  }
}

data "aws_route53_zone" "public" {
  zone_id      = var.public_hosted_zone_id
  name         = "${var.public_hosted_zone_name}."
  private_zone = false
}

resource "aws_s3_bucket" "front_mobile" {
  bucket = "${var.project_name}-front-mobile-${data.aws_caller_identity.current.account_id}"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "front_mobile" {
  bucket = aws_s3_bucket.front_mobile.id

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
  provider = aws.us_east_1

  domain_name       = var.mobile_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
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
  provider = aws.us_east_1

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
    domain_name              = aws_s3_bucket.front_mobile.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.mobile.id
    origin_id                = local.mobile_origin_id
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

  tags = local.tags
}

resource "aws_s3_bucket_policy" "front_mobile" {
  bucket = aws_s3_bucket.front_mobile.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontRead"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.front_mobile.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.front_mobile.arn
        }
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

resource "aws_iam_openid_connect_provider" "github" {
  count = var.github_oidc_provider_arn == "" ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = local.tags
}

resource "aws_iam_role" "github_actions_app" {
  name = "${var.project_name}-github-actions-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = local.github_oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = local.github_oidc_subjects
        }
      }
    }]
  })

  tags = merge(local.tags, {
    Component = "pipeline"
    Purpose   = "github-actions-app-deploy"
  })
}

resource "aws_iam_role_policy" "github_actions_app" {
  name = "${var.project_name}-github-actions-app-policy"
  role = aws_iam_role.github_actions_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.front_mobile.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.front_mobile.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = aws_cloudfront_distribution.front_mobile.arn
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:ListDistributions"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "github_actions_infra" {
  name = "${var.project_name}-github-actions-infra-role"

  assume_role_policy = aws_iam_role.github_actions_app.assume_role_policy

  tags = merge(local.tags, {
    Component = "pipeline"
    Purpose   = "github-actions-terraform"
  })
}

resource "aws_iam_role_policy" "github_actions_infra" {
  name = "${var.project_name}-github-actions-infra-policy"
  role = aws_iam_role.github_actions_infra.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "acm:*",
          "cloudfront:*",
          "iam:*",
          "route53:*",
          "s3:*",
          "sts:GetCallerIdentity"
        ]
        Resource = "*"
      }
    ]
  })
}


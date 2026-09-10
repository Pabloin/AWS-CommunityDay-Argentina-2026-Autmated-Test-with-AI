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
  admin_origin_id  = "${var.project_name}-admin-origin"
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

resource "aws_s3_bucket" "front_admin" {
  bucket = "${var.project_name}-front-admin-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.tags, {
    Component = "frontend-admin"
    Purpose   = "catalog-admin"
  })
}

resource "aws_s3_bucket" "photos" {
  bucket = "${var.project_name}-photos-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.tags, {
    Component = "storage"
    Purpose   = "catalog-photos"
  })
}

resource "aws_s3_bucket_public_access_block" "front_mobile" {
  bucket = aws_s3_bucket.front_mobile.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "front_admin" {
  bucket = aws_s3_bucket.front_admin.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    id     = "expire-demo-photos"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 14
    }
  }
}

resource "aws_dynamodb_table" "items" {
  name         = "${var.project_name}-items"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(local.tags, {
    Component = "database"
    Purpose   = "catalog-items"
  })
}

resource "aws_resourcegroups_group" "stocklens_stack" {
  name        = "${var.project_name}-${var.environment}"
  description = "StockLens v05 resources for AWS Community Day Argentina 2026"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Event"
          Values = [var.event_name]
        },
        {
          Key    = "Project"
          Values = [var.project_name]
        },
        {
          Key    = "Environment"
          Values = [var.environment]
        },
        {
          Key    = "Release"
          Values = ["stocklens-v05"]
        },
        {
          Key    = "Tenant"
          Values = [var.default_tenant_id]
        }
      ]
    })
  }

  tags = merge(local.tags, {
    Component = "resource-management"
    Purpose   = "group-stocklens-v05-stack"
  })
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

  domain_name               = var.mobile_domain_name
  subject_alternative_names = [var.admin_domain_name]
  validation_method         = "DNS"

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

resource "aws_cloudfront_distribution" "front_admin" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "StockLens v05 catalog admin"
  default_root_object = "index.html"
  aliases             = [var.admin_domain_name]

  origin {
    domain_name              = aws_s3_bucket.front_admin.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.mobile.id
    origin_id                = local.admin_origin_id
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

  tags = merge(local.tags, {
    Component = "frontend-admin"
    Purpose   = "catalog-admin"
  })
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

resource "aws_s3_bucket_policy" "front_admin" {
  bucket = aws_s3_bucket.front_admin.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontRead"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.front_admin.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.front_admin.arn
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

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.project_name}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = merge(local.tags, {
    Component = "backend"
    Purpose   = "image-analysis-api"
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "${var.project_name}-lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.items.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.photos.arn}/*"
      }
    ]
  })
}

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api"
  role          = aws_iam_role.lambda.arn
  handler       = "functions/api.handler"
  runtime       = "nodejs20.x"
  filename      = "${path.module}/../backend/dist/api.zip"
  timeout       = 20
  memory_size   = 512

  source_code_hash = filebase64sha256("${path.module}/../backend/dist/api.zip")

  environment {
    variables = {
      BEDROCK_MODEL_ID  = var.bedrock_model_id
      DEFAULT_TENANT_ID = var.default_tenant_id
      ITEMS_TABLE       = aws_dynamodb_table.items.name
      PHOTOS_BUCKET     = aws_s3_bucket.photos.bucket
      PUBLIC_APP_URL    = "https://${var.mobile_domain_name}"
    }
  }

  tags = merge(local.tags, {
    Component = "backend"
    Purpose   = "image-analysis-api"
  })
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["content-type"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_origins = [
      "https://${var.mobile_domain_name}",
      "https://${var.admin_domain_name}",
      "http://127.0.0.1:5190",
      "http://127.0.0.1:5290",
      "http://127.0.0.1:5192",
      "http://localhost:5192"
    ]
  }

  tags = merge(local.tags, {
    Component = "backend"
    Purpose   = "image-analysis-api"
  })
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "analyze" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /analyze"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "import_qr" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /import-qr"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "list_items" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /items"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "create_item" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /items"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "get_item" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /items/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "get_item_qr" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /items/{id}/qr"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  tags = merge(local.tags, {
    Component = "backend"
    Purpose   = "image-analysis-api"
  })
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
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
        Resource = [
          aws_s3_bucket.front_mobile.arn,
          aws_s3_bucket.front_admin.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.front_mobile.arn}/*",
          "${aws_s3_bucket.front_admin.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = [
          aws_cloudfront_distribution.front_mobile.arn,
          aws_cloudfront_distribution.front_admin.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:ListDistributions"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "apigateway:GET"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:GetFunction",
          "lambda:UpdateFunctionCode"
        ]
        Resource = aws_lambda_function.api.arn
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
          "apigateway:*",
          "cloudfront:*",
          "dynamodb:*",
          "iam:*",
          "lambda:*",
          "logs:*",
          "route53:*",
          "resource-groups:*",
          "s3:*",
          "sts:GetCallerIdentity"
        ]
        Resource = "*"
      }
    ]
  })
}

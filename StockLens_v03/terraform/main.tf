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
      Release      = "stocklens-v03"
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
      Release      = "stocklens-v03"
      DeploymentId = var.deployment_id
      CostCenter   = var.cost_center
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  front_web_origin_id    = "${var.project_name}-front-web-origin"
  front_mobile_origin_id = "${var.project_name}-front-mobile-origin"
  github_oidc_provider_arn = (
    var.github_oidc_provider_arn != ""
    ? var.github_oidc_provider_arn
    : aws_iam_openid_connect_provider.github[0].arn
  )

  tags = {
    App       = "StockLens"
    Version   = "v03"
    Component = "shared"
  }
}

data "aws_route53_zone" "public" {
  zone_id      = var.public_hosted_zone_id
  name         = "${var.public_hosted_zone_name}."
  private_zone = false
}

resource "aws_s3_bucket" "front_web" {
  bucket = "${var.project_name}-front-web-${data.aws_caller_identity.current.account_id}"
  tags   = local.tags
}

resource "aws_s3_bucket" "front_mobile" {
  bucket = "${var.project_name}-front-mobile-${data.aws_caller_identity.current.account_id}"
  tags   = local.tags
}

resource "aws_s3_bucket" "evidence" {
  bucket = "${var.project_name}-evidence-${data.aws_caller_identity.current.account_id}"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "front_web" {
  bucket = aws_s3_bucket.front_web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "front_mobile" {
  bucket = aws_s3_bucket.front_mobile.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = [
      "https://${var.web_domain_name}",
      "https://${var.mobile_domain_name}"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 300
  }
}

resource "aws_cloudfront_origin_access_control" "frontends" {
  name                              = "${var.project_name}-frontends-oac"
  description                       = "Origin access control for StockLens frontends"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_acm_certificate" "frontends" {
  provider = aws.us_east_1

  domain_name               = var.web_domain_name
  subject_alternative_names = [var.mobile_domain_name]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_route53_record" "frontends_certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.frontends.domain_validation_options :
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

resource "aws_acm_certificate_validation" "frontends" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.frontends.arn
  validation_record_fqdns = [for record in aws_route53_record.frontends_certificate_validation : record.fqdn]
}

resource "aws_cloudfront_distribution" "front_web" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "StockLens web/admin frontend"
  default_root_object = "index.html"
  aliases             = [var.web_domain_name]

  origin {
    domain_name              = aws_s3_bucket.front_web.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontends.id
    origin_id                = local.front_web_origin_id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.front_web_origin_id
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
    acm_certificate_arn      = aws_acm_certificate_validation.frontends.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.tags
}

resource "aws_cloudfront_distribution" "front_mobile" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "StockLens mobile frontend"
  default_root_object = "index.html"
  aliases             = [var.mobile_domain_name]

  origin {
    domain_name              = aws_s3_bucket.front_mobile.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontends.id
    origin_id                = local.front_mobile_origin_id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.front_mobile_origin_id
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
    acm_certificate_arn      = aws_acm_certificate_validation.frontends.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.tags
}

resource "aws_s3_bucket_policy" "front_web" {
  bucket = aws_s3_bucket.front_web.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontRead"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.front_web.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.front_web.arn
        }
      }
    }]
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

resource "aws_route53_record" "front_web" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = var.web_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.front_web.domain_name
    zone_id                = aws_cloudfront_distribution.front_web.hosted_zone_id
    evaluate_target_health = false
  }
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

resource "aws_dynamodb_table" "assets" {
  name         = "${var.project_name}-assets"
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

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  tags = local.tags
}

resource "aws_resourcegroups_group" "stocklens_stack" {
  name        = "${var.project_name}-${var.environment}"
  description = "StockLens v03 resources for AWS Community Day Argentina 2026"

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
          Values = ["stocklens-v03"]
        }
      ]
    })
  }

  tags = merge(local.tags, {
    Component = "resource-management"
    Purpose   = "group-stocklens-stack"
  })
}

resource "aws_resourcegroups_group" "by_owner" {
  name        = "${var.project_name}-by-owner-${var.environment}"
  description = "StockLens v03 resources grouped by owner"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Owner"
          Values = [var.owner]
        },
        {
          Key    = "Release"
          Values = ["stocklens-v03"]
        }
      ]
    })
  }

  tags = merge(local.tags, {
    Component = "resource-management"
    Purpose   = "group-by-owner"
  })
}

resource "aws_resourcegroups_group" "by_event" {
  name        = "${var.project_name}-${var.environment}-event-resources"
  description = "StockLens v03 resources grouped by AWS Community Day Argentina event tag"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Event"
          Values = [var.event_name]
        },
        {
          Key    = "Release"
          Values = ["stocklens-v03"]
        }
      ]
    })
  }

  tags = merge(local.tags, {
    Component = "resource-management"
    Purpose   = "event-cost-tracking"
  })
}

resource "aws_dynamodb_table_item" "default_tenant" {
  table_name = aws_dynamodb_table.assets.name
  hash_key   = aws_dynamodb_table.assets.hash_key
  range_key  = aws_dynamodb_table.assets.range_key

  item = jsonencode({
    pk = {
      S = "TENANT#${var.default_tenant_id}"
    }
    sk = {
      S = "METADATA"
    }
    entityType = {
      S = "TENANT"
    }
    tenantId = {
      S = var.default_tenant_id
    }
    name = {
      S = "AWS Community Day Argentina 2026"
    }
    status = {
      S = "active"
    }
  })
}

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-users"

  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "tenantId"
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 80
    }
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "role"
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 30
    }
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  tags = local.tags
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project_name}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  supported_identity_providers = ["COGNITO"]

  callback_urls = [
    "https://${var.web_domain_name}",
    "https://${var.mobile_domain_name}",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5180"
  ]

  logout_urls = [
    "https://${var.web_domain_name}",
    "https://${var.mobile_domain_name}",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5180"
  ]

  prevent_user_existence_errors = "ENABLED"
}

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = local.tags
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
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.assets.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query"
        ]
        Resource = "${aws_dynamodb_table.assets.arn}/index/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.evidence.arn}/*"
      }
    ]
  })
}

data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/dist/package"
  output_path = "${path.module}/../backend/dist/api.zip"
}

resource "aws_lambda_function" "api" {
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.lambda.arn
  handler          = "functions/api.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256

  environment {
    variables = {
      ASSETS_TABLE      = aws_dynamodb_table.assets.name
      EVIDENCE_BUCKET   = aws_s3_bucket.evidence.bucket
      DEFAULT_TENANT_ID = var.default_tenant_id
    }
  }

  tags = local.tags
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["content-type", "authorization"]
    allow_methods = ["GET", "POST", "PUT", "OPTIONS"]
    allow_origins = ["*"]
  }

  tags = local.tags
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.http.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project_name}-cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /{proxy+}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  tags = local.tags
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

resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions-role"

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
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_owner}/${var.github_repo}:*"
        }
      }
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy" "github_actions" {
  name = "${var.project_name}-github-actions-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.front_web.arn,
          aws_s3_bucket.front_mobile.arn
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
          "${aws_s3_bucket.front_web.arn}/*",
          "${aws_s3_bucket.front_mobile.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction"
        ]
        Resource = aws_lambda_function.api.arn
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = [
          aws_cloudfront_distribution.front_web.arn,
          aws_cloudfront_distribution.front_mobile.arn
        ]
      }
    ]
  })
}

resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "${var.project_name}-pipeline-artifacts-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.tags, {
    Component = "pipeline"
    Purpose   = "codepipeline-artifacts"
  })
}

resource "aws_s3_bucket_public_access_block" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_iam_role" "ai_test_generator" {
  name = "${var.project_name}-ai-test-generator-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = merge(local.tags, {
    Component = "pipeline"
    Purpose   = "generate-playwright-tests"
  })
}

resource "aws_iam_role_policy" "ai_test_generator" {
  name = "${var.project_name}-ai-test-generator-policy"
  role = aws_iam_role.ai_test_generator.id

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
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "*"
      }
    ]
  })
}

data "archive_file" "ai_test_generator" {
  type        = "zip"
  source_file = "${path.module}/../ai_test_generator/index.mjs"
  output_path = "${path.module}/../ai_test_generator/ai-test-generator.zip"
}

resource "aws_lambda_function" "ai_test_generator" {
  function_name    = "${var.project_name}-ai-test-generator"
  role             = aws_iam_role.ai_test_generator.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.ai_test_generator.output_path
  source_code_hash = data.archive_file.ai_test_generator.output_base64sha256
  timeout          = 60

  environment {
    variables = {
      BEDROCK_MODEL_ID = var.bedrock_model_id
    }
  }

  tags = merge(local.tags, {
    Component = "pipeline"
    Purpose   = "generate-playwright-tests"
  })
}

resource "aws_iam_role" "codebuild" {
  name = "${var.project_name}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "codebuild.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = merge(local.tags, {
    Component = "pipeline"
  })
}

resource "aws_iam_role_policy" "codebuild" {
  name = "${var.project_name}-codebuild-policy"
  role = aws_iam_role.codebuild.id

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
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = aws_lambda_function.ai_test_generator.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.front_web.arn,
          aws_s3_bucket.front_mobile.arn
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
          "${aws_s3_bucket.front_web.arn}/*",
          "${aws_s3_bucket.front_mobile.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction"
        ]
        Resource = aws_lambda_function.api.arn
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = [
          aws_cloudfront_distribution.front_web.arn,
          aws_cloudfront_distribution.front_mobile.arn
        ]
      }
    ]
  })
}

resource "aws_codebuild_project" "quality_gate" {
  name         = "${var.project_name}-ai-quality-gate"
  description  = "Builds StockLens, asks Bedrock for Playwright tests and runs the generated tests."
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    environment_variable {
      name  = "AI_TEST_GENERATOR_FUNCTION"
      value = aws_lambda_function.ai_test_generator.function_name
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "StockLens_v03/buildspec-quality.yml"
  }

  tags = merge(local.tags, {
    Component = "pipeline"
    Purpose   = "ai-quality-gate"
  })
}

resource "aws_codebuild_project" "deploy" {
  name         = "${var.project_name}-deploy"
  description  = "Deploys StockLens artifacts after the AI quality gate succeeds."
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "FRONT_WEB_BUCKET"
      value = aws_s3_bucket.front_web.bucket
    }

    environment_variable {
      name  = "FRONT_MOBILE_BUCKET"
      value = aws_s3_bucket.front_mobile.bucket
    }

    environment_variable {
      name  = "API_FUNCTION_NAME"
      value = aws_lambda_function.api.function_name
    }

    environment_variable {
      name  = "FRONT_WEB_DISTRIBUTION_ID"
      value = aws_cloudfront_distribution.front_web.id
    }

    environment_variable {
      name  = "FRONT_MOBILE_DISTRIBUTION_ID"
      value = aws_cloudfront_distribution.front_mobile.id
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "StockLens_v03/buildspec-deploy.yml"
  }

  tags = merge(local.tags, {
    Component = "pipeline"
    Purpose   = "deploy-after-quality-gate"
  })
}

resource "aws_iam_role" "codepipeline" {
  name = "${var.project_name}-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "codepipeline.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = merge(local.tags, {
    Component = "pipeline"
  })
}

resource "aws_iam_role_policy" "codepipeline" {
  name = "${var.project_name}-codepipeline-policy"
  role = aws_iam_role.codepipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codestar-connections:UseConnection"
        ]
        Resource = var.codestar_connection_arn == "" ? "*" : var.codestar_connection_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild"
        ]
        Resource = [
          aws_codebuild_project.quality_gate.arn,
          aws_codebuild_project.deploy.arn
        ]
      }
    ]
  })
}

resource "aws_codepipeline" "stocklens_v03" {
  count = var.codestar_connection_arn == "" ? 0 : 1

  name     = "${var.project_name}-ai-test-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "GitHub"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["SourceOutput"]

      configuration = {
        ConnectionArn        = var.codestar_connection_arn
        FullRepositoryId     = "${var.github_owner}/${var.github_repo}"
        BranchName           = var.pipeline_branch_name
        OutputArtifactFormat = "CODE_ZIP"
      }
    }
  }

  stage {
    name = "AIQualityGate"

    action {
      name             = "GenerateAndRunTests"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["SourceOutput"]
      output_artifacts = ["BuildOutput"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.quality_gate.name
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "DeployToS3CloudFrontAndLambda"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["BuildOutput"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.deploy.name
      }
    }
  }

  tags = merge(local.tags, {
    Component = "pipeline"
    Purpose   = "ai-generated-tests-before-deploy"
  })
}

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
  tags = merge(var.tags, {
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
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.aws_region}:${var.account_id}:*"
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:DeleteItem"]
        Resource = var.items_table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${var.photos_bucket_arn}/tenants/${var.default_tenant_id}/*"
      }
    ]
  })
}

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api"
  role          = aws_iam_role.lambda.arn
  handler       = "functions/api.handler"
  runtime       = "nodejs20.x"
  filename      = var.lambda_package_path
  timeout       = 20
  memory_size   = 512

  source_code_hash = filebase64sha256(var.lambda_package_path)

  environment {
    variables = {
      BEDROCK_MODEL_ID  = var.bedrock_model_id
      DEFAULT_TENANT_ID = var.default_tenant_id
      ITEMS_TABLE       = var.items_table_name
      PHOTOS_BUCKET     = var.photos_bucket_name
      PUBLIC_APP_URL    = "https://${var.mobile_domain_name}"
    }
  }

  tags = merge(var.tags, {
    Component = "backend"
    Purpose   = "image-analysis-api"
  })
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["content-type"]
    allow_methods = ["GET", "POST", "DELETE", "OPTIONS"]
    allow_origins = [
      "https://${var.mobile_domain_name}",
      "https://${var.admin_domain_name}",
      "http://127.0.0.1:5190",
      "http://127.0.0.1:5290",
      "http://127.0.0.1:5192",
      "http://localhost:5192"
    ]
  }

  tags = merge(var.tags, {
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

locals {
  routes = {
    health           = "GET /health"
    analyze          = "POST /analyze"
    import_qr        = "POST /import-qr"
    list_items       = "GET /items"
    create_item      = "POST /items"
    get_item         = "GET /items/{id}"
    get_item_qr      = "GET /items/{id}/qr"
    delete_test_item = "DELETE /test-support/items/{id}"
  }
}

resource "aws_apigatewayv2_route" "routes" {
  for_each  = local.routes
  api_id    = aws_apigatewayv2_api.http.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
  tags = merge(var.tags, {
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

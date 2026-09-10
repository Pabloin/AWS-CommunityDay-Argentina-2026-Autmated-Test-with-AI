locals {
  github_oidc_provider_arn = var.github_oidc_provider_arn != "" ? var.github_oidc_provider_arn : aws_iam_openid_connect_provider.github[0].arn
  github_oidc_subjects = [
    "repo:${var.github_owner}/${var.github_repo}:*",
    "repo:${lower(var.github_owner)}/${var.github_repo}:*",
    "repo:${var.github_owner}@*/${var.github_repo}@*:*",
    "repo:${lower(var.github_owner)}@*/${var.github_repo}@*:*"
  ]
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.github_oidc_provider_arn == "" ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
  tags            = var.tags
}

resource "aws_iam_role" "github_actions_app" {
  name = "${var.project_name}-github-actions-app-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.github_oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike   = { "token.actions.githubusercontent.com:sub" = local.github_oidc_subjects }
      }
    }]
  })
  tags = merge(var.tags, {
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
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [var.front_mobile_bucket_arn, var.front_admin_bucket_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"]
        Resource = [var.mobile_objects_arn, var.admin_objects_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
        Resource = [var.front_mobile_distribution_arn, var.front_admin_distribution_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:ListDistributions", "apigateway:GET"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["lambda:GetFunction", "lambda:GetFunctionConfiguration", "lambda:UpdateFunctionCode"]
        Resource = var.api_function_arn
      }
    ]
  })
}

resource "aws_iam_role" "github_actions_infra" {
  name               = "${var.project_name}-github-actions-infra-role"
  assume_role_policy = aws_iam_role.github_actions_app.assume_role_policy
  tags = merge(var.tags, {
    Component = "pipeline"
    Purpose   = "github-actions-terraform"
  })
}

resource "aws_iam_role_policy" "github_actions_infra" {
  name = "${var.project_name}-github-actions-infra-policy"
  role = aws_iam_role.github_actions_infra.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "acm:*", "apigateway:*", "cloudfront:*", "dynamodb:*", "iam:*",
        "lambda:*", "logs:*", "route53:*", "resource-groups:*", "s3:*",
        "sts:GetCallerIdentity"
      ]
      Resource = "*"
    }]
  })
}

# Storage architecture
moved {
  from = aws_s3_bucket.photos
  to   = module.storage.aws_s3_bucket.photos
}
moved {
  from = data.aws_s3_bucket.photos
  to   = module.storage.data.aws_s3_bucket.photos
}
moved {
  from = aws_s3_bucket_public_access_block.photos
  to   = module.storage.aws_s3_bucket_public_access_block.photos
}
moved {
  from = aws_s3_bucket_server_side_encryption_configuration.photos
  to   = module.storage.aws_s3_bucket_server_side_encryption_configuration.photos
}
moved {
  from = aws_s3_bucket_lifecycle_configuration.photos
  to   = module.storage.aws_s3_bucket_lifecycle_configuration.photos
}
moved {
  from = aws_dynamodb_table.items
  to   = module.storage.aws_dynamodb_table.items
}

# Frontend applications and edge delivery
moved {
  from = data.aws_route53_zone.public
  to   = module.apps.data.aws_route53_zone.public
}
moved {
  from = aws_s3_bucket.front_mobile
  to   = module.apps.aws_s3_bucket.front_mobile
}
moved {
  from = aws_s3_bucket.front_admin
  to   = module.apps.aws_s3_bucket.front_admin
}
moved {
  from = data.aws_s3_bucket.front_mobile
  to   = module.apps.data.aws_s3_bucket.front_mobile
}
moved {
  from = data.aws_s3_bucket.front_admin
  to   = module.apps.data.aws_s3_bucket.front_admin
}
moved {
  from = aws_s3_bucket_public_access_block.front_mobile
  to   = module.apps.aws_s3_bucket_public_access_block.front_mobile
}
moved {
  from = aws_s3_bucket_public_access_block.front_admin
  to   = module.apps.aws_s3_bucket_public_access_block.front_admin
}
moved {
  from = aws_cloudfront_origin_access_control.mobile
  to   = module.apps.aws_cloudfront_origin_access_control.mobile
}
moved {
  from = aws_acm_certificate.mobile
  to   = module.apps.aws_acm_certificate.mobile
}
moved {
  from = aws_route53_record.mobile_certificate_validation
  to   = module.apps.aws_route53_record.mobile_certificate_validation
}
moved {
  from = aws_acm_certificate_validation.mobile
  to   = module.apps.aws_acm_certificate_validation.mobile
}
moved {
  from = aws_cloudfront_distribution.front_mobile
  to   = module.apps.aws_cloudfront_distribution.front_mobile
}
moved {
  from = aws_cloudfront_distribution.front_admin
  to   = module.apps.aws_cloudfront_distribution.front_admin
}
moved {
  from = aws_s3_bucket_policy.front_mobile
  to   = module.apps.aws_s3_bucket_policy.front_mobile
}
moved {
  from = aws_s3_bucket_policy.front_admin
  to   = module.apps.aws_s3_bucket_policy.front_admin
}
moved {
  from = aws_route53_record.front_mobile
  to   = module.apps.aws_route53_record.front_mobile
}
moved {
  from = aws_route53_record.front_admin
  to   = module.apps.aws_route53_record.front_admin
}

# API and backend execution
moved {
  from = data.aws_iam_policy_document.lambda_assume_role
  to   = module.api.data.aws_iam_policy_document.lambda_assume_role
}
moved {
  from = aws_iam_role.lambda
  to   = module.api.aws_iam_role.lambda
}
moved {
  from = aws_iam_role_policy.lambda
  to   = module.api.aws_iam_role_policy.lambda
}
moved {
  from = aws_lambda_function.api
  to   = module.api.aws_lambda_function.api
}
moved {
  from = aws_apigatewayv2_api.http
  to   = module.api.aws_apigatewayv2_api.http
}
moved {
  from = aws_apigatewayv2_integration.lambda
  to   = module.api.aws_apigatewayv2_integration.lambda
}
moved {
  from = aws_apigatewayv2_route.health
  to   = module.api.aws_apigatewayv2_route.routes["health"]
}
moved {
  from = aws_apigatewayv2_route.analyze
  to   = module.api.aws_apigatewayv2_route.routes["analyze"]
}
moved {
  from = aws_apigatewayv2_route.import_qr
  to   = module.api.aws_apigatewayv2_route.routes["import_qr"]
}
moved {
  from = aws_apigatewayv2_route.list_items
  to   = module.api.aws_apigatewayv2_route.routes["list_items"]
}
moved {
  from = aws_apigatewayv2_route.create_item
  to   = module.api.aws_apigatewayv2_route.routes["create_item"]
}
moved {
  from = aws_apigatewayv2_route.get_item
  to   = module.api.aws_apigatewayv2_route.routes["get_item"]
}
moved {
  from = aws_apigatewayv2_route.get_item_qr
  to   = module.api.aws_apigatewayv2_route.routes["get_item_qr"]
}
moved {
  from = aws_apigatewayv2_route.delete_test_item
  to   = module.api.aws_apigatewayv2_route.routes["delete_test_item"]
}
moved {
  from = aws_apigatewayv2_stage.default
  to   = module.api.aws_apigatewayv2_stage.default
}
moved {
  from = aws_lambda_permission.api_gateway
  to   = module.api.aws_lambda_permission.api_gateway
}

# Delivery pipelines and GitHub federation
moved {
  from = aws_iam_openid_connect_provider.github
  to   = module.cicd.aws_iam_openid_connect_provider.github
}
moved {
  from = aws_iam_role.github_actions_app
  to   = module.cicd.aws_iam_role.github_actions_app
}
moved {
  from = aws_iam_role_policy.github_actions_app
  to   = module.cicd.aws_iam_role_policy.github_actions_app
}
moved {
  from = aws_iam_role.github_actions_infra
  to   = module.cicd.aws_iam_role.github_actions_infra
}
moved {
  from = aws_iam_role_policy.github_actions_infra
  to   = module.cicd.aws_iam_role_policy.github_actions_infra
}

# Preserve every production object while moving its state address into the module.
moved {
  from = data.aws_caller_identity.current
  to   = module.stocklens.data.aws_caller_identity.current
}
moved {
  from = data.aws_route53_zone.public
  to   = module.stocklens.data.aws_route53_zone.public
}
moved {
  from = data.aws_iam_policy_document.lambda_assume_role
  to   = module.stocklens.data.aws_iam_policy_document.lambda_assume_role
}

moved {
  from = aws_s3_bucket.front_mobile
  to   = module.stocklens.aws_s3_bucket.front_mobile[0]
}
moved {
  from = aws_s3_bucket.front_admin
  to   = module.stocklens.aws_s3_bucket.front_admin[0]
}
moved {
  from = aws_s3_bucket.photos
  to   = module.stocklens.aws_s3_bucket.photos[0]
}
moved {
  from = aws_s3_bucket_public_access_block.front_mobile
  to   = module.stocklens.aws_s3_bucket_public_access_block.front_mobile[0]
}
moved {
  from = aws_s3_bucket_public_access_block.front_admin
  to   = module.stocklens.aws_s3_bucket_public_access_block.front_admin[0]
}
moved {
  from = aws_s3_bucket_public_access_block.photos
  to   = module.stocklens.aws_s3_bucket_public_access_block.photos[0]
}
moved {
  from = aws_s3_bucket_server_side_encryption_configuration.photos
  to   = module.stocklens.aws_s3_bucket_server_side_encryption_configuration.photos[0]
}
moved {
  from = aws_s3_bucket_lifecycle_configuration.photos
  to   = module.stocklens.aws_s3_bucket_lifecycle_configuration.photos[0]
}
moved {
  from = aws_s3_bucket_policy.front_mobile
  to   = module.stocklens.aws_s3_bucket_policy.front_mobile[0]
}
moved {
  from = aws_s3_bucket_policy.front_admin
  to   = module.stocklens.aws_s3_bucket_policy.front_admin[0]
}

moved {
  from = aws_dynamodb_table.items
  to   = module.stocklens.aws_dynamodb_table.items
}
moved {
  from = aws_resourcegroups_group.stocklens_stack
  to   = module.stocklens.aws_resourcegroups_group.stocklens_stack
}

moved {
  from = aws_cloudfront_origin_access_control.mobile
  to   = module.stocklens.aws_cloudfront_origin_access_control.mobile
}
moved {
  from = aws_cloudfront_distribution.front_mobile
  to   = module.stocklens.aws_cloudfront_distribution.front_mobile
}
moved {
  from = aws_cloudfront_distribution.front_admin
  to   = module.stocklens.aws_cloudfront_distribution.front_admin
}

moved {
  from = aws_acm_certificate.mobile
  to   = module.stocklens.aws_acm_certificate.mobile
}
moved {
  from = aws_route53_record.mobile_certificate_validation
  to   = module.stocklens.aws_route53_record.mobile_certificate_validation
}
moved {
  from = aws_acm_certificate_validation.mobile
  to   = module.stocklens.aws_acm_certificate_validation.mobile
}
moved {
  from = aws_route53_record.front_mobile
  to   = module.stocklens.aws_route53_record.front_mobile
}
moved {
  from = aws_route53_record.front_admin
  to   = module.stocklens.aws_route53_record.front_admin
}

moved {
  from = aws_iam_role.lambda
  to   = module.stocklens.aws_iam_role.lambda
}
moved {
  from = aws_iam_role_policy.lambda
  to   = module.stocklens.aws_iam_role_policy.lambda
}
moved {
  from = aws_lambda_function.api
  to   = module.stocklens.aws_lambda_function.api
}

moved {
  from = aws_apigatewayv2_api.http
  to   = module.stocklens.aws_apigatewayv2_api.http
}
moved {
  from = aws_apigatewayv2_integration.lambda
  to   = module.stocklens.aws_apigatewayv2_integration.lambda
}
moved {
  from = aws_apigatewayv2_route.health
  to   = module.stocklens.aws_apigatewayv2_route.health
}
moved {
  from = aws_apigatewayv2_route.analyze
  to   = module.stocklens.aws_apigatewayv2_route.analyze
}
moved {
  from = aws_apigatewayv2_route.import_qr
  to   = module.stocklens.aws_apigatewayv2_route.import_qr
}
moved {
  from = aws_apigatewayv2_route.list_items
  to   = module.stocklens.aws_apigatewayv2_route.list_items
}
moved {
  from = aws_apigatewayv2_route.create_item
  to   = module.stocklens.aws_apigatewayv2_route.create_item
}
moved {
  from = aws_apigatewayv2_route.get_item
  to   = module.stocklens.aws_apigatewayv2_route.get_item
}
moved {
  from = aws_apigatewayv2_route.get_item_qr
  to   = module.stocklens.aws_apigatewayv2_route.get_item_qr
}
moved {
  from = aws_apigatewayv2_route.delete_test_item
  to   = module.stocklens.aws_apigatewayv2_route.delete_test_item
}
moved {
  from = aws_apigatewayv2_stage.default
  to   = module.stocklens.aws_apigatewayv2_stage.default
}
moved {
  from = aws_lambda_permission.api_gateway
  to   = module.stocklens.aws_lambda_permission.api_gateway
}

moved {
  from = aws_iam_openid_connect_provider.github
  to   = module.stocklens.aws_iam_openid_connect_provider.github
}
moved {
  from = aws_iam_role.github_actions_app
  to   = module.stocklens.aws_iam_role.github_actions_app
}
moved {
  from = aws_iam_role_policy.github_actions_app
  to   = module.stocklens.aws_iam_role_policy.github_actions_app
}
moved {
  from = aws_iam_role.github_actions_infra
  to   = module.stocklens.aws_iam_role.github_actions_infra
}
moved {
  from = aws_iam_role_policy.github_actions_infra
  to   = module.stocklens.aws_iam_role_policy.github_actions_infra
}

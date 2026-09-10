output "app_role_arn" {
  value = aws_iam_role.github_actions_app.arn
}

output "infra_role_arn" {
  value = aws_iam_role.github_actions_infra.arn
}

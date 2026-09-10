output "items_table_name" {
  value = aws_dynamodb_table.items.name
}

output "items_table_arn" {
  value = aws_dynamodb_table.items.arn
}

output "photos_bucket_name" {
  value = local.photos_bucket_name
}

output "photos_bucket_arn" {
  value = local.photos_bucket_arn
}

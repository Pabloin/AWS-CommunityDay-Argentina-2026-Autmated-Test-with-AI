locals {
  photos_bucket_name = var.create_storage_buckets ? aws_s3_bucket.photos[0].bucket : data.aws_s3_bucket.photos[0].bucket
  photos_bucket_arn  = var.create_storage_buckets ? aws_s3_bucket.photos[0].arn : data.aws_s3_bucket.photos[0].arn
}

resource "aws_s3_bucket" "photos" {
  count  = var.create_storage_buckets ? 1 : 0
  bucket = "${var.project_name}-photos-${var.account_id}"

  tags = merge(var.tags, {
    Component = "storage"
    Purpose   = "catalog-photos"
  })
}

data "aws_s3_bucket" "photos" {
  count  = var.create_storage_buckets ? 0 : 1
  bucket = var.photos_bucket_name
}

resource "aws_s3_bucket_public_access_block" "photos" {
  count  = var.create_storage_buckets ? 1 : 0
  bucket = aws_s3_bucket.photos[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  count  = var.create_storage_buckets ? 1 : 0
  bucket = aws_s3_bucket.photos[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  count  = var.create_storage_buckets ? 1 : 0
  bucket = aws_s3_bucket.photos[0].id

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

  tags = merge(var.tags, {
    Component = "database"
    Purpose   = "catalog-items"
  })
}

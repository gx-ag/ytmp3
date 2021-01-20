resource "aws_s3_bucket" "bucket" {
  bucket = var.domain
  acl    = "public-read"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  lifecycle_rule {
    enabled = true
    expiration {
      days = 1
    }
  }
}
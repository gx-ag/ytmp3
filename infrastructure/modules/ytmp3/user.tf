resource "aws_iam_user" "ytmp3" {
  name = "ytmp3"
}

resource "aws_iam_access_key" "ytmp3" {
  user = aws_iam_user.ytmp3.name
}

resource "aws_iam_user_policy" "ytmp3" {
  name = "ytmp3"
  user = aws_iam_user.ytmp3.name

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "s3:ListBucket",
        "s3:GetObjectAcl",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectTagging",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::${aws_s3_bucket.bucket.id}",
        "arn:aws:s3:::${aws_s3_bucket.bucket.id}/*"
      ]
    }
  ]
}
EOF

}
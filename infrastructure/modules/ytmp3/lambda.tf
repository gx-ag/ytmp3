data "aws_caller_identity" "current" {
}

# Setup IAM role for lambda to log to CloudWatch
data "aws_iam_policy_document" "lambda_role_policy_document" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "lambda_policy_document" {
  statement {
    actions = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = [
      "arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/*:*",
    ]
  }
  statement {
    actions = ["logs:CreateLogGroup"]
    resources = [
      "arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:*",
    ]
  }
}

resource "aws_iam_role" "lambda_iam_role" {
  name               = "${var.prefix}_lambda_role"
  assume_role_policy = data.aws_iam_policy_document.lambda_role_policy_document.json
}

resource "aws_iam_role_policy" "lambda_role_policy" {
  name   = "${var.prefix}_lambda_role_policy"
  role   = aws_iam_role.lambda_iam_role.id
  policy = data.aws_iam_policy_document.lambda_policy_document.json
}

# Create lambda
resource "aws_lambda_function" "lambda" {
  function_name    = var.prefix
  filename         = "../../ytmp3.zip"
  source_code_hash = filebase64sha256("../../ytmp3.zip")
  role             = aws_iam_role.lambda_iam_role.arn
  handler          = "src/lambda.handler"
  runtime          = "nodejs12.x"
  memory_size      = "3008"
  timeout          = "900"

  environment {
    variables = {
      S3_BUCKET = "ytmp3.gx.ag"
      S3_ACCESS_KEY = "${aws_iam_access_key.ytmp3.id}"
      S3_SECRET_KEY = "${aws_iam_access_key.ytmp3.secret}"
      FFMPEG_PATH = "./ffmpeg"
      DOWNLOAD_DIR = "/tmp"
    }
  }
}

# Begin API Gateway #

# Create the Rest API
resource "aws_api_gateway_rest_api" "api" {
  name               = var.prefix
  binary_media_types = ["*/*"]
}

# Create the root method
resource "aws_api_gateway_method" "api_method_root" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_rest_api.api.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "api_integration_root" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_method.api_method_root.resource_id
  http_method             = aws_api_gateway_method.api_method_root.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.lambda.invoke_arn
}

# Create the proxy+ method
resource "aws_api_gateway_resource" "api_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "api_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.api_resource.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "api_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_method.api_method.resource_id
  http_method             = aws_api_gateway_method.api_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.lambda.invoke_arn
}

# Create the deployment
resource "aws_api_gateway_deployment" "api_deployment" {
  depends_on = [
    aws_api_gateway_integration.api_integration_root,
    aws_api_gateway_integration.api_integration,
  ]
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = "deployment"
}

# Create the permissions to invoke lambda
resource "aws_lambda_permission" "web_gateway_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_deployment.api_deployment.execution_arn}/*/*"
}

# Create API Gateway domain name
resource "aws_api_gateway_domain_name" "domain_name" {
  domain_name              = var.domain
  regional_certificate_arn = var.cert_arn
  endpoint_configuration {
    types = [
      "REGIONAL",
    ]
  }
}

resource "aws_api_gateway_base_path_mapping" "regional" {
  api_id      = aws_api_gateway_rest_api.api.id
  stage_name  = "deployment"
  domain_name = aws_api_gateway_domain_name.domain_name.domain_name
}

# Create Route 53 record
resource "aws_route53_record" "record" {
  zone_id = var.zone_id
  name    = aws_api_gateway_domain_name.domain_name.domain_name
  type    = "A"
  alias {
    name                   = aws_api_gateway_domain_name.domain_name.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.domain_name.regional_zone_id
    evaluate_target_health = false
  }
}

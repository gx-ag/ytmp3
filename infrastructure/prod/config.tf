terraform {
  backend "s3" {
    bucket  = "jaburu-state-prod"
    key     = "terraform/ytmp3-gx-ag.tfstate"
    profile = "jabu"
    region  = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
  profile = "jabu"
}

locals {
  prefix = "ytmp3-gx-ag"
  domain = "gx.ag"
  alias  = "ytmp3.gx.ag"
}

ARG VARIANT="14-buster"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

# install terraform
RUN wget https://releases.hashicorp.com/terraform/0.12.26/terraform_0.12.26_linux_amd64.zip -O /tmp/terraform.zip
RUN (cd /tmp && unzip terraform.zip)
RUN rm /tmp/terraform.zip
RUN mv /tmp/terraform /usr/bin/
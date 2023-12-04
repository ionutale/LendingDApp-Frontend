provider "null" {}

resource "null_resource" "deploy_files" {
  triggers = {
    always_run = "${timestamp()}"
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Create a temporary directory
      mkdir -p tmp_upload

      # Copy files and directories to the temporary directory
      cp -r ../client/dist/assets tmp_upload/
      cp -r ../client/dist/images tmp_upload/
      cp -r ../client/dist/.well-known tmp_upload/
      cp ../client/dist/index.html tmp_upload/index.html
      cp ../client/dist/admin.html tmp_upload/admin.html

      # Upload files to FTP server
      lftp -c "open -u ${var.ftp_username},${var.ftp_password} ${var.ftp_server}; \
                  mirror --reverse --delete --verbose tmp_upload/assets/ /test-lending/assets/; \
                  mirror --reverse --delete --verbose tmp_upload/images/ /test-lending/images/; \
                  mirror --reverse --delete --verbose tmp_upload/.well-known/ /test-lending/.well-known/; \
                  put -O /test-lending/ tmp_upload/index.html tmp_upload/admin.html; \
               exit"

      
      # Remove temporary directory
      rm -r tmp_upload
    EOT
  }
}

variable "ftp_username" {}
variable "ftp_password" {}
variable "ftp_server" {}

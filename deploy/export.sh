cd ..
cd client
npm run build
cd ..
cd deploy
terraform apply -var-file terraform.tfvars
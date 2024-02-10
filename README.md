# LendingDApp-Frontend
This Lending dApp Frontend is a proof of concept for interacting over the Radix DLT 

This repo contains a frontend of Scrypto smart contract, its main component are:
- index.html (Single page app that uses two Javascript files for interacting with the user and with the Gateway)
- admin.html (Single page app that uses one Javascript files for interacting with the user and with the Gateway)


# Configuration
Configuration files store the data for the Stokenet and Mainnet environments, mainly the component address. the resources addresses, the dApp Id, the Gateway URL

.env
.env.staging 
.env.production

It is also present the file .well-known/radix.json for referring to the dApp id

# Deployment
This website is deployable by using deploy/export.sh (Ftp managed by Terraform)

# Managing Smart Contract Upgrade
At the moment of this writing there is no upgradability in the smart contract so until this gets deployed in the mainnet each new smart contract overrides the preceding one, this are the operation needed in the e layers:

- Scrypto layer (repo 'LendingDApp')
    - execute bash script for testing and 'scrypto test'
    - deploy the smart contract: 'npm run lending:deploy-lendingdapp'
    - use the return 'tx-id' for looking up in the dashboard all the component and resources created
    - fill the new values in the .env file (this are needed for executing the 'npm run')
    - execute 'node replaceValues.js' to have the files 'claimed_entities.rtm' and 'claimed_website.rtm' ready in directory scrypto/dapp_definition/
    - executes the two transactions with the dashboard

- Frontend layer (repo 'LendingDApp-Frontend')
    - fill the new values in the .env* file (this are needed for Javascript/Typescript inside the website)
    - fill the dApp id (if changed) inside /client/public/.well-known/radix.json
    - executes the export of the dApp website (/deploy/export.sh)

- Processes layer (repo 'LendingDApp-Processes')
    - fill the new values in the .env* file (this are needed for executing the 'npm run')
    - manually send .env to the server (it is not managed with Terraform)
    - executes the export (if changed) of the dApp process (/deploy/export.sh)
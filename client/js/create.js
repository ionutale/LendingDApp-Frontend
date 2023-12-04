import { RadixDappToolkit, DataRequestBuilder, RadixNetwork } from '@radixdlt/radix-dapp-toolkit'
// You can create a dApp definition in the dev console at https://stokenet-console.radixdlt.com/dapp-metadata 
// then use that account for your dAppId
// Set an environment variable to indicate the current environment
const environment = process.env.NODE_ENV || 'Stokenet'; // Default to 'development' if NODE_ENV is not set
console.log("environment : ", environment)
// Define constants based on the environment
let dAppId, networkId;

if (environment === 'production') {
  dAppId = import.meta.env.VITE_DAPP_ID
  networkId = RadixNetwork.Mainnet;
} else {
  // Default to Stokenet configuration
  dAppId = import.meta.env.VITE_DAPP_ID
  networkId = RadixNetwork.Stokenet;
}

// Instantiate DappToolkit
const rdt = RadixDappToolkit({
  dAppDefinitionAddress: dAppId,
  networkId: networkId,
  applicationName: 'Lending dApp',
  applicationVersion: '1.0.0',
});
console.log("dApp Toolkit: ", rdt)

let accountAddress
let accountName
let inputValue

// ************ Fetch the user's account address ************
rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1))
// Subscribe to updates to the user's shared wallet data
rdt.walletApi.walletData$.subscribe((walletData) => {
  console.log("subscription wallet data: ", walletData)
  // document.getElementById('accountName').innerText = walletData.accounts[0].label
  // document.getElementById('accountAddress').innerText = walletData.accounts[0].address
  accountName = walletData.accounts[0].label
  accountAddress = walletData.accounts[0].address
})

// Global states
let componentAddress = import.meta.env.VITE_COMP_ADDRESS //LendingDApp component address on stokenet
// You receive this badge(your resource address will be different) when you instantiate the component
let admin_badge = import.meta.env.VITE_ADMIN_BADGE
let owner_badge = import.meta.env.VITE_OWNER_BADGE
let lnd_resourceAddress = import.meta.env.VITE_LND_RESOURCE_ADDRESS // XRD lender badge manager
let lnd_tokenAddress = import.meta.env.VITE_LND_TOKEN_ADDRESS // LND token resource address

let xrdAddress = import.meta.env.VITE_XRD //Stokenet XRD resource address

// ************ Instantiate component and fetch component and resource addresses *************
document.getElementById('instantiateComponent').onclick = async function () {
  let packageAddress = document.getElementById("packageAddress").value;
  let flavor = document.getElementById("flavor").value;
  let manifest = `
  CALL_FUNCTION
    Address("${packageAddress}")
    "LendingDApp"
    "instantiate_lending_dapp"
    Decimal("5")
    Decimal("10")
    "${flavor}"
    Decimal("1728")
    "timebased"
    Decimal("1000");
  CALL_METHOD
    Address("${accountAddress}")
    "deposit_batch"
    Expression("ENTIRE_WORKTOP");
    `
  console.log("Instantiate Manifest: ", manifest)

  // Send manifest to extension for signing
  const result = await rdt.walletApi
    .sendTransaction({
      transactionManifest: manifest,
      version: 1,
    })
  if (result.isErr()) throw result.error
  console.log("Intantiate WalletSDK Result: ", result.value)


  // ************ Fetch the transaction status from the Gateway API ************
  let transactionStatus = await rdt.gatewayApi.transaction.getStatus(result.value.transactionIntentHash)
  console.log('Instantiate TransactionApi transaction/status:', transactionStatus)


  // ************ Fetch component address from gateway api and set componentAddress variable **************
  let getCommitReceipt = await rdt.gatewayApi.transaction.getCommittedDetails(result.value.transactionIntentHash)
  console.log('Instantiate getCommittedDetails:', getCommitReceipt)

  // ****** Set componentAddress variable with gateway api getCommitReciept payload ******
  componentAddress = getCommitReceipt.transaction.affected_global_entities[2];
  document.getElementById('componentAddress').innerText = componentAddress;

  const componentAddressElement = document.getElementById('componentAddress');

  if (componentAddressElement) {
    // The element with ID 'componentAddress' exists, set its text content
    componentAddress = getCommitReceipt.transaction.affected_global_entities[2];
    componentAddressElement.innerText = componentAddress;
  } else {
    // Handle the case where the element doesn't exist or is not available
    console.log("Element with ID 'componentAddress' not found.");
  }

  // ****** Set admin_badge variable with gateway api getCommitReciept payload ******
  admin_badge = getCommitReceipt.transaction.affected_global_entities[4];
  document.getElementById('admin_badge').innerText = admin_badge;

  // ****** Set owner_badge variable with gateway api getCommitReciept payload ******
  owner_badge = getCommitReceipt.transaction.affected_global_entities[3];
  document.getElementById('owner_badge').innerText = owner_badge;

  // ****** Set lnd_resourceAddress variable with gateway api getCommitReciept payload ******
  lnd_resourceAddress = getCommitReceipt.transaction.affected_global_entities[8];
  document.getElementById('lnd_resourceAddress').innerText = lnd_resourceAddress;

  // ****** Set lnd_tokenAddress variable with gateway api getCommitReciept payload ******
  lnd_tokenAddress = getCommitReceipt.transaction.affected_global_entities[7];
  document.getElementById('lnd_tokenAddress').innerText = lnd_tokenAddress;
}

import { RadixDappToolkit, DataRequestBuilder, RadixNetwork, NonFungibleIdType } from '@radixdlt/radix-dapp-toolkit'
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
  //  'account_tdx_2_12870m7gklv3p90004zjnm39jrhpf2vseejrgpncptl7rhsagz8yjm9';
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

// Global states
let componentAddress = import.meta.env.VITE_COMP_ADDRESS //LendingDApp component address on stokenet
// You receive this badge(your resource address will be different) when you instantiate the component
let admin_badge = import.meta.env.VITE_ADMIN_BADGE
let owner_badge = import.meta.env.VITE_OWNER_BADGE
let lnd_resourceAddress = import.meta.env.VITE_LND_RESOURCE_ADDRESS // XRD lender badge manager
let lnd_tokenAddress = import.meta.env.VITE_LND_TOKEN_ADDRESS // LND token resource address

let xrdAddress = import.meta.env.VITE_XRD //Stokenet XRD resource address


let accountAddress
let accountName

// ************ Fetch the user's account address (Page Load) ************
rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1))
// Subscribe to updates to the user's shared wallet data
rdt.walletApi.walletData$.subscribe((walletData) => {
  console.log("subscription wallet data: ", walletData)
  accountName = walletData.accounts[0].label
  accountAddress = walletData.accounts[0].address
})


// ***** Main function *****
function createTransactionOnClick(elementId, inputTextId, method, errorField) {
  document.getElementById(elementId).onclick = async function () {
    let inputValue = document.getElementById(inputTextId).value;
    console.log(`got inputValue = `, inputValue);

    const manifest = generateManifest(method, inputValue);
    console.log(`${method} manifest`, manifest);

    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    if (result.isErr()) {
      console.log(`${method} User Error: `, result.error);
      document.getElementById(errorField).textContent = extractErrorMessage(result.error.message);
      throw result.error;
    }

    // await fetchUserPosition(accountAddress);
  };
}

// ***** Main function on Button Only *****
function createTransactionOnButtonClick(elementId, method, errorField) {
  document.getElementById(elementId).onclick = async function () {

    const manifest = generateManifest(method, '');
    console.log(`${method} manifest`, manifest);

    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    if (result.isErr()) {
      console.log(`${method} User Error: `, result.error);
      document.getElementById(errorField).textContent = extractErrorMessage(result.error.message);
      throw result.error;
    }

    // await fetchUserPosition(accountAddress);
  };
}

// ***** Utility function *****
function generateManifest(method, inputValue) {
  let code;
  switch (method) {
    case 'lend_tokens':
      code = `
        CALL_METHOD
          Address("${accountAddress}")
          "withdraw"    
          Address("${xrdAddress}")
          Decimal("${inputValue}");
        TAKE_ALL_FROM_WORKTOP
          Address("${xrdAddress}")
          Bucket("xrd");
        CALL_METHOD
          Address("${accountAddress}")
          "withdraw"    
          Address("${lnd_resourceAddress}")
          Decimal("1");
        TAKE_ALL_FROM_WORKTOP
          Address("${lnd_resourceAddress}")
          Bucket("nft");    
        CALL_METHOD
          Address("${componentAddress}")
          "lend_tokens"
          Bucket("xrd")
          Bucket("nft");
        CALL_METHOD
          Address("${accountAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
          `;
      break;
    case 'register':
      code = ` 
        CALL_METHOD
          Address("${componentAddress}")
          "register";
        CALL_METHOD
          Address("${accountAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;
      break;
    case 'takes_back':
      code = `
        CALL_METHOD
          Address("${accountAddress}")
          "withdraw"    
          Address("${lnd_tokenAddress}")
          Decimal("${inputValue}");
        TAKE_FROM_WORKTOP
          Address("${lnd_tokenAddress}")
          Decimal("${inputValue}")
          Bucket("loan");
        CALL_METHOD
          Address("${accountAddress}")
          "withdraw"    
          Address("${lnd_resourceAddress}")
          Decimal("1");
        TAKE_FROM_WORKTOP
          Address("${lnd_resourceAddress}")
          Decimal("1")
          Bucket("nft");  
        CALL_METHOD
          Address("${componentAddress}")
          "takes_back"
          Bucket("loan")
          Bucket("nft");
        CALL_METHOD
          Address("${accountAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
          `;
      break;
    case 'extend_lending_pool':
      code = ` 
        CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_amount"    
          Address("${admin_badge}")
          Decimal("1");
        CALL_METHOD
          Address("${componentAddress}")
          "extend_lending_pool"
          Decimal("${inputValue}");
        CALL_METHOD
          Address("${accountAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
        `;
    break;     
    case 'set_reward':
      code = ` 
        CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_amount"    
          Address("${admin_badge}")
          Decimal("1");
        CALL_METHOD
          Address("${componentAddress}")
          "set_reward"
          Decimal("${inputValue}");
        CALL_METHOD
          Address("${accountAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
       `;
      break;   
      case 'set_interest':
        code = ` 
          CALL_METHOD
            Address("${accountAddress}")
            "create_proof_of_amount"    
            Address("${admin_badge}")
            Decimal("1");
          CALL_METHOD
            Address("${componentAddress}")
            "set_interest"
            Decimal("${inputValue}");
          CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
         `;
        break;           
      case 'fund_main_pool':
        code = `
          CALL_METHOD
            Address("${accountAddress}")
            "create_proof_of_amount"    
            Address("${admin_badge}")
            Decimal("1");              
          CALL_METHOD
            Address("${accountAddress}")
            "withdraw"    
            Address("${xrdAddress}")
            Decimal("${inputValue}");
          TAKE_ALL_FROM_WORKTOP
            Address("${xrdAddress}")
            Bucket("xrd");
          CALL_METHOD
            Address("${componentAddress}")
            "fund_main_pool"
            Bucket("xrd");      
          CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
            `;
        break;           
        case 'borrow':
          code = `
          CALL_METHOD
            Address("${accountAddress}")
            "withdraw"    
            Address("${lnd_resourceAddress}")
            Decimal("1");
          TAKE_FROM_WORKTOP
            Address("${lnd_resourceAddress}")
            Decimal("1")
            Bucket("nft");  
          CALL_METHOD
            Address("${componentAddress}")
            "borrow"
            Decimal("${inputValue}")
            Bucket("nft");
          CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
            `;
        break;   
        case 'repay':
          code = `
          CALL_METHOD
            Address("${accountAddress}")
            "withdraw"    
            Address("${lnd_resourceAddress}")
            Decimal("1");
          TAKE_FROM_WORKTOP
            Address("${lnd_resourceAddress}")
            Decimal("1")
            Bucket("nft");  
          CALL_METHOD
            Address("${accountAddress}")
            "withdraw"    
            Address("${xrdAddress}")
            Decimal("${inputValue}");
          TAKE_FROM_WORKTOP
            Address("${xrdAddress}")
            Decimal("${inputValue}")
            Bucket("repay");  
          CALL_METHOD
            Address("${componentAddress}")
            "repay"
            Bucket("repay")
            Bucket("nft");
          CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
            `;
        break;        
        case 'fund':
          code = `
          CALL_METHOD
            Address("${accountAddress}")
            "withdraw"    
            Address("${xrdAddress}")
            Decimal("${inputValue}");
          TAKE_ALL_FROM_WORKTOP
            Address("${xrdAddress}")
            Bucket("xrd");
          CALL_METHOD
            Address("${componentAddress}")
            "fund"
            Bucket("xrd");
          CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
            `;
          break;                         
    // Add more cases as needed
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return code;
}


// Usage
// createTransactionOnClick (elementId = divId del button, inputTextId = divId del field di inserimento, method = scrypto method)
createTransactionOnButtonClick('register', 'register', 'registerTxResult');
createTransactionOnClick('lendTokens', 'numberOfTokens', 'lend_tokens', 'lendTxResult');
createTransactionOnClick('takes_back', 'numberOfLndTokens', 'takes_back', 'takeBackTxResult');

createTransactionOnClick('borrow', 'numberOfRequestedXrdTokens', 'borrow', 'borrowTxResult');
createTransactionOnClick('repay', 'numberOfRepaiedXrdTokens', 'repay', 'repayTxResult');

createTransactionOnClick('fundDevelopment', 'numberOfFundedTokens', 'fund', 'fundTxResult');


function extractErrorMessage(inputString) {
  const regex = /PanicMessage\("([^@]*)@/;
  const match = regex.exec(inputString);
  if (match && match[1]) {
    return match[1];
  } else {
    return "No match found";
  }
}

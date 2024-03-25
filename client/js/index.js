import { RadixDappToolkit, DataRequestBuilder, RadixNetwork, NonFungibleIdType, OneTimeDataRequestBuilder } from '@radixdlt/radix-dapp-toolkit'
import { fetchMainPoolSize, fetchLendingPoolSize, fetchUserPosition, fetchComponentConfig } from './gateway.ts'; 
import { rdt } from './gateway.ts'; 

const environment = process.env.NODE_ENV || 'Stokenet'; // Default to 'development' if NODE_ENV is not set
console.log("environment (index.js): ", environment)

// Define constants based on the environment
let dAppId, networkId, gwUrl;

if (environment == 'production') {
  dAppId = import.meta.env.VITE_DAPP_ID
  networkId = RadixNetwork.Mainnet;
} else {
  // Default to Stokenet configuration
  dAppId = import.meta.env.VITE_DAPP_ID
  networkId = RadixNetwork.Stokenet;
}
gwUrl = import.meta.env.VITE_GATEWAY_URL;
console.log("gw url (index.js): ", gwUrl)

// Global states
let componentAddress = import.meta.env.VITE_COMP_ADDRESS //LendingDApp component address on stokenet
let admin_badge = import.meta.env.VITE_ADMIN_BADGE
let owner_badge = import.meta.env.VITE_OWNER_BADGE
let lnd_resourceAddress = import.meta.env.VITE_LND_RESOURCE_ADDRESS // XRD lender badge manager
let lnd_tokenAddress = import.meta.env.VITE_LND_TOKEN_ADDRESS // LND token resource address

let xrdAddress = import.meta.env.VITE_XRD //Stokenet XRD resource address

function handleTransactionSuccess(result) {
  //fetch pool size
  fetchMainPoolSize(componentAddress, xrdAddress);
  fetchLendingPoolSize(componentAddress, xrdAddress);
  //fetch nft metadata info of the connected user
  fetchUserPosition(accountAddress);
  //get config parameter of the component
  fetchComponentConfig(componentAddress);
}

// ***** Main function *****
function createTransactionOnClick(elementId, inputTextId, inputTextId2, method, errorField) {
  document.getElementById(elementId).onclick = async function () {
    let inputValue = document.getElementById(inputTextId).value;
    let inputValue2 = document.getElementById(inputTextId2).value;
    let accountAddressFrom = document.getElementById('accountAddress').value;

    const manifest = generateManifest(method, inputValue, inputValue2);
    console.log(`${method} manifest`, manifest);

    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    if (result.isErr()) {
      document.getElementById(errorField).textContent = extractErrorMessage(result.error.message);
      document.getElementById(errorField).style.color = "red";
      throw result.error;
    }
    handleTransactionSuccess(result);
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
      document.getElementById(errorField).textContent = extractErrorMessage(result.error.message);
      document.getElementById(errorField).style.color = "red";
      throw result.error;
    }
    // await fetchUserPosition(accountAddress);
  };
}

// ***** Utility function *****
function generateManifest(method, inputValue, inputValue2) {
  let code;
  let accountAddressFrom = document.getElementById('accountAddress').value;
  switch (method) {
    case 'lend_tokens':
      code = `
        CALL_METHOD
          Address("${accountAddressFrom}")
          "withdraw"    
          Address("${xrdAddress}")
          Decimal("${inputValue}");
        TAKE_ALL_FROM_WORKTOP
          Address("${xrdAddress}")
          Bucket("xrd");
        CALL_METHOD
          Address("${accountAddressFrom}")
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
          Address("${accountAddressFrom}")
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
            Address("${accountAddressFrom}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
        `;
        break;      
    // case 'register':
    //   code = ` 
    //     CALL_METHOD
    //       Address("${accountAddressFrom}")
    //       "withdraw"    
    //       Address("${lnd_resourceAddress}")
    //       Decimal("1");
    //     TAKE_ALL_FROM_WORKTOP
    //       Address("${lnd_resourceAddress}")
    //       Bucket("nft");    
    //     CALL_METHOD
    //       Address("${componentAddress}")
    //       "register"
    //       Bucket("nft");
    //     CALL_METHOD
    //       Address("${accountAddressFrom}")
    //       "deposit_batch"
    //       Expression("ENTIRE_WORKTOP");
    //   `;
    //   break;
    case 'unregister':
      code = `
        CALL_METHOD
          Address("${accountAddressFrom}")
          "withdraw"    
          Address("${lnd_resourceAddress}")
          Decimal("1");
        TAKE_FROM_WORKTOP
          Address("${lnd_resourceAddress}")
          Decimal("1")
          Bucket("nft");      
        CALL_METHOD
          Address("${componentAddress}")
          "unregister"
          Bucket("nft");
        CALL_METHOD
          Address("${accountAddressFrom}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;
      break;      
    case 'takes_back':
      code = `
        CALL_METHOD
          Address("${accountAddressFrom}")
          "withdraw"    
          Address("${lnd_tokenAddress}")
          Decimal("${inputValue}");
        TAKE_FROM_WORKTOP
          Address("${lnd_tokenAddress}")
          Decimal("${inputValue}")
          Bucket("loan");
        CALL_METHOD
          Address("${accountAddressFrom}")
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
          Address("${accountAddressFrom}")
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
            Address("${accountAddressFrom}")
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
            Bucket("nft")
            "${accountAddressFrom}"
            Decimal("${inputValue2}");
          CALL_METHOD
            Address("${accountAddressFrom}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
            `;
        break;   
        case 'repay':
          code = `
          CALL_METHOD
            Address("${accountAddressFrom}")
            "withdraw"    
            Address("${lnd_resourceAddress}")
            Decimal("1");
          TAKE_FROM_WORKTOP
            Address("${lnd_resourceAddress}")
            Decimal("1")
            Bucket("nft");  
          CALL_METHOD
            Address("${accountAddressFrom}")
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
            Bucket("nft")
            "${accountAddressFrom}";
          CALL_METHOD
            Address("${accountAddressFrom}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
            `;
        break;        
        case 'fund':
          code = `
          CALL_METHOD
            Address("${accountAddressFrom}")
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
            Address("${accountAddressFrom}")
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
createTransactionOnButtonClick('unregister', 'unregister', 'unregisterTxResult');
createTransactionOnClick('lendTokens', 'numberOfTokens', 'accountAddress', 'lend_tokens', 'lendTxResult');
createTransactionOnClick('takes_back', 'numberOfLndTokens', 'accountAddress', 'takes_back', 'takeBackTxResult');

createTransactionOnClick('borrow', 'numberOfRequestedXrdTokens', 'expectedBorrowLength','borrow', 'borrowTxResult');
createTransactionOnClick('repay', 'numberOfRepaiedXrdTokens', 'accountAddress', 'repay', 'repayTxResult');

createTransactionOnClick('fundDevelopment', 'numberOfFundedTokens', 'accountAddress', 'fund', 'fundTxResult');


function extractErrorMessage(inputString) {
  const regex = /PanicMessage\("([^@]*)@/;
  const match = regex.exec(inputString);
  if (match && match[1]) {
    return match[1];
  } else {
    return "No match found";
  }
}

import { RadixDappToolkit, DataRequestBuilder, RadixNetwork, NonFungibleIdType, OneTimeDataRequestBuilder } from '@radixdlt/radix-dapp-toolkit'
import { fetchMainPoolSize, fetchLendingPoolSize, fetchUserPosition, fetchComponentConfig } from './gateway.js'; // Adjust the path accordingly
import { rdt } from './gateway'; // Adjust the path accordingly


// You can create a dApp definition in the dev console at https://stokenet-console.radixdlt.com/dapp-metadata 
// then use that account for your dAppId
// Set an environment variable to indicate the current environment
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
  //  'account_tdx_2_12870m7gklv3p90004zjnm39jrhpf2vseejrgpncptl7rhsagz8yjm9';
  networkId = RadixNetwork.Stokenet;
}
gwUrl = import.meta.env.VITE_GATEWAY_URL;
console.log("gw url (index.js): ", gwUrl)
console.log("networkId (index.js): ", networkId)

// console.log("dApp Toolkit: ", rdt)

// Global states
let componentAddress = import.meta.env.VITE_COMP_ADDRESS //LendingDApp component address on stokenet
// You receive this badge(your resource address will be different) when you instantiate the component
let admin_badge = import.meta.env.VITE_ADMIN_BADGE
let owner_badge = import.meta.env.VITE_OWNER_BADGE
let lnd_resourceAddress = import.meta.env.VITE_LND_RESOURCE_ADDRESS // XRD lender badge manager
let lnd_tokenAddress = import.meta.env.VITE_LND_TOKEN_ADDRESS // LND token resource address

let xrdAddress = import.meta.env.VITE_XRD //Stokenet XRD resource address

console.log("componentAddress(index.js): ", componentAddress)
// console.log("rdt(index.js): ", rdt)

// Additional function to execute on successful transaction
function handleTransactionSuccess(result) {
  // Your code here
  console.log('Transaction successful');
  // Call other functions or perform actions as needed
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
    console.log(`got inputValue = `, inputValue);
    console.log(`got inputValue2 = `, inputValue2);
    console.log(`accountAddress = `, accountAddressFrom);

    const manifest = generateManifest(method, inputValue, inputValue2);
    console.log(`${method} manifest`, manifest);

    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    if (result.isErr()) {
      console.log(`${method} User Error: `, result.error);
      document.getElementById(errorField).textContent = extractErrorMessage(result.error.message);
      // Highlight in red color
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
      console.log(`${method} User Error: `, result.error);
      document.getElementById(errorField).textContent = extractErrorMessage(result.error.message);
      // Highlight in red color
      document.getElementById(errorField).style.color = "red";
      throw result.error;
    }

    // await fetchUserPosition(accountAddress);
  };
}

// ***** Utility function *****
function generateManifest(method, inputValue, inputValue2) {
  let code;
  let accAdd;
  let accountAddressFrom = document.getElementById('accountAddress').value;
  switch (method) {
    case 'lend_tokens':
      accAdd = inputValue2;
      code = `
        CALL_METHOD
          Address("${accAdd}")
          "withdraw"    
          Address("${xrdAddress}")
          Decimal("${inputValue}");
        TAKE_ALL_FROM_WORKTOP
          Address("${xrdAddress}")
          Bucket("xrd");
        CALL_METHOD
          Address("${accAdd}")
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
          Address("${accAdd}")
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
      accAdd = inputValue2;
      code = `
        CALL_METHOD
          Address("${accAdd}")
          "withdraw"    
          Address("${lnd_tokenAddress}")
          Decimal("${inputValue}");
        TAKE_FROM_WORKTOP
          Address("${lnd_tokenAddress}")
          Decimal("${inputValue}")
          Bucket("loan");
        CALL_METHOD
          Address("${accAdd}")
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
          Address("${accAdd}")
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
          accAdd = accountAddressFrom;
          //I am getting the accountAddress from the method's signature
          code = `
          CALL_METHOD
            Address("${accAdd}")
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
            "${accAdd}"
            Decimal("${inputValue2}");
          CALL_METHOD
            Address("${accAdd}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
            `;
        break;   
        case 'repay':
          accAdd = inputValue2;
          //I am getting the accountAddress from the method's signature
          code = `
          CALL_METHOD
            Address("${accAdd}")
            "withdraw"    
            Address("${lnd_resourceAddress}")
            Decimal("1");
          TAKE_FROM_WORKTOP
            Address("${lnd_resourceAddress}")
            Decimal("1")
            Bucket("nft");  
          CALL_METHOD
            Address("${accAdd}")
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
            "${accAdd}";
          CALL_METHOD
            Address("${accAdd}")
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

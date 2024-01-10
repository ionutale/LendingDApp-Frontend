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

// Global states
let componentAddress = import.meta.env.VITE_COMP_ADDRESS //LendingDApp component address on stokenet
// You receive this badge(your resource address will be different) when you instantiate the component
let admin_badge = import.meta.env.VITE_ADMIN_BADGE
let owner_badge = import.meta.env.VITE_OWNER_BADGE
let lnd_resourceAddress = import.meta.env.VITE_LND_RESOURCE_ADDRESS // XRD lender badge manager
let lnd_tokenAddress = import.meta.env.VITE_LND_TOKEN_ADDRESS // LND token resource address

let lnd_staffBadgeAddress = import.meta.env.VITE_STAFF_BADGE_ADDRESS

let xrdAddress = import.meta.env.VITE_XRD //Stokenet XRD resource address

let accountAddress
let accountName
let inputValue
let openBorrowing

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


// ************ Utility Function (Gateway) *****************
function generatePayload(method, address, type) {
  let code;
  switch (method) {
    case 'ComponentConfig':
      code = `{
        "addresses": [
          "${componentAddress}"
        ],
        "aggregation_level": "Global",
        "opt_ins": {
          "ancestor_identities": true,
          "component_royalty_vault_balance": true,
          "package_royalty_vault_balance": true,
          "non_fungible_include_nfids": true,
          "explicit_metadata": [
            "name",
            "description"
          ]
        }
      }`;
    break;
    case 'UserPosition':
      code = `{
        "addresses": [
          "${accountAddress}"
        ],
        "aggregation_level": "Vault",
        "opt_ins": {
          "ancestor_identities": true,
          "component_royalty_vault_balance": true,
          "package_royalty_vault_balance": true,
          "non_fungible_include_nfids": true,
          "explicit_metadata": [
            "name",
            "description"
          ]
        }
      }`;
    break;    
    // Add more cases as needed
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
  return code;
}

function getLateBorrowers(data) {
  const borrowersAccountsField = data.details.state.fields.find(field => field.field_name === "borrowers_accounts");
  console.log("borrowers_accounts:", borrowersAccountsField);

  // Check if the "borrowers_accounts" field exists
  if (borrowersAccountsField) {
    // Assuming each element is a Tuple with "fields" property
    const rootFields = borrowersAccountsField.elements.map(element => {
      // Assuming each element has "fields" property
      return element.fields;
    });

    console.log("rootFields:", rootFields);

    // Check if the "rootFields" array is not empty
    if (rootFields.length > 0) {
      // Assuming each "fields" has an array of items with a "value" field
      const elementsFieldsArray = rootFields
        .flatMap(item => item) // Flatten the array of arrays
        .map(innerItem => innerItem.value);

      // console.log("elementsFieldsArray:", elementsFieldsArray);

      // Return the extracted values
      return elementsFieldsArray;
    }
  }
}

// ***** Main function (method = not needed) *****
function createAskRepayTransactionOnClick(method) {
  document.getElementById(method).onclick = async function () {
    let amountPerRecipient = 1;
    let amount = 3;
    let resourceAddress = lnd_staffBadgeAddress;

    // Define the data to be sent in the POST request.
    const requestData = generatePayload("ComponentConfig", "", "Global");

    // Make an HTTP POST request to the gateway
    fetch('https://stokenet.radixdlt.com/state/entity/details', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: requestData,
    })
    .then(response => response.json()) // Assuming the response is JSON data.
    .then(data => { 
      const json = data.items ? data.items[0] : null;
      //get open borrowing
      const openBorrowing = getLateBorrowers(json);
      console.log("[admin] fetch openBorrowing:", openBorrowing.length);
      let amount = openBorrowing.length;
      let depositToRecipients = openBorrowing
        .map((recipientAddress, index) => `
          TAKE_FROM_WORKTOP
              Address("${resourceAddress}")
              Decimal("${amountPerRecipient}")
              Bucket("bucket_${index}")
          ;
          CALL_METHOD
              Address("${recipientAddress}")
              "try_deposit_or_abort"
              Bucket("bucket_${index}")
              Enum<0u8>()
          ;`)
        .join('');
        const transactionManifest = `
          CALL_METHOD
            Address("${accountAddress}")
            "withdraw"
            Address("${resourceAddress}")
            Decimal("${amount}")
        ;
          ${depositToRecipients}`;
    
        console.log(`transactionManifest = `,    transactionManifest);

        const result = rdt.walletApi.sendTransaction({
          transactionManifest: transactionManifest,
          version: 1,
        });
        if (result.isErr()) {
          console.log(`${method} User Error: `, result.error);
          throw result.error;
        }
        return transactionManifest;
      })
      .catch(error => {
          console.error('Error fetching data:', error);
      });
  };
}

// class BondHolder {
//   constructor(nonFungibleId, vaultAddresses, resourceAddress, address, holderAddress) {
//     this.nonFungibleId = nonFungibleId;
//     this.vaultAddresses = vaultAddresses;
//     this.resourceAddress = resourceAddress;
//     this.address = address;
//     this.holderAddress = holderAddress;
//   }
// }

function fetchDataAndNftId() {
  let selectedNfResource = lnd_staffBadgeAddress;
  let nftHolders = [];
  let selectedFromAccount = 'idontknow';
  nftHolders =
      rdt.gatewayApi.state
        .getNonFungibleIds(selectedNfResource)
        .then(({ items: ids }) => {
          return rdt.gatewayApi.state
            .getNonFungibleLocation(selectedNfResource, ids)
            .then((locationResponse) => {
              const vaultAddresses = locationResponse
                .map((item) => item.owning_vault_address);
                // .filter((item): item is string => !!item);

              const locationMap = locationResponse.reduce((acc, item, index) => {
                if (item.owning_vault_address) {
                  if (acc[item.owning_vault_address]) acc[item.owning_vault_address].push(item);
                  else acc[item.owning_vault_address] = [item];
                }
                return acc;
              }, {});

              return rdt.gatewayApi.state
                .getEntityDetailsVaultAggregated(vaultAddresses, {
                  ancestorIdentities: true
                })
                .then((entityDetailResponse) => {
                  return entityDetailResponse
                    .map((item) => {
                      const items = locationMap[item.address];

                      return items.map(({ non_fungible_id: nonFungibleId }) => ({
                        nonFungibleId,
                        vaultAddresses: item.address,
                        resourceAddress: selectedNfResource,
                        address: `${selectedNfResource}:${nonFungibleId}`,
                        holderAddress: item.ancestor_identities.owner_address
                      }));
                    })
                    .flat(2);
                })
                .then((items) => {
                  return items.filter((item) => item.holderAddress !== selectedFromAccount);
                });
            });
        });
  return nftHolders;
}

// ***** Main function (method = not needed) *****
function createReleaseLateBorrowersTransactionOnClick(method) {
  document.getElementById(method).onclick = async function () {
    let resourceAddress = lnd_staffBadgeAddress;

    let nftHoldersPromise = fetchDataAndNftId(resourceAddress);
    nftHoldersPromise.then(firstResult => {
      let nftHolders = firstResult;
      // Now you can work with the result
      const nftsToRecall = nftHolders.map((item) => ({
        vaultAddress: item.vaultAddresses,
        nftId: item.nonFungibleId
      }));
      
      const recallNfts = nftsToRecall
        .map(
          ({ vaultAddress, nftId: nftId }) => `
          RECALL_NON_FUNGIBLES_FROM_VAULT 
              Address("${vaultAddress}") 
              Array<NonFungibleLocalId>(
                  NonFungibleLocalId("${nftId}"),
              )
          ;
          `
        )
        .join('');
    
      const NonFungibleLocalIds = nftsToRecall
        .map(({ nftId: nftId }) => `NonFungibleLocalId("${nftId}")`)
        .join(', ');
    
      let transactionManifest =  `
      CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_amount"
          Address("${admin_badge}")
          Decimal("1");
      ${recallNfts}
      TAKE_NON_FUNGIBLES_FROM_WORKTOP
          Address("${resourceAddress}")
          Array<NonFungibleLocalId>(
              ${NonFungibleLocalIds}
          )
          Bucket("bucket_of_bonds")
      ;
      CALL_METHOD
          Address("${accountAddress}")
          "try_deposit_or_abort"
          Bucket("bucket_of_bonds")
          Enum<0u8>()
      ;`;
      console.log(`transactionManifest = `,    transactionManifest);
  
      const result = rdt.walletApi.sendTransaction({
        transactionManifest: transactionManifest,
        version: 1,
      });
      if (result.isErr()) {
        console.log(`${method} User Error: `, result.error);
        throw result.error;
      }
    })
    .catch(error => {
      console.error("[admin] Error:", error);
    });
  };
}

// ***** Main function (elementId = divId del button, inputTextId = divId del field di inserimento, method = scrypto method) *****
function createTransactionOnClick(elementId, inputTextId, method) {
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
      throw result.error;
    }
  };
}

function generateManifest(method, inputValue) {
  let code;
  switch (method) {
    case 'withdraw_earnings':
      code = ` 
        CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_amount"    
          Address("${owner_badge}")
          Decimal("1");  
        CALL_METHOD
          Address("${componentAddress}")
          "withdraw_earnings"
          Decimal("${inputValue}");
        CALL_METHOD
          Address("${accountAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
        `;
    break;
    case 'set_period_length':
      code = ` 
        CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_amount"    
          Address("${admin_badge}")
          Decimal("1");
        CALL_METHOD
          Address("${componentAddress}")
          "set_period_length"
          Decimal("${inputValue}");
        CALL_METHOD
          Address("${accountAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
       `;
    break;
    case 'mint_staff_badge':
      code = ` 
        CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_amount"    
          Address("${admin_badge}")
          Decimal("1");
        CALL_METHOD
          Address("${componentAddress}")
          "mint_staff_badge"
          "${inputValue}";
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
    case 'extend_borrowing_pool':
      code = ` 
        CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_amount"    
          Address("${admin_badge}")
          Decimal("1");
        CALL_METHOD
          Address("${componentAddress}")
          "extend_borrowing_pool"
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
    // Add more cases as needed
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return code;
}


// Usage
createTransactionOnClick('WithdrawEarnings', 'numberOfEarnedToken', 'withdraw_earnings');
createTransactionOnClick('mintStaffBadge', 'staffUsername', 'mint_staff_badge');
createTransactionOnClick('setPeriodLength', 'periodLength', 'set_period_length');
createTransactionOnClick('extendLendingPool', 'extendLendingPoolAmount', 'extend_lending_pool');
createTransactionOnClick('extendBorrowingPool', 'extendBorrowingPoolAmount', 'extend_borrowing_pool');
createTransactionOnClick('setReward', 'reward', 'set_reward');
createTransactionOnClick('setInterest', 'interest', 'set_interest');
createTransactionOnClick('fundMainPool', 'numberOfFundedTokens', 'fund_main_pool');

createAskRepayTransactionOnClick('askRepay');
createReleaseLateBorrowersTransactionOnClick('releaseLateBorrowers');




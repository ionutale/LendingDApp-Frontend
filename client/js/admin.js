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

  // console.log("[admin] fetch openBorrowing:");
  // openBorrowing = fetchExtraData(componentAddress);
  // console.log("[admin] saved openBorrowing:", openBorrowing);
})

// affected_global_entities: Array(9)
// 0: "transactiontracker_tdx_2_1stxxxxxxxxxxtxtrakxxxxxxxxx006844685494xxxxxxxxxxzw7jp"
// 1: "account_tdx_2_12ya8a0w6dwas8ax8fg9zjc8znr0ymf3a32wysz9epnqar4fle0ldln"
// 2: "component_tdx_2_1cz8wr0jt4z8r4qkfmtw080xvcn8hyaes9xn28l7v2j2zlrds7xgecf"
// 3: "resource_tdx_2_1t5526ghgtz0rkna5hs7tz2w08mwkx57xf8t0qyde926nd4vdu0txsc"
// 4: "resource_tdx_2_1t552x02v6ae34yeznhp0ap9w9je2qvc23zgn9t8reufdgqmqe6qjaq"
// 5: "resource_tdx_2_1ntxjnrzt532cklvus3q68ar8ldp74w8gf7vj7td3ajvqflhcw53dmx"
// 6: "resource_tdx_2_1t4plje7qjldqyznxvlq626ej868w58talk5d2w08ukkgcjpcd5vsq2"
// 7: "resource_tdx_2_1nt47w2ag5a9fl3mk86493rwnfy9q7lxdx9jwm87twg5694gvrslksy"
// 8: "consensusmanager_tdx_2_1scxxxxxxxxxxcnsmgrxxxxxxxxx000999665565xxxxxxxxxv6cg29"
// 
// transaction of the previous component creation is 
//
// https://stokenet-dashboard.radixdlt.com/transaction/txid_tdx_2_1cvvnt45pxylx55kyz7v5nculdtcqjfetmv0u5juahrnvdgsppn5qmh83e2/details
// there you can find the same list of created entities
// 
// this is an example of a removal
// https://stokenet-dashboard.radixdlt.com/transaction/txid_tdx_2_1agezmpcyggzcn400nxxyej6r3px0c6sd4jswkpyhpculd5l4mu3s70d9l4/summary 


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
      console.log("[admin] fetch openBorrowing:", openBorrowing);
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

class BondHolder {
  constructor(nonFungibleId, vaultAddresses, resourceAddress, address, holderAddress) {
    this.nonFungibleId = nonFungibleId;
    this.vaultAddresses = vaultAddresses;
    this.resourceAddress = resourceAddress;
    this.address = address;
    this.holderAddress = holderAddress;
  }
}


// *********** Fetch User NFT Metadata Information (/non-fungible/ids) (Gateway Utility) ***********
async function fetchNonFungibleCollectionIds(resourceAddress) {
  // Define the data to be sent in the GET request.
  const requestData = `{
    "resource_address": "${resourceAddress}"
  }`;
  // Make an HTTP POST request to the gateway
  fetch('https://stokenet.radixdlt.com/state/non-fungible/ids', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: requestData,
  })
  .then(response => response.json()) 
  .then(data => { 
    // Extracting values from the nested structure
    const nftIds = [];
    console.info('fetchNonFungibleCollectionIds:', data);
    data.non_fungible_ids.forEach((id) => {
      id.data.programmatic_json.fields.forEach((field) => {
        const { field_name, value } = field;
        nftIds.push({ field_name, value });
      });
    });
    return nftIds;
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}


// *********** Fetch User NFT Metadata Information (/non-fungible/location) (Gateway Utility) ***********
async function fetchNonFungibleLocation(resourceAddress, items) {
  // Define the data to be sent in the GET request.
  const requestData = `{
    "resource_address": "${resourceAddress}",
    "non_fungible_ids": [
      "${items}"
    ]
  }`;
  // Make an HTTP POST request to the gateway
  fetch('https://stokenet.radixdlt.com/state/non-fungible/location', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: requestData,
  })
  .then(response => response.json()) 
  .then(data => { 
    // Extracting values from the nested structure
    const nftIds = [];

    data.non_fungible_ids.forEach((id) => {
      id.data.programmatic_json.fields.forEach((field) => {
        const { field_name, value } = field;
        nftIds.push({ field_name, value });
      });
    });
    return nftIds;
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}

function test() {
  let selectedNfResource = lnd_staffBadgeAddress;
  let selectedBondHolders = [];
  let selectedFromAccount = 'idontknow';
  selectedBondHolders =
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
                      console.log("[admin] items:", items);

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
                  console.log("[admin] items:", items);
                  let bondHolders = items.filter((item) => item.holderAddress !== selectedFromAccount);
                  console.log("[admin] bondHolders:", bondHolders);
                  return bondHolders;
                });
            });
        });
  console.log("[admin] selectedBondHolders:", selectedBondHolders);
  return selectedBondHolders;
}

// ***** Main function (method = not needed) *****
function createReleaseLateBorrowersTransactionOnClick(method) {
  document.getElementById(method).onclick = async function () {
    let amountPerRecipient = 1;
    let amount = 3;
    let resourceAddress = lnd_staffBadgeAddress;
    let proofResourceAddress = admin_badge;

    //TODO
    // let nftIds = fetchNonFungibleCollectionIds(resourceAddress);
    // let vaultAddresses = fetchNonFungibleLocation(resourceAddress, nftIds);

    let id1 = "d6b59793cf570363-16103b0852d02395-8393196644fd636b-ef89d3bea34eb579";
    let acc1 = "account_tdx_2_128gpncka85tmpztygfc7ewjrzvvgyc9mlnc47uxtxlk0av0ngp2anz";
    let id4 = "a04d4446076e440b-c16c11b7ddb86c34-46363fdf833b8dfa-cbd30e60fee42902";
    let acc4 = "account_tdx_2_12y0nsx972ueel0args3jnapz9qtexyj9vpfqtgh3th4v8z04zht7jl";
    let id5 = "21ceb961cc9d41a6-a88e545f31c571b4-2353abb9a4b2b5cf-f72335cffe60b348";
    let acc5 = "account_tdx_2_129ukpx6au0ww4d5yfhhxzs9y7jurzad36qvu7c55pucsq5d52gcelf";
    let bondHolders0 = [
      new BondHolder(id4, "vault2", resourceAddress, id1, acc4),
      new BondHolder(id5, "vault2", resourceAddress, id1, acc5)
      // ... more instances as needed
    ];
    let bondHoldersPromise = test(resourceAddress);
    let bondHolders = bondHoldersPromise.then(firstResult => {
      console.log("[admin] bondHoldersPromise:", firstResult);
      let bondHolders = firstResult;
      // Now you can work with bondHolders
      console.log("[admin] bondHolders:", bondHolders);

      const bondsToRecall = bondHolders.map((item) => ({
        vaultAddress: item.vaultAddresses,
        bondNftId: item.nonFungibleId
      }));
      console.log("[admin] bondsToRecall:", bondsToRecall);
      
      const recallBonds = bondsToRecall
        .map(
          ({ vaultAddress, bondNftId }) => `
          RECALL_NON_FUNGIBLES_FROM_VAULT 
              Address("${vaultAddress}") 
              Array<NonFungibleLocalId>(
                  NonFungibleLocalId("${bondNftId}"),
              )
          ;
          `
        )
        .join('');
      console.log("[admin] recallBonds:", recallBonds);
    
      const NonFungibleLocalIds = bondsToRecall
        .map(({ bondNftId }) => `NonFungibleLocalId("${bondNftId}")`)
        .join(', ');
      console.log("[admin] NonFungibleLocalIds:", NonFungibleLocalIds);
    
      //TODO perchè nella v. originale era NonFungibleLocalId("${proofId}")
      //ho sostituito con ${NonFungibleLocalIds}
      let transactionManifest =  `
      CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_amount"
          Address("${admin_badge}")
          Decimal("1");
      ${recallBonds}
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

    // console.log("[admin] bondHolders type:", Array.isArray(bondHolders) ? "Array" : "Not an Array");
    // console.log("[admin] First element:", bondHolders[0]);
    // console.log("[admin] create tx manifest:", bondHolders);
    




    


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
      console.log("[admin] fetch openBorrowing:", openBorrowing);

      const bondsToRecall = bondHolders.map((item) => ({
        vaultAddress: item.vaultAddresses,
        bondNftId: item.nonFungibleId
      }));
      
      const recallBonds = bondsToRecall
        .map(
          ({ vaultAddress, bondNftId }) => `
          RECALL_NON_FUNGIBLES_FROM_VAULT 
              Address("${vaultAddress}") 
              Array<NonFungibleLocalId>(
                  NonFungibleLocalId("${bondNftId}"),
              )
          ;
          `
        )
        .join('');
    
      const NonFungibleLocalIds = bondsToRecall
        .map(({ bondNftId }) => `NonFungibleLocalId("${bondNftId}")`)
        .join(', ');
    
      let transactionManifest =  `
      CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_non_fungibles"
          Address("${proofResourceAddress}")
          Array<NonFungibleLocalId>(
              NonFungibleLocalId("${proofId}")
          )
      ;
      ${recallBonds}
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
      return transactionManifest;

    })
    .catch(error => {
        console.error('Error fetching data:', error);
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


function generateAskRepayManifest(method) {
  let code;
  switch (method) {
    case 'askRepay':
      code = ` 
        CALL_METHOD
          Address("${accountAddress}")
          "create_proof_of_amount"    
          Address("${owner_badge}")
          Decimal("1");  
        CALL_METHOD
          Address("${componentAddress}")
          "asking_repay"
          Decimal("${inputValue}");
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




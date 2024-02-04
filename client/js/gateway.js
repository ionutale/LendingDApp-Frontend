import { RadixDappToolkit, DataRequestBuilder, RadixNetwork, NonFungibleIdType } from '@radixdlt/radix-dapp-toolkit'
// You can create a dApp definition in the dev console at https://stokenet-console.radixdlt.com/dapp-metadata 
// then use that account for your dAppId
// Set an environment variable to indicate the current environment
const environment = process.env.NODE_ENV || 'Stokenet'; // Default to 'development' if NODE_ENV is not set
console.log("environment (gateway.js): ", environment)
// Define constants based on the environment
let dAppId, networkId, gwUrl;

if (environment == 'production') {
  dAppId = import.meta.env.VITE_DAPP_ID
  networkId = RadixNetwork.Mainnet;
  gwUrl = import.meta.env.VITE_GATEWAY_URL;
} else {
  // Default to Stokenet configuration
  dAppId = import.meta.env.VITE_DAPP_ID
  networkId = RadixNetwork.Stokenet;
  gwUrl = import.meta.env.VITE_GATEWAY_URL;
}
console.log("gw url (gateway.js): ", gwUrl)
console.log("networkId (gateway.js): ", networkId)

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

  //fetch pool size
  fetchMainPoolSize(componentAddress, xrdAddress);
  fetchLendingPoolSize(componentAddress, xrdAddress);
  //fetch nft metadata info of the connected user
  fetchUserPosition(accountAddress);
  //get config parameter of the component
  fetchComponentConfig(componentAddress);
})


// *********** Fetch Component Config (/state/entity/details) (Gateway) ***********
async function fetchComponentConfig(componentAddress) {
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

    const currentEpoch = data.ledger_state.epoch;
    const rewardValue = getReward(json);
    const interestValue = getInterest(json);
    const rewardTypeValue = getRewardType(json);
    const periodLengthValue = getPeriodLength(json);
    const maxBorrowValue = getBorrowMaxLimit(json);
    //get open borrowing
    const openBorrowing = getOpenBorrowing(json);
    console.log("openBorrowing:", openBorrowing);

    // console.log("Reward:", rewardValue);
    // console.log("Period Length:", periodLengthValue);
    const rewardForYouConfig = document.getElementById("rewardForYou");
    const interestForYouConfig = document.getElementById("interestForYou");
    const rewardTypeConfig = document.getElementById("rewardType");
    // const periodLengthConfig = document.getElementById("periodLengthConfig");
    const borrowingsPoolConfig = document.getElementById("borrowingsPool");
    const borrowersConfig = document.getElementById("borrowers");
    const borrowersLink = document.getElementById('borrowers-link');
    rewardForYouConfig.textContent = rewardValue + '%';
    // periodLengthConfig.textContent = periodLengthValue;
    interestForYouConfig.textContent = interestValue + '%';
    rewardTypeConfig.textContent = rewardTypeValue;
    borrowingsPoolConfig.textContent = maxBorrowValue;

    // borrowersConfig.textContent = openBorrowing;
    // borrowersLink.href = 'https://stokenet-dashboard.radixdlt.com/account/'+openBorrowing+'/nfts';
    // document.getElementById("currentEpoch").textContent = currentEpoch;

    //TODO array
    // Call the function to update the links
    updateBorrowersLinks(openBorrowing);
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}

//for showing current borrowings
function updateBorrowersLinks(openBorrowingArray) {
  const borrowersLinksContainer = document.getElementById('borrowers-links-container');
  console.log('Container:', borrowersLinksContainer);

  // Clear existing content in the container
  borrowersLinksContainer.innerHTML = '';

  // Iterate through the openBorrowingArray and create links for each borrower
  openBorrowingArray.forEach(borrower => {
    const link = createBorrowerLink(borrower);

    // Append the link to the container
    borrowersLinksContainer.appendChild(link);
  });
}

//for showing current borrowings
function createBorrowerLink(borrower) {
  // Create a new list item for each link
  const listItem = document.createElement('li');

  // Create a new link element
  const link = document.createElement('a');
  
  // Set attributes for the link
  link.href = 'https://stokenet-dashboard.radixdlt.com/account/' + borrower + '/nfts';
  link.target = '_new';
  link.className = 'number'; // Apply the same styling as the original link
  link.innerText = borrower.substring(borrower.length-10);

  // Create a div for each link
  // const div = document.createElement('div');
  // div.textContent = borrower; // Set the text content to the borrower value

  // Append the div to the link
  // link.appendChild(div);

  // Append the link to the list item
  listItem.appendChild(link);

  return listItem;
}



function getCurrentEpoch(data) {
  const currentEpoch = data.details.state.fields.find(field => field.field_name === "reward");
  return currentEpoch ? currentEpoch.value : null;
}

function getReward(data) {
  const rewardField = data.details.state.fields.find(field => field.field_name === "reward");
  return rewardField ? rewardField.value : null;
}

function getInterest(data) {
  const rewardField = data.details.state.fields.find(field => field.field_name === "interest");
  return rewardField ? rewardField.value : null;
}

function getRewardType(data) {
  const rewardField = data.details.state.fields.find(field => field.field_name === "reward_type");
  return rewardField ? rewardField.value : null;
}

function getPeriodLength(data) {
  const periodLengthField = data.details.state.fields.find(field => field.field_name === "period_length");
  return periodLengthField ? periodLengthField.value : null;
}

function getBorrowMaxLimit(data) {
  const rewardField = data.details.state.fields.find(field => field.field_name === "max_borrowing_limit");
  return rewardField ? rewardField.value : null;
}

function getOpenBorrowing(data) {
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

      console.log("elementsFieldsArray:", elementsFieldsArray);

      // Return the extracted values
      return elementsFieldsArray;
    }
  }

  // Return an empty array if something went wrong or the structure is not as expected
  return [];
}


// function getOpenBorrowing(data) {
//     const borrowersAccountsField = data.details.state.fields.find(field => field.field_name === "borrowers_accounts");
//     console.log("borrowers_accounts:", borrowersAccountsField);
//     // Check if the "borrowers_accounts" field exists
//     if (borrowersAccountsField) {
//       // Find all elements with "field_name" equal to "fields"
//       const rootFields = borrowersAccountsField.elements
//         // .filter(element => element.field_name === "fields")
//         .map(element => element.fields); // Extract the "elements" property
//       console.log("rootFields:", rootFields);

//       // Check if the "rootFields" array is not empty
//       if (rootFields.length > 0) {
//         // Assuming each "fields" has an array of items
//         const elementsFieldsArray = rootFields.map(item => item.value ); 
//         console.log("elementsFieldsArray:", elementsFieldsArray);
//         // Return the extracted values
//         return elementsFieldsArray;
//       }
//   }
// }


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


// *********** Fetch User NFT Metadata Information (/entity/details) (Gateway) ***********
async function fetchUserPosition(accountAddress) {
  // Define the data to be sent in the POST request.
  const requestData = generatePayload("UserPosition", "", "Vault");

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
      const resourceAddress = `${lnd_resourceAddress}`;
      const result = getVaultsByResourceAddress(data, resourceAddress);
      console.log(" NFT id " + JSON.stringify(result));
      const itemsArray = result[0].items

      // Loop through itemsArray and make GET requests for each item
      itemsArray.forEach(async (item) => {
        await fetchNftMetadata(resourceAddress, item);
      });
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}

// *********** Fetch User NFT Metadata Information (Filtering response) (Gateway Utility) ***********
function getVaultsByResourceAddress(jsonData, resourceAddress) {
  const items = jsonData.items || [];
  // Filter items based on the resource_address
  const filteredItems = items.filter(item => {
    return (
      item.non_fungible_resources &&
      item.non_fungible_resources.items &&
      item.non_fungible_resources.items.length > 0 &&
      item.non_fungible_resources.items.some(
        resource =>
          resource.resource_address &&
          resource.resource_address === resourceAddress
      )
    );
  });

  // Extract vaults from the filtered items
  const vaults = filteredItems.reduce((result, item) => {
    if (
      item.non_fungible_resources &&
      item.non_fungible_resources.items &&
      item.non_fungible_resources.items.length > 0
    ) {
      const matchingResources = item.non_fungible_resources.items.filter(
        resource =>
          resource.resource_address &&
          resource.resource_address === resourceAddress
      );
      
      matchingResources.forEach(resource => {
        console.log(" matchingResources " + JSON.stringify(resource));
        if (resource.vaults && resource.vaults.total_count > 0) {
          result.push(...resource.vaults.items);
        }
      });
    }
    return result;
  }, []);

  return vaults;
}

// *********** Fetch User NFT Metadata Information (/non-fungible/data) (Gateway Utility) ***********
async function fetchNftMetadata(resourceAddress, item) {
  // Define the data to be sent in the GET request.
  const requestData = `{
    "resource_address": "${resourceAddress}",
    "non_fungible_ids": [
      "${item}"
    ]
  }`;

  // Make an HTTP POST request to the gateway
  fetch('https://stokenet.radixdlt.com/state/non-fungible/data', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: requestData,
  })
  .then(response => response.json()) 
  .then(data => { 
    // Extracting values from the nested structure
    const extractedValues = [];

    data.non_fungible_ids.forEach((id) => {
      id.data.programmatic_json.fields.forEach((field) => {
        const { field_name, value } = field;
        extractedValues.push({ field_name, value });
      });
    });

    // Find the elements by their IDs
    const amountLiquidityFundedDiv = document.getElementById("amountLiquidityFunded");
    const epochLiquidityFundedDiv = document.getElementById("epochLiquidityFunded");
    const epochLiquidityReedemedDiv = document.getElementById("epochLiquidityReedemed");
    //borrow id
    const amountBorrowingsDiv = document.getElementById("amountBorrowings");
    const epochBorrowDiv = document.getElementById("epochBorrow");
    const expectedEpochBorrowDiv = document.getElementById("expectedEpochBorrow");
    const epochRepayDiv = document.getElementById("epochRepay");
    //next epoch
    //const epochLiquidityNextDiv = document.getElementById("epochLiquidityNext");
    // Find the input element by its ID
    const numberOfTokensInput = document.getElementById("numberOfTokens");

    // Update the content of the div elements (lend)
    amountLiquidityFundedDiv.textContent = extractedValues.find(field => field.field_name === "amount").value;
    const startLendingEpochValue = parseFloat(extractedValues.find(field => field.field_name === "start_lending_epoch").value) || 0;;
    epochLiquidityFundedDiv.textContent = startLendingEpochValue;
    epochLiquidityReedemedDiv.textContent = extractedValues.find(field => field.field_name === "end_lending_epoch").value
    // Update the content of the div elements (borrow)
    amountBorrowingsDiv.textContent = extractedValues.find(field => field.field_name === "borrow_amount").value;
    const epochBorrowValue = parseFloat(extractedValues.find(field => field.field_name === "start_borrow_epoch").value) || 0;;
    epochBorrowDiv.textContent = epochBorrowValue;
    const expectedEpochBorrowValue = parseFloat(extractedValues.find(field => field.field_name === "expected_end_borrow_epoch").value) || 0;;
    expectedEpochBorrowDiv.textContent = expectedEpochBorrowValue
    epochRepayDiv.textContent = extractedValues.find(field => field.field_name === "end_borrow_epoch").value
    // update the sum
    // const currentValueEpochLength = parseFloat(periodLengthConfig.textContent) || 0; 
    // const sumValue = startLendingEpochValue + currentValueEpochLength;
    // epochLiquidityNextDiv.textContent = sumValue;
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}



// *********** Fetch Main Pool size (Gateway) ***********
async function fetchMainPoolSize(component, xrdAddress) {
  // Define the data to be sent in the POST request.
  console.log('Request data for Main Pool size for component = ', `${component}`)
  const requestData = `{
      "address": "${component}",
      "resource_address": "${xrdAddress}"
  }`;
  console.log('Request data for Main Pool size', requestData)

  // Make an HTTP POST request to the gateway
  fetch('https://stokenet.radixdlt.com/state/entity/page/fungible-vaults/', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: requestData,
  })
  .then(response => response.json()) 
  .then(data => { 
      // Check if the response has 'items' and process them.
      if (data && data.items && Array.isArray(data.items)) {
          const amount = data.items.map(item => item.amount);
          document.getElementById('mainPool').innerText = JSON.stringify(amount);
      } else {
          console.error('Invalid response format.');
      }
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}

// *********** Fetch Lendings Pool size (Gateway) ***********
async function fetchLendingPoolSize(component, xrdAddress) {
  // Define the data to be sent in the POST request.
  const requestData = `{
    address: "${component}",
    "resource_address": "${lnd_tokenAddress}"
}`;

  // Make an HTTP POST request to the gateway
  fetch('https://stokenet.radixdlt.com/state/entity/page/fungible-vaults/', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: requestData,
  })
  .then(response => response.json()) 
  .then(data => { 
      // Check if the response has 'items' and process them.
      if (data && data.items && Array.isArray(data.items)) {
          const amount = data.items.map(item => item.amount);
          document.getElementById('lendinsPool').innerText = JSON.stringify(amount);
      } else {
          console.error('Invalid response format.');
      }
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}
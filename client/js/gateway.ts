import { RadixDappToolkit, DataRequestBuilder, RadixNetwork, createLogger, NonFungibleIdType } from '@radixdlt/radix-dapp-toolkit'

const environment = process.env.NODE_ENV || 'Stokenet'; // Default to 'development' if NODE_ENV is not set
console.log("environment (gateway.js): ", environment)
// Define constants based on the environment
let dAppId, networkId, gwUrl: string, dashboardUrl: string;

if (environment == 'production') {
  dAppId = import.meta.env.VITE_DAPP_ID
  networkId = RadixNetwork.Mainnet;
} else {
  // Default to Stokenet configuration
  dAppId = import.meta.env.VITE_DAPP_ID
  networkId = RadixNetwork.Stokenet;
}
gwUrl = import.meta.env.VITE_GATEWAY_URL;
dashboardUrl = import.meta.env.VITE_DASHBOARD_URL;
console.log("gw url (gateway.js): ", gwUrl)
console.log("dashboard url (gateway.js): ", dashboardUrl)

let rolaUrl = import.meta.env.VITE_ROLA_URL
// let rolaEnabled: Boolean = import.meta.env.VITE_ROLA_ENABLED
console.log("rola url (gateway.js): ", rolaUrl)

// Instantiate DappToolkit
export const rdt = RadixDappToolkit({
  dAppDefinitionAddress: dAppId,
  networkId: networkId,
  logger: createLogger(1),
  applicationName: 'Lending dApp',
  applicationVersion: '1.0.0'
  ,onDisconnect: () => {
    // clear your application state
    localStorage.removeItem('accountAddress')
    cleanUserPosition();
  }
});

// Global states
let componentAddress = import.meta.env.VITE_COMP_ADDRESS //LendingDApp component address on stokenet
let admin_badge = import.meta.env.VITE_ADMIN_BADGE
let owner_badge = import.meta.env.VITE_OWNER_BADGE
let lnd_resourceAddress = import.meta.env.VITE_LND_RESOURCE_ADDRESS // XRD lender badge manager
let lnd_tokenAddress = import.meta.env.VITE_LND_TOKEN_ADDRESS // LND token resource address

let xrdAddress = import.meta.env.VITE_XRD //Stokenet XRD resource address

let accountAddress: string | null;

  // ************ Fetch the user's account address (Page Load) ************
  rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1))
  // rdt.walletApi.setRequestData(
  //   DataRequestBuilder.persona().withProof(),
  //   DataRequestBuilder.accounts().atLeast(1).withProof()
  // )
  
  // Subscribe to updates to the user's shared wallet data
  const subscription = rdt.walletApi.walletData$.subscribe((walletData) => {
    accountAddress = walletData && walletData.accounts && walletData.accounts.length>0 ? walletData.accounts[0].address : null
    console.log("accountAddress : ", accountAddress)
    if (accountAddress!=null) {
      // document?.getElementById('accountAddress')?.value = accountAddress
      // const accountAddress = "exampleAddress"; // Example address, replace with your actual logic to get the address
      const element = document?.getElementById('accountAddress') as HTMLInputElement | null;
      if (element) {
          element.value = accountAddress ?? '';
      }

      // Store the accountAddress in localStorage
      localStorage.setItem('accountAddress', accountAddress);

      //fill smart contract and account positions 
      //fetch pool size
      fetchMainPoolSize(componentAddress, xrdAddress);
      fetchLendingPoolSize(componentAddress, xrdAddress);
      //fetch nft metadata info of the connected user
      fetchUserPosition(accountAddress);
      //get config parameter of the component
      fetchComponentConfig(componentAddress);
    }
  })


  // const getChallenge: () => Promise<string> = () =>
  // fetch(rolaUrl+'api/create-challenge', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': 'Basic ' + btoa('test:test') // Replace 'username' and 'password' with your actual credentials
  //     },
  //     body: JSON.stringify({
  //       "applicationName": "Trapezite",
  //       "dAppDefinitionAddress": "${dAppId}",
  //       "origin": "https://test.zerocollateral.eu/",
  //       "timeout": 60,
  //       "networkId": 1
  //     })
  //   })
  //     .then((res) => res.json())
  //     .then((res) => res.challenge);
      
  // if (rolaEnabled) {
  //   rdt.walletApi.provideChallengeGenerator(getChallenge)
  //   // const rolaResultElement = document.getElementById('rola-result')!
  //   rdt.walletApi.dataRequestControl(async ({ proofs }) => {
  //     await fetch(rolaUrl+'api/verify', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': 'Basic ' + btoa('test:test') // Replace 'username' and 'password' with your actual credentials
  //       },
  //       body: JSON.stringify(proofs),
  //     })
  //     .then((res): Promise<{ valid: boolean }> => res.json())
  //     .then((data) => {
  //       console.log("Rola verified : ", data.valid)
  //       // Assuming 'resultDiv' is the ID of the div where you want to display the response
  //       // rolaResultElement.textContent = JSON.stringify(data.valid);
  //     })
  //   })
  // }


// *********** Fetch Component Config (/state/entity/details) (Gateway) ***********
export async function fetchComponentConfig(_componentAddress: any) {
  // Define the data to be sent in the POST request.
  const requestData = generatePayload("ComponentConfig", "", "Global");

  // Make an HTTP POST request to the gateway
  fetch(gwUrl+'/state/entity/details', {
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
    //get late payers
    const openLatePayers = getLatePayers(json);
    console.log("openLatePayers:", openLatePayers);

    // console.log("Reward:", rewardValue);
    // console.log("Period Length:", periodLengthValue);
    const rewardForYouConfig = document.getElementById("rewardForYou");
    const interestForYouConfig = document.getElementById("interestForYou");
    const rewardTypeConfig = document.getElementById("rewardType");
    // const periodLengthConfig = document.getElementById("periodLengthConfig");
    const borrowingsPoolConfig = document.getElementById("borrowingsPool");
    const borrowersConfig = document.getElementById("borrowers");
    const borrowersLink = document.getElementById('borrowers-link');
    if (rewardForYouConfig) rewardForYouConfig.textContent = rewardValue + '%' ?? '';
    // rewardForYouConfig.textContent = rewardValue + '%';
    // periodLengthConfig.textContent = periodLengthValue;
    // interestForYouConfig.textContent = interestValue + '%';
    // rewardTypeConfig.textContent = rewardTypeValue;
    // borrowingsPoolConfig.textContent = maxBorrowValue;
    if (interestForYouConfig) interestForYouConfig.textContent = interestValue + '%' ?? '';
    if (rewardTypeConfig) rewardTypeConfig.textContent = rewardTypeValue ?? '';
    if (borrowingsPoolConfig) borrowingsPoolConfig.textContent = maxBorrowValue ?? '';

    updateBorrowersLinks(openBorrowing);
    updateLatePayersLinks(openLatePayers);
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}

//for showing current borrowings
function updateBorrowersLinks(openBorrowingArray: any[]) {
  const borrowersLinksContainer = document.getElementById('borrowers-links-container');

  // Clear existing content in the container
  // borrowersLinksContainer.innerHTML = '';
  if (borrowersLinksContainer) borrowersLinksContainer.innerHTML = '';

  // Iterate through the openBorrowingArray and create links for each borrower
  openBorrowingArray.forEach((borrower: any) => {
    const link = createBorrowerLink(borrower);

    // Append the link to the container
    if (borrowersLinksContainer) borrowersLinksContainer.appendChild(link);
  });
}

//for showing current borrowings
function createBorrowerLink(borrower: string) {
  // Create a new list item for each link
  const listItem = document.createElement('li');

  // Create a new link element
  const link = document.createElement('a');
  
  // Set attributes for the link
  link.href = dashboardUrl+'/account/' + borrower + '/nfts';
  link.target = '_new';
  link.className = 'number'; // Apply the same styling as the original link
  link.innerText = borrower.substring(borrower.length-10);

  // Append the link to the list item
  listItem.appendChild(link);

  return listItem;
}


//for showing current borrowings //to be reviewd and merged
function updateLatePayersLinks(openBorrowingArray: any[]) {
  const borrowersLinksContainer = document.getElementById('badpayers-links-container');

  // Clear existing content in the container
  // borrowersLinksContainer.innerHTML = '';
  if (borrowersLinksContainer) borrowersLinksContainer.innerHTML = '';

  // Iterate through the openBorrowingArray and create links for each borrower
  openBorrowingArray.forEach((borrower: any) => {
    const link = createBorrowerLink(borrower);

    // Append the link to the container
    if (borrowersLinksContainer) borrowersLinksContainer.appendChild(link);
  });
}

//for showing current late payers //to be reviewd and merged
function createLatePayersLink(borrower: string) {
  // Create a new list item for each link
  const listItem = document.createElement('li');

  // Create a new link element
  const link = document.createElement('a');
  
  // Set attributes for the link
  link.href = dashboardUrl+'/account/' + borrower + '/nfts';
  link.target = '_new';
  link.className = 'number'; // Apply the same styling as the original link
  link.innerText = borrower.substring(borrower.length-10);

  // Append the link to the list item
  listItem.appendChild(link);
  return listItem;
}

function getCurrentEpoch(data: { details: { state: { fields: any[]; }; }; }) {
  const currentEpoch = data.details.state.fields.find((field: { field_name: string; }) => field.field_name === "reward");
  return currentEpoch ? currentEpoch.value : null;
}

function getReward(data: { details: { state: { fields: any[]; }; }; }) {
  const rewardField = data.details.state.fields.find((field: { field_name: string; }) => field.field_name === "reward");
  return rewardField ? rewardField.value : null;
}

function getInterest(data: { details: { state: { fields: any[]; }; }; }) {
  const rewardField = data.details.state.fields.find((field: { field_name: string; }) => field.field_name === "interest");
  return rewardField ? rewardField.value : null;
}

function getRewardType(data: { details: { state: { fields: any[]; }; }; }) {
  const rewardField = data.details.state.fields.find((field: { field_name: string; }) => field.field_name === "reward_type");
  return rewardField ? rewardField.value : null;
}

function getPeriodLength(data: { details: { state: { fields: any[]; }; }; }) {
  const periodLengthField = data.details.state.fields.find((field: { field_name: string; }) => field.field_name === "period_length");
  return periodLengthField ? periodLengthField.value : null;
}

function getBorrowMaxLimit(data: { details: { state: { fields: any[]; }; }; }) {
  const rewardField = data.details.state.fields.find((field: { field_name: string; }) => field.field_name === "max_borrowing_limit");
  return rewardField ? rewardField.value : null;
}

function getOpenBorrowing(data: { details: { state: { fields: any[]; }; }; }) {
  const borrowersAccountsField = data.details.state.fields.find((field: { field_name: string; }) => field.field_name === "borrowers_accounts");
  console.log("borrowers_accounts:", borrowersAccountsField);

  // Check if the "borrowers_accounts" field exists
  if (borrowersAccountsField) {
    // Assuming each element is a Tuple with "fields" property
    const rootFields = borrowersAccountsField.elements.map((element: { fields: any; }) => {
      // Assuming each element has "fields" property
      return element.fields;
    });

    // Check if the "rootFields" array is not empty
    if (rootFields.length > 0) {
      // Assuming each "fields" has an array of items with a "value" field
      const elementsFieldsArray = rootFields
        .flatMap((item: any) => item) // Flatten the array of arrays
        .map((innerItem: { value: any; }) => innerItem.value);

      // Return the extracted values
      return elementsFieldsArray;
    }
  }
  // Return an empty array if something went wrong or the structure is not as expected
  return [];
}


function getLatePayers(data: { details: { state: { fields: any[]; }; }; }) {
  const borrowersAccountsField = data.details.state.fields.find((field: { field_name: string; }) => field.field_name === "late_payers_accounts");
  console.log("late_payers_accounts:", borrowersAccountsField);

  // Check if the "borrowers_accounts" field exists
  if (borrowersAccountsField) {
    // Extract values from the elements array
    const elements = borrowersAccountsField.elements;

    // Extract only the values from each element
    const values = elements.map((element: { value: string }) => element.value);

    // Return the vector with only the values
    return values;
  }
  // Return an empty array if something went wrong or the structure is not as expected
  return []
}


// ************ Utility Function (Gateway) *****************
function generatePayload(method: string, _address: string, _type: string) {
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
export async function fetchUserPosition(_accountAddress: string) {
  // Define the data to be sent in the POST request.
  const requestData = generatePayload("UserPosition", "", "Vault");

  // Make an HTTP POST request to the gateway
  fetch(gwUrl+'/state/entity/details', {
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
      //TODO controllare la presenza di items
      const itemsArray = result && result.length>0 ? result[0].items : null
      console.log(" itemsArray " + itemsArray);
      // Loop through itemsArray and make GET requests for each item
      itemsArray?.forEach(async (item: any) => {
        await fetchNftMetadata(resourceAddress, item);
      });
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}

// *********** Fetch User NFT Metadata Information (Filtering response) (Gateway Utility) ***********
function getVaultsByResourceAddress(jsonData: { items: never[]; }, resourceAddress: string) {
  const items = jsonData.items || [];
  // Filter items based on the resource_address
  const filteredItems = items.filter((item: { non_fungible_resources: { items: any[]; }; }) => {
    return (
      item.non_fungible_resources &&
      item.non_fungible_resources.items &&
      item.non_fungible_resources.items.length > 0 &&
      item.non_fungible_resources.items.some(
        (        resource: { resource_address: any; }) =>
          resource.resource_address &&
          resource.resource_address === resourceAddress
      )
    );
  });

  // Extract vaults from the filtered items
  const vaults = filteredItems.reduce((result: any[], item: { non_fungible_resources: { items: any[]; }; }) => {
    if (
      item.non_fungible_resources &&
      item.non_fungible_resources.items &&
      item.non_fungible_resources.items.length > 0
    ) {
      const matchingResources = item.non_fungible_resources.items.filter(
        (        resource: { resource_address: any; }) =>
          resource.resource_address &&
          resource.resource_address === resourceAddress
      );
      
      matchingResources.forEach((resource: { vaults: { total_count: number; items: any; }; }) => {
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
async function fetchNftMetadata(resourceAddress: string, item: any) {
  // Define the data to be sent in the GET request.
  const requestData = `{
    "resource_address": "${resourceAddress}",
    "non_fungible_ids": [
      "${item}"
    ]
  }`;

  // Make an HTTP POST request to the gateway
  fetch(gwUrl+'/state/non-fungible/data', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: requestData,
  })
  .then(response => response.json()) 
  .then(data => { 
    // Extracting values from the nested structure
    const extractedValues: { field_name: any; value: any; }[] = [];

    data.non_fungible_ids.forEach((id: { data: { programmatic_json: { fields: any[]; }; }; }) => {
      id.data.programmatic_json.fields.forEach((field: { field_name: any; value: any; }) => {
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
    // Find the input element by its ID
    const numberOfTokensInput = document.getElementById("numberOfTokens");

    // Update the content of the div elements (lend)
    amountLiquidityFundedDiv!.textContent = extractedValues.find(field => field.field_name === "amount")!.value;
    const startLendingEpochValue = parseFloat(extractedValues.find(field => field.field_name === "start_lending_epoch")!.value) || 0;;
    epochLiquidityFundedDiv!.textContent = startLendingEpochValue!.toString();
    epochLiquidityReedemedDiv!.textContent = extractedValues.find(field => field.field_name === "end_lending_epoch")!.value
    // Update the content of the div elements (borrow)
    amountBorrowingsDiv!.textContent = extractedValues.find(field => field.field_name === "borrow_amount")!.value;
    const epochBorrowValue = parseFloat(extractedValues.find(field => field.field_name === "start_borrow_epoch")!.value) || 0;;
    epochBorrowDiv!.textContent = epochBorrowValue!.toString();
    const expectedEpochBorrowValue = parseFloat(extractedValues.find(field => field.field_name === "expected_end_borrow_epoch")!.value) || 0;;
    expectedEpochBorrowDiv!.textContent = expectedEpochBorrowValue!.toString();
    epochRepayDiv!.textContent = extractedValues.find(field => field.field_name === "end_borrow_epoch")!.value
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}

// *********** cleanUserPosition (Gateway) ***********
async function cleanUserPosition() {
    const amountLiquidityFundedDiv = document.getElementById("amountLiquidityFunded")!.textContent = "";
    const epochLiquidityFundedDiv = document.getElementById("epochLiquidityFunded")!.textContent = "";
    const epochLiquidityReedemedDiv = document.getElementById("epochLiquidityReedemed")!.textContent = "";
    
    const amountBorrowingsDiv = document.getElementById("amountBorrowings")!.textContent = "";
    const epochBorrowDiv = document.getElementById("epochBorrow")!.textContent = "";
    const expectedEpochBorrowDiv = document.getElementById("expectedEpochBorrow")!.textContent = "";
    const epochRepayDiv = document.getElementById("epochRepay")!.textContent = "";

    const numberOfTokensInput = document.getElementById("numberOfTokens")!.textContent = "";
}


// *********** Fetch Main Pool size (Gateway) ***********
export async function fetchMainPoolSize(component: any, xrdAddress: any) {
  // Define the data to be sent in the POST request.
  const requestData = `{
      "address": "${component}",
      "resource_address": "${xrdAddress}"
  }`;

  // Make an HTTP POST request to the gateway
  fetch(gwUrl+'/state/entity/page/fungible-vaults/', {
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
          const amount = data.items.map((item: { amount: any; }) => item.amount);
          document.getElementById('mainPool')!.innerText = JSON.stringify(amount);
      } else {
          console.error('Invalid response format.');
      }
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}

// *********** Fetch Lendings Pool size (Gateway) ***********
export async function fetchLendingPoolSize(component: any, _xrdAddress: any) {
  // Define the data to be sent in the POST request.
  const requestData = `{
    address: "${component}",
    "resource_address": "${lnd_tokenAddress}"
}`;

  // Make an HTTP POST request to the gateway
  fetch(gwUrl+'/state/entity/page/fungible-vaults/', {
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
          const amount = data.items.map((item: { amount: any; }) => item.amount);
          document.getElementById('lendinsPool')!.innerText = JSON.stringify(amount);
      } else {
          console.error('Invalid response format.');
      }
  })
  .catch(error => {
      console.error('Error fetching data:', error);
  });
}
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Starting SupplyChain contract deployment...\n");

  // Get the contract factory
  const SupplyChain = await ethers.getContractFactory("SupplyChain");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Set up role addresses
  // You can customize these addresses or use environment variables
  const distributorAddress = process.env.DISTRIBUTOR_ADDRESS || deployer.address;
  const retailerAddress = process.env.RETAILER_ADDRESS || deployer.address;

  console.log("\nRole Configuration:");
  console.log("Manufacturer (Contract Owner):", deployer.address);
  console.log("Distributor:", distributorAddress);
  console.log("Retailer:", retailerAddress);

  // Validate addresses
  if (!ethers.isAddress(distributorAddress)) {
    throw new Error("Invalid distributor address");
  }
  if (!ethers.isAddress(retailerAddress)) {
    throw new Error("Invalid retailer address");
  }

  // Deploy the contract
  console.log("\nDeploying SupplyChain contract...");
  const supplyChain = await SupplyChain.deploy(distributorAddress, retailerAddress);

  // Wait for deployment to be mined
  await supplyChain.waitForDeployment();

  const contractAddress = await supplyChain.getAddress();
  console.log("\n✅ SupplyChain contract deployed successfully!");
  console.log("Contract address:", contractAddress);

  // Verify deployment by calling a view function
  console.log("\nVerifying deployment...");
  try {
    const manufacturerFromContract = await supplyChain.manufacturer();
    const distributorFromContract = await supplyChain.distributor();
    const retailerFromContract = await supplyChain.retailer();
    const batchCount = await supplyChain.getBatchCount();

    console.log("✅ Contract verification successful!");
    console.log("Manufacturer in contract:", manufacturerFromContract);
    console.log("Distributor in contract:", distributorFromContract);
    console.log("Retailer in contract:", retailerFromContract);
    console.log("Initial batch count:", batchCount.toString());
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
    return;
  }

  // Display environment variables to set
  console.log("\n📋 Environment Variables to Set:");
  console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=" + contractAddress);
  console.log("NEXT_PUBLIC_RPC_URL=<your_rpc_url>");
  console.log("PRIVATE_KEY=<your_private_key>");
  console.log("DISTRIBUTOR_ADDRESS=" + distributorAddress);
  console.log("RETAILER_ADDRESS=" + retailerAddress);

  // Save deployment info to a file
  const deploymentInfo = {
    contractAddress: contractAddress,
    manufacturer: deployer.address,
    distributor: distributorAddress,
    retailer: retailerAddress,
    deploymentBlock: await ethers.provider.getBlockNumber(),
    deploymentTime: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString()
  };

  const fs = require("fs");
  const path = require("path");

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentFile = path.join(deploymentsDir, `supplychain-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentFile);

  // Create/update latest deployment file
  const latestDeploymentFile = path.join(deploymentsDir, "latest.json");
  fs.writeFileSync(latestDeploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Latest deployment info updated at:", latestDeploymentFile);

  // Optional: Verify on block explorer if API key is provided
  if (process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY) {
    console.log("\n🔍 Attempting to verify contract on block explorer...");
    console.log("Note: Verification may take a few minutes...");
    
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [distributorAddress, retailerAddress],
      });
      console.log("✅ Contract verified on block explorer!");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Contract is already verified on block explorer!");
      } else {
        console.log("⚠️ Block explorer verification failed:", error.message);
        console.log("You can verify manually later with the following command:");
        console.log(`npx hardhat verify --network <network> ${contractAddress} "${distributorAddress}" "${retailerAddress}"`);
      }
    }
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log("Next steps:");
  console.log("1. Update your .env file with the contract address");
  console.log("2. Update your frontend configuration");
  console.log("3. Test the contract functions");
}

// Enhanced error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
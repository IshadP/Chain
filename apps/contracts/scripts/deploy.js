const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, distributor, retailer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Distributor address:", distributor.address);
  console.log("Retailer address:", retailer.address);

  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChain.deploy(
    distributor.address,
    retailer.address
  );

  await supplyChain.waitForDeployment();
  const contractAddress = await supplyChain.getAddress();

  console.log("SupplyChain deployed to:", contractAddress);

  // Save deployment info for the frontend
  const deploymentInfo = {
    contractAddress,
    manufacturer: deployer.address,
    distributor: distributor.address,
    retailer: retailer.address,
    chainId: 31337,
    rpcUrl: "http://localhost:8545"
  };

  const deploymentPath = path.join(__dirname, "../../web/lib/deployment.json");
  
  // Ensure the lib directory exists
  const libDir = path.dirname(deploymentPath);
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("Deployment info saved to:", deploymentPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
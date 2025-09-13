import { ethers } from "ethers";
import SupplyChainABI from "./contracts/contracts/SupplyChain.sol/SupplyChain.json";
import deployment from "./deployment.json";

export const getProvider = () => {
  return new ethers.JsonRpcProvider(
    process.env.HARDHAT_RPC_URL || "http://localhost:8545"
  );
};

export const getContract = (signerOrProvider?: ethers.Signer | ethers.Provider) => {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(
    deployment.contractAddress,
    SupplyChainABI.abi,
    provider
  );
};

export const getSigner = async (privateKey: string) => {
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
};

// Hardhat's default account private keys
export const HARDHAT_ACCOUNTS = {
  manufacturer: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  distributor: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", 
  retailer: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
};

// Role-based signers
export const getManufacturerSigner = async () => {
  return getSigner(HARDHAT_ACCOUNTS.manufacturer);
};

export const getDistributorSigner = async () => {
  return getSigner(HARDHAT_ACCOUNTS.distributor);
};

export const getRetailerSigner = async () => {
  return getSigner(HARDHAT_ACCOUNTS.retailer);
};

export const getRoleAddresses = () => {
  return {
    manufacturer: deployment.manufacturer,
    distributor: deployment.distributor,
    retailer: deployment.retailer
  };
};
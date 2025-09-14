import { ethers } from 'ethers'

const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const contractABI = [
  'event BatchCreated(bytes32 indexed batchId, address indexed manufacturer, string initialLocation, address indexed distributor, uint256 timestamp)',
  'event BatchTransferred(bytes32 indexed batchId, address indexed from, address indexed to, string location, uint256 timestamp)',
  'event BatchReceived(bytes32 indexed batchId, address indexed receiver, uint256 timestamp, bool receivedFlag)',
  'function createBatch(bytes32 batchId, address initialDistributor, string calldata initialLocation) external',
  'function transferBatch(bytes32 batchId, address to, string calldata nextLocation) external',
  'function markReceived(bytes32 batchId) external',
  'function getBatch(bytes32 batchId) external view returns (tuple(bytes32 id, address manufacturer, address currentOwner, string currentLocation, uint256 createdAt, uint8 status))',
  'function setRole(address user, uint8 role) external',
]

export async function getProvider() {
  return new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545')
}

export async function getSigner() {
  const provider = await getProvider()
  const privateKey = process.env.MANUFACTURER_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('Private key not configured')
  }
  return new ethers.Wallet(privateKey, provider)
}

export async function getContractInstance() {
  const signer = await getSigner()
  return new ethers.Contract(contractAddress, contractABI, signer)
}

export const ROLES = {
  MANUFACTURER: 0,
  DISTRIBUTOR: 1,
  RETAILER: 2,
}
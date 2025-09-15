// src/lib/blockchain.ts
import { ethers } from 'ethers'
import SupplyChainABI from '../../lib/contracts/contracts/SupplyChain.sol/SupplyChain.json'

// Replace with your deployed contract address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!

export interface BatchData {
  batchId: string
  quantity: number
  userId: string
  internalBatchName: string
  manufacturingDate: number
  status: string
  currentLocation: string
  currentHolder: string
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider
  private contract: ethers.Contract

  constructor() {
    // Use your RPC endpoint (e.g., Infura, Alchemy, or local node)
    this.provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
    )
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      SupplyChainABI.abi,
      this.provider
    )
  }

  async getBatchData(batchId: string): Promise<BatchData | null> {
    try {
      const exists = await this.contract.batchExistsView(batchId)
      if (!exists) {
        console.warn(
          `Batch with ID ${batchId} not found on the blockchain. It might exist only in the database.`
        )
        return null
      }

      const batchData = await this.contract.getBatch(batchId)

      return {
        batchId: batchData.batchId,
        quantity: Number(batchData.quantity),
        userId: batchData.userId,
        internalBatchName: batchData.internalBatchName,
        manufacturingDate: Number(batchData.manufacturingDate),
        status: batchData.status,
        currentLocation: batchData.currentLocation,
        currentHolder: batchData.currentHolder,
      }
    } catch (error) {
      console.error('An unexpected error occurred while fetching batch data:', error)
      return null
    }
  }

  async getAllBatches(): Promise<BatchData[]> {
    try {
      const batchIds = await this.contract.getAllBatchIds()
      const batches: BatchData[] = []
      for (const batchId of batchIds) {
        const batchData = await this.getBatchData(batchId)
        if (batchData) {
          batches.push(batchData)
        }
      }
      return batches
    } catch (error) {
      console.error('Error fetching all batches:', error)
      return []
    }
  }

  async getBatchesByUser(userId: string): Promise<BatchData[]> {
    try {
      const batchIds = await this.contract.getBatchesByUser(userId)
      const batches: BatchData[] = []
      for (const batchId of batchIds) {
        const batchData = await this.getBatchData(batchId)
        if (batchData) {
          batches.push(batchData)
        }
      }
      return batches
    } catch (error) {
      console.error('Error fetching user batches:', error)
      return []
    }
  }

  async getBatchesWithProductData(clerkUserId: string, productBatchIds: string[]): Promise<BatchData[]> {
    try {
      const batches: BatchData[] = []
      for (const batchId of productBatchIds) {
        if (batchId) {
          const batchData = await this.getBatchData(batchId)
          if (batchData && batchData.userId === clerkUserId) {
            batches.push(batchData)
          }
        }
      }
      return batches
    } catch (error) {
      console.error('Error fetching batches with product data:', error)
      return []
    }
  }

  formatManufacturingDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'created':
      case 'manufactured':
        return 'bg-blue-100 text-blue-800'
      case 'dispatched by manufacturer':
        return 'bg-yellow-100 text-yellow-800'
      case 'delivered to distributor':
        return 'bg-green-100 text-green-800'
      case 'dispatched by distributor':
        return 'bg-orange-100 text-orange-800'
      case 'delivered to retailer':
        return 'bg-purple-100 text-purple-800'
      case 'delivered to consumer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
}

// Define the Role type
export type Role = 'manufacturer' | 'distributor' | 'retailer';

// Updated function to get a contract instance with a signer based on the role
export async function getContractInstance(role: Role): Promise<ethers.Contract> {
  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
  );

  let privateKey: string | undefined;

  // Select the appropriate private key from environment variables
  switch (role) {
    case 'manufacturer':
      privateKey = process.env.MANUFACTURER_PRIVATE_KEY;
      break;
    case 'distributor':
      privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;
      break;
    case 'retailer':
      privateKey = process.env.RETAILER_PRIVATE_KEY;
      break;
    default:
      throw new Error(`Invalid role specified: ${role}`);
  }

  if (!privateKey) {
    throw new Error(`Private key for role "${role}" is not set in environment variables.`);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    SupplyChainABI.abi,
    wallet
  );

  return contract;
}
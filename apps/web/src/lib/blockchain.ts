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
      // Assuming your contract has a getBatch function
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
      console.error('Error fetching batch data:', error)
      return null
    }
  }

  async getAllBatches(): Promise<BatchData[]> {
    try {
      // Assuming your contract has a function to get all batch IDs
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

      // Get batch data for each batch_id from Supabase products
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

  // Helper method to format manufacturing date
  formatManufacturingDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Helper method to get status color
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'created':
      case 'manufactured':
        return 'bg-blue-100 text-blue-800'
      case 'in transit':
      case 'in_transit':
        return 'bg-yellow-100 text-yellow-800'
      case 'delivered to distributor':
      case 'delivered_to_distributor':
        return 'bg-green-100 text-green-800'
      case 'delivered to retailer':
      case 'delivered_to_retailer':
        return 'bg-purple-100 text-purple-800'
      case 'delivered to consumer':
      case 'delivered_to_consumer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
}

// Function to get a contract instance with a signer for writing transactions
export async function getContractInstance(): Promise<ethers.Contract> {
  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    SupplyChainABI.abi,
    wallet
  )
  return contract
}
// src/lib/blockchain.ts
import { ethers } from 'ethers'
import SupplyChainABI from './contracts/contracts/SupplyChain.sol/SupplyChain.json'

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
        quantity: batchData.quantity.toNumber(),
        userId: batchData.userId,
        internalBatchName: batchData.internalBatchName,
        manufacturingDate: batchData.manufacturingDate.toNumber(),
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
      // This is the old method - keeping for backward compatibility
      // Use getBatchesByClerkUserId instead for Clerk integration
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

  // New method specifically for getting batches with Supabase product data
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
}
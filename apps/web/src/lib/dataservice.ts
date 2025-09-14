// src/lib/dataService.ts
import { SupabaseService, Product } from './supabase'
import { BlockchainService, BatchData } from './blockchain'

export interface CombinedProductData {
  product: Product
  batchData: BatchData | null
}

export interface DataFetchResult {
  products: CombinedProductData[]
  errors: string[]
  syncedCount: number
  totalCount: number
}

export class DataService {
  private blockchainService: BlockchainService
  
  constructor() {
    this.blockchainService = new BlockchainService()
  }

  /**
   * Fetch products starting with Supabase data, then enrich with blockchain data
   * This is the recommended approach for most use cases
   */
  async fetchProductsSupabaseFirst(clerkUserId: string): Promise<DataFetchResult> {
    const errors: string[] = []
    let products: CombinedProductData[] = []
    
    try {
      // Get Supabase products for user
      const supabaseProducts = await SupabaseService.getProductsByUserId(clerkUserId)
      
      if (supabaseProducts.length === 0) {
        return {
          products: [],
          errors,
          syncedCount: 0,
          totalCount: 0
        }
      }

      // Enrich each product with blockchain data
      for (const product of supabaseProducts) {
        let batchData: BatchData | null = null
        
        if (product.batch_id) {
          try {
            batchData = await this.blockchainService.getBatchData(product.batch_id)
            
            // Verify ownership
            if (batchData && batchData.userId !== clerkUserId) {
              errors.push(`Batch ${product.batch_id} ownership mismatch`)
              batchData = null
            }
          } catch (error) {
            errors.push(`Failed to fetch batch data for ${product.batch_id}: ${error}`)
          }
        }

        products.push({
          product,
          batchData
        })
      }

      const syncedCount = products.filter(p => p.batchData !== null).length

      return {
        products,
        errors,
        syncedCount,
        totalCount: products.length
      }
    } catch (error) {
      errors.push(`Failed to fetch products: ${error}`)
      return {
        products: [],
        errors,
        syncedCount: 0,
        totalCount: 0
      }
    }
  }

  /**
   * Fetch products starting with blockchain data, then match with Supabase
   * Use this when you want to ensure all blockchain data is captured
   */
  async fetchProductsBlockchainFirst(clerkUserId: string): Promise<DataFetchResult> {
    const errors: string[] = []
    let products: CombinedProductData[] = []
    
    try {
      // Get blockchain data first
      const blockchainBatches = await this.blockchainService.getBatchesByUser(clerkUserId)
      const supabaseProducts = await SupabaseService.getProductsByUserId(clerkUserId)

      // Create a map for quick lookup
      const productMap = new Map<string, Product>()
      supabaseProducts.forEach(product => {
        if (product.batch_id) {
          productMap.set(product.batch_id, product)
        }
      })

      // Match blockchain data with Supabase products
      const matchedBatchIds = new Set<string>()
      
      for (const batchData of blockchainBatches) {
        const matchingProduct = productMap.get(batchData.batchId)
        
        if (matchingProduct) {
          products.push({
            product: matchingProduct,
            batchData
          })
          matchedBatchIds.add(batchData.batchId)
        } else {
          // Blockchain data exists but no Supabase product
          // You might want to create a placeholder product or handle this case
          errors.push(`Blockchain batch ${batchData.batchId} has no matching product in database`)
        }
      }

      // Add Supabase products that don't have blockchain matches
      for (const product of supabaseProducts) {
        if (!product.batch_id || !matchedBatchIds.has(product.batch_id)) {
          products.push({
            product,
            batchData: null
          })
        }
      }

      const syncedCount = products.filter(p => p.batchData !== null).length

      return {
        products,
        errors,
        syncedCount,
        totalCount: products.length
      }
    } catch (error) {
      errors.push(`Failed to fetch products (blockchain first): ${error}`)
      return {
        products: [],
        errors,
        syncedCount: 0,
        totalCount: 0
      }
    }
  }

  /**
   * Create a new product with optional blockchain integration
   */
  async createProduct(
    productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
    batchId?: string
  ): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      // If batch ID is provided, verify it exists and belongs to the user
      if (batchId) {
        const batchData = await this.blockchainService.getBatchData(batchId)
        if (!batchData) {
          return { success: false, error: `Batch ${batchId} not found on blockchain` }
        }
        if (batchData.userId !== productData.user_id) {
          return { success: false, error: `Batch ${batchId} does not belong to user` }
        }
        productData.batch_id = batchId
      }

      const product = await SupabaseService.createProduct(productData)
      if (!product) {
        return { success: false, error: 'Failed to create product in database' }
      }

      return { success: true, product }
    } catch (error) {
      return { success: false, error: `Failed to create product: ${error}` }
    }
  }

  /**
   * Update product and maintain blockchain sync
   */
  async updateProduct(
    productId: string,
    updates: Partial<Product>,
    clerkUserId: string
  ): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      // If updating batch_id, verify the new batch
      if (updates.batch_id) {
        const batchData = await this.blockchainService.getBatchData(updates.batch_id)
        if (!batchData) {
          return { success: false, error: `Batch ${updates.batch_id} not found on blockchain` }
        }
        if (batchData.userId !== clerkUserId) {
          return { success: false, error: `Batch ${updates.batch_id} does not belong to user` }
        }
      }

      const product = await SupabaseService.updateProduct(productId, updates, clerkUserId)
      if (!product) {
        return { success: false, error: 'Failed to update product' }
      }

      return { success: true, product }
    } catch (error) {
      return { success: false, error: `Failed to update product: ${error}` }
    }
  }

  /**
   * Get sync status for a user's products
   */
  async getSyncStatus(clerkUserId: string): Promise<{
    totalProducts: number
    syncedProducts: number
    unsyncedProducts: number
    orphanedBatches: number
  }> {
    try {
      const result = await this.fetchProductsBlockchainFirst(clerkUserId)
      const totalProducts = result.totalCount
      const syncedProducts = result.syncedCount
      const unsyncedProducts = totalProducts - syncedProducts
      
      // Count blockchain batches without Supabase products
      const blockchainBatches = await this.blockchainService.getBatchesByUser(clerkUserId)
      const supabaseProducts = await SupabaseService.getProductsByUserId(clerkUserId)
      const linkedBatchIds = new Set(
        supabaseProducts.map(p => p.batch_id).filter(Boolean)
      )
      const orphanedBatches = blockchainBatches.filter(
        batch => !linkedBatchIds.has(batch.batchId)
      ).length

      return {
        totalProducts,
        syncedProducts,
        unsyncedProducts,
        orphanedBatches
      }
    } catch (error) {
      console.error('Error getting sync status:', error)
      return {
        totalProducts: 0,
        syncedProducts: 0,
        unsyncedProducts: 0,
        orphanedBatches: 0
      }
    }
  }
}
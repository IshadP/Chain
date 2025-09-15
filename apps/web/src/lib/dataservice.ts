// src/lib/dataService.ts
import { SupabaseService, Product, CreateProductInput } from './supabase'
import { BlockchainService, BatchData } from './blockchain'

export interface CombinedProductData {
  // Supabase data
  product: Product
  
  // Blockchain data (if available)
  batchData: BatchData | null
  
  // Computed fields
  isSynced: boolean
  syncStatus: 'synced' | 'supabase-only' | 'blockchain-only' | 'conflict'
  lastUpdated: Date
}

export interface DataFetchResult {
  products: CombinedProductData[]
  errors: string[]
  syncedCount: number
  totalCount: number
  stats: {
    supabaseOnly: number
    blockchainOnly: number
    synced: number
    conflicts: number
  }
}

export interface BatchCreationData {
  // Supabase fields
  name: string
  cost: number
  description?: string
  category: string
  image?: string
  
  // Blockchain fields
  internalBatchName: string
  quantity: number
  initialLocation: string
  distributorAddress?: string
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
    const stats = { supabaseOnly: 0, blockchainOnly: 0, synced: 0, conflicts: 0 }
    
    try {
      // Get Supabase products for user
      const supabaseProducts = await SupabaseService.getProductsByUserId(clerkUserId)
      
      if (supabaseProducts.length === 0) {
        return {
          products: [],
          errors,
          syncedCount: 0,
          totalCount: 0,
          stats
        }
      }

      // Enrich each product with blockchain data
      for (const product of supabaseProducts) {
        let batchData: BatchData | null = null
        let syncStatus: CombinedProductData['syncStatus'] = 'supabase-only'
        
        if (product.batch_id) {
          try {
            batchData = await this.blockchainService.getBatchData(product.batch_id)
            
            if (batchData) {
              // Verify ownership
              if (batchData.userId === clerkUserId) {
                syncStatus = 'synced'
                stats.synced++
              } else {
                errors.push(`Batch ${product.batch_id} ownership mismatch`)
                syncStatus = 'conflict'
                stats.conflicts++
                batchData = null
              }
            } else {
              // Product has batch_id but no blockchain data found
              errors.push(`Batch ${product.batch_id} not found on blockchain`)
              stats.supabaseOnly++
            }
          } catch (error) {
            errors.push(`Failed to fetch batch data for ${product.batch_id}: ${error}`)
            stats.supabaseOnly++
          }
        } else {
          stats.supabaseOnly++
        }

        products.push({
          product,
          batchData,
          isSynced: syncStatus === 'synced',
          syncStatus,
          lastUpdated: new Date(product.updated_at)
        })
      }

      const syncedCount = products.filter(p => p.isSynced).length

      return {
        products,
        errors,
        syncedCount,
        totalCount: products.length,
        stats
      }
    } catch (error) {
      errors.push(`Failed to fetch products: ${error}`)
      return {
        products: [],
        errors,
        syncedCount: 0,
        totalCount: 0,
        stats
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
    const stats = { supabaseOnly: 0, blockchainOnly: 0, synced: 0, conflicts: 0 }
    
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
            batchData,
            isSynced: true,
            syncStatus: 'synced',
            lastUpdated: new Date(matchingProduct.updated_at)
          })
          matchedBatchIds.add(batchData.batchId)
          stats.synced++
        } else {
          // Blockchain data exists but no Supabase product
          errors.push(`Blockchain batch ${batchData.batchId} has no matching product in database`)
          stats.blockchainOnly++
          
          // Create a placeholder product entry for display
          const placeholderProduct: Product = {
            id: batchData.batchId,
            user_id: clerkUserId,
            name: batchData.internalBatchName || 'Unknown Product',
            cost: 0,
            batch_id: batchData.batchId,
            description: 'Product data missing from database',
            category: 'Unknown',
            created_at: new Date(batchData.manufacturingDate * 1000).toISOString(),
            updated_at: new Date(batchData.manufacturingDate * 1000).toISOString()
          }
          
          products.push({
            product: placeholderProduct,
            batchData,
            isSynced: false,
            syncStatus: 'blockchain-only',
            lastUpdated: new Date(batchData.manufacturingDate * 1000)
          })
        }
      }

      // Add Supabase products that don't have blockchain matches
      for (const product of supabaseProducts) {
        if (!product.batch_id || !matchedBatchIds.has(product.batch_id)) {
          products.push({
            product,
            batchData: null,
            isSynced: false,
            syncStatus: 'supabase-only',
            lastUpdated: new Date(product.updated_at)
          })
          stats.supabaseOnly++
        }
      }

      const syncedCount = products.filter(p => p.isSynced).length

      return {
        products,
        errors,
        syncedCount,
        totalCount: products.length,
        stats
      }
    } catch (error) {
      errors.push(`Failed to fetch products (blockchain first): ${error}`)
      return {
        products: [],
        errors,
        syncedCount: 0,
        totalCount: 0,
        stats
      }
    }
  }

  /**
   * Create a new product with blockchain integration
   */
  async createCompleteProduct(
    clerkUserId: string,
    productData: BatchCreationData
  ): Promise<{ 
    success: boolean
    product?: Product
    batchData?: BatchData
    batchId?: string
    error?: string 
  }> {
    try {
      // Create Supabase product first
      const supabaseData: CreateProductInput = {
        user_id: clerkUserId,
        name: productData.name,
        cost: productData.cost,
        description: productData.description,
        category: productData.category,
        image: productData.image
      }

      const product = await SupabaseService.createProduct(supabaseData)
      if (!product) {
        return { success: false, error: 'Failed to create product in database' }
      }

      // Use the product ID as batch ID and update the product
      const batchId = product.id
      await SupabaseService.updateProduct(batchId, { batch_id: batchId }, clerkUserId)

      // Create blockchain batch
      // Note: This would typically call your blockchain service or API
      // For now, we'll return the product data
      
      return { 
        success: true, 
        product: { ...product, batch_id: batchId },
        batchId 
      }
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
   * Get comprehensive sync status for a user's products
   */
  async getSyncStatus(clerkUserId: string): Promise<{
    totalProducts: number
    syncedProducts: number
    unsyncedProducts: number
    orphanedBatches: number
    conflicts: number
    lastSyncCheck: Date
    syncHealth: 'healthy' | 'warning' | 'critical'
  }> {
    try {
      const result = await this.fetchProductsBlockchainFirst(clerkUserId)
      const totalProducts = result.totalCount
      const syncedProducts = result.syncedCount
      const unsyncedProducts = totalProducts - syncedProducts
      const orphanedBatches = result.stats.blockchainOnly
      const conflicts = result.stats.conflicts

      // Determine sync health
      let syncHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
      const syncRate = totalProducts > 0 ? syncedProducts / totalProducts : 1

      if (syncRate < 0.5 || conflicts > 0) {
        syncHealth = 'critical'
      } else if (syncRate < 0.8 || orphanedBatches > 5) {
        syncHealth = 'warning'
      }

      return {
        totalProducts,
        syncedProducts,
        unsyncedProducts,
        orphanedBatches,
        conflicts,
        lastSyncCheck: new Date(),
        syncHealth
      }
    } catch (error) {
      console.error('Error getting sync status:', error)
      return {
        totalProducts: 0,
        syncedProducts: 0,
        unsyncedProducts: 0,
        orphanedBatches: 0,
        conflicts: 0,
        lastSyncCheck: new Date(),
        syncHealth: 'critical'
      }
    }
  }

  /**
   * Get detailed product information including both Supabase and blockchain data
   */
  async getProductDetails(productId: string, clerkUserId: string): Promise<{
    product: Product | null
    batchData: BatchData | null
    syncStatus: CombinedProductData['syncStatus']
    error?: string
  }> {
    try {
      const product = await SupabaseService.getProductById(productId)
      if (!product || product.user_id !== clerkUserId) {
        return {
          product: null,
          batchData: null,
          syncStatus: 'supabase-only',
          error: 'Product not found or access denied'
        }
      }

      let batchData: BatchData | null = null
      let syncStatus: CombinedProductData['syncStatus'] = 'supabase-only'

      if (product.batch_id) {
        batchData = await this.blockchainService.getBatchData(product.batch_id)
        if (batchData) {
          if (batchData.userId === clerkUserId) {
            syncStatus = 'synced'
          } else {
            syncStatus = 'conflict'
            batchData = null
          }
        }
      }

      return { product, batchData, syncStatus }
    } catch (error) {
      return {
        product: null,
        batchData: null,
        syncStatus: 'supabase-only',
        error: `Error fetching product details: ${error}`
      }
    }
  }

  /**
   * Repair sync issues for a specific product
   */
  async repairProductSync(productId: string, clerkUserId: string): Promise<{
    success: boolean
    message: string
    error?: string
  }> {
    try {
      const details = await this.getProductDetails(productId, clerkUserId)
      if (!details.product) {
        return { success: false, message: 'Product not found', error: details.error }
      }

      switch (details.syncStatus) {
        case 'synced':
          return { success: true, message: 'Product is already in sync' }
        
        case 'supabase-only':
          // Product exists in Supabase but not on blockchain
          // This would typically require creating a blockchain entry
          return { success: false, message: 'Cannot create blockchain entry from existing product', error: 'Blockchain creation not implemented for existing products' }
        
        case 'blockchain-only':
          // This shouldn't happen with our current flow, but if it does,
          // we'd need to create a Supabase entry
          return { success: false, message: 'Cannot create Supabase entry from blockchain data', error: 'Supabase creation from blockchain not implemented' }
        
        case 'conflict':
          // Ownership mismatch - this is a serious issue
          return { success: false, message: 'Ownership conflict detected', error: 'Manual intervention required' }
        
        default:
          return { success: false, message: 'Unknown sync status', error: 'Unable to determine repair action' }
      }
    } catch (error) {
      return { success: false, message: 'Error during sync repair', error: `${error}` }
    }
  }

  /**
   * Get products by category with sync information
   */
  async getProductsByCategory(clerkUserId: string, category?: string): Promise<{
    products: CombinedProductData[]
    categories: string[]
    error?: string
  }> {
    try {
      const result = await this.fetchProductsSupabaseFirst(clerkUserId)
      let products = result.products

      if (category) {
        products = products.filter(p => p.product.category === category)
      }

      // Get all unique categories
      const categories = [...new Set(result.products.map(p => p.product.category).filter(Boolean))]

      return { products, categories }
    } catch (error) {
      return { 
        products: [], 
        categories: [], 
        error: `Error fetching products by category: ${error}` 
      }
    }
  }

  /**
   * Search products across both Supabase and blockchain data
   */
  async searchProducts(clerkUserId: string, searchTerm: string): Promise<{
    products: CombinedProductData[]
    totalMatches: number
    error?: string
  }> {
    try {
      const result = await this.fetchProductsSupabaseFirst(clerkUserId)
      const searchLower = searchTerm.toLowerCase()

      const products = result.products.filter(p => 
        p.product.name.toLowerCase().includes(searchLower) ||
        p.product.description?.toLowerCase().includes(searchLower) ||
        p.product.category?.toLowerCase().includes(searchLower) ||
        p.product.batch_id?.toLowerCase().includes(searchLower) ||
        p.batchData?.internalBatchName.toLowerCase().includes(searchLower) ||
        p.batchData?.currentLocation.toLowerCase().includes(searchLower)
      )

      return { 
        products, 
        totalMatches: products.length 
      }
    } catch (error) {
      return { 
        products: [], 
        totalMatches: 0, 
        error: `Error searching products: ${error}` 
      }
    }
  }

  /**
   * Get analytics data for dashboard
   */
  async getAnalytics(clerkUserId: string): Promise<{
    totalProducts: number
    totalValue: number
    syncRate: number
    categoryBreakdown: Record<string, number>
    statusBreakdown: Record<string, number>
    monthlyCreation: Record<string, number>
    syncHealth: 'healthy' | 'warning' | 'critical'
    error?: string
  }> {
    try {
      const result = await this.fetchProductsSupabaseFirst(clerkUserId)
      const products = result.products

      // Basic metrics
      const totalProducts = products.length
      const totalValue = products.reduce((sum, p) => sum + p.product.cost, 0)
      const syncRate = totalProducts > 0 ? result.syncedCount / totalProducts : 1

      // Category breakdown
      const categoryBreakdown: Record<string, number> = {}
      products.forEach(p => {
        const category = p.product.category || 'Unknown'
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1
      })

      // Status breakdown (blockchain statuses)
      const statusBreakdown: Record<string, number> = {}
      products.forEach(p => {
        if (p.batchData?.status) {
          const status = p.batchData.status.toLowerCase()
          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
        } else {
          statusBreakdown['no blockchain data'] = (statusBreakdown['no blockchain data'] || 0) + 1
        }
      })

      // Monthly creation breakdown
      const monthlyCreation: Record<string, number> = {}
      products.forEach(p => {
        const date = new Date(p.product.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyCreation[monthKey] = (monthlyCreation[monthKey] || 0) + 1
      })

      // Sync health
      let syncHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (syncRate < 0.5 || result.stats.conflicts > 0) {
        syncHealth = 'critical'
      } else if (syncRate < 0.8 || result.stats.blockchainOnly > 5) {
        syncHealth = 'warning'
      }

      return {
        totalProducts,
        totalValue,
        syncRate,
        categoryBreakdown,
        statusBreakdown,
        monthlyCreation,
        syncHealth
      }
    } catch (error) {
      return {
        totalProducts: 0,
        totalValue: 0,
        syncRate: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
        monthlyCreation: {},
        syncHealth: 'critical',
        error: `Error fetching analytics: ${error}`
      }
    }
  }

  /**
   * Bulk operations for products
   */
  async bulkUpdateProducts(
    clerkUserId: string,
    updates: { productId: string; changes: Partial<Product> }[]
  ): Promise<{
    successful: string[]
    failed: { productId: string; error: string }[]
    totalProcessed: number
  }> {
    const successful: string[] = []
    const failed: { productId: string; error: string }[] = []

    for (const { productId, changes } of updates) {
      try {
        const result = await this.updateProduct(productId, changes, clerkUserId)
        if (result.success) {
          successful.push(productId)
        } else {
          failed.push({ productId, error: result.error || 'Unknown error' })
        }
      } catch (error) {
        failed.push({ productId, error: `${error}` })
      }
    }

    return {
      successful,
      failed,
      totalProcessed: updates.length
    }
  }
}
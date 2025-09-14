'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreVertical, Plus, RefreshCw } from "lucide-react"
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs"
import { supabase, Product } from "@/lib/supabase"
import { BlockchainService, BatchData } from "@/lib/blockchain"

interface CombinedProductData {
  product: Product
  batchData: BatchData | null
}

export default function ManufacturerPage() {
  const [products, setProducts] = useState<CombinedProductData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useUser()

  const blockchainService = new BlockchainService()

  const fetchProducts = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch products from Supabase
      const { data: supabaseProducts, error: supabaseError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (supabaseError) {
        console.error('Supabase error:', supabaseError)
        return
      }

      // Fetch blockchain data for each product
      const combinedData: CombinedProductData[] = []

      for (const product of supabaseProducts || []) {
        let batchData: BatchData | null = null
        
        if (product.batch_id) {
          batchData = await blockchainService.getBatchData(product.batch_id)
        }

        combinedData.push({
          product,
          batchData
        })
      }

      setProducts(combinedData)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchProducts()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'manufactured':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-yellow-100 text-yellow-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-semibold">
              SupChain
            </Link>
            <Link href="/add-product">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </Link>
            <Button 
              onClick={refreshData} 
              disabled={refreshing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="flex items-center gap-4">
              <SignOutButton/>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Products</h1>
          <div className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">No products found</div>
            <Link href="/add-product">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Product
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map(({ product, batchData }) => (
              <Card key={product.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-lg mb-2">{product.name}</h3>
                    
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {batchData?.status && (
                        <Badge className={getStatusColor(batchData.status)}>
                          {batchData.status}
                        </Badge>
                      )}
                      {batchData?.currentLocation && (
                        <Badge variant="outline" className="text-xs">
                          📍 {batchData.currentLocation}
                        </Badge>
                      )}
                      {batchData?.quantity && (
                        <Badge variant="outline" className="text-xs">
                          Qty: {batchData.quantity}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-xl font-semibold">
                        {formatPrice(product.cost)}
                      </div>
                      {batchData?.manufacturingDate && (
                        <div className="text-sm text-muted-foreground">
                          Manufactured: {formatDate(batchData.manufacturingDate)}
                        </div>
                      )}
                    </div>

                    {batchData?.internalBatchName && (
                      <div className="text-sm text-muted-foreground">
                        Batch: {batchData.internalBatchName}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right space-y-1">
                      <div className="text-sm text-muted-foreground">Batch ID</div>
                      <div className="text-sm font-mono">
                        {product.batch_id ? 
                          `${product.batch_id.slice(0, 8)}...` : 
                          'Not linked'
                        }
                      </div>
                      {batchData?.currentHolder && (
                        <>
                          <div className="text-sm text-muted-foreground">Current Holder</div>
                          <div className="text-sm">
                            {`${batchData.currentHolder.slice(0, 6)}...${batchData.currentHolder.slice(-4)}`}
                          </div>
                        </>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Blockchain Data Status */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${batchData ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-muted-foreground">
                        Blockchain: {batchData ? 'Synced' : 'Not synced'}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Updated: {new Date(product.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-64 mb-2" />
                  <div className="flex gap-2 mb-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
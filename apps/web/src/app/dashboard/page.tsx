'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreVertical, Plus, RefreshCw, Send } from "lucide-react"
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs"
import { DataService, CombinedProductData } from "@/lib/dataservice"
import { BlockchainService } from "@/lib/blockchain"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function ManufacturerPage() {
  const [products, setProducts] = useState<CombinedProductData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<CombinedProductData | null>(null)
  const [newHolderAddress, setNewHolderAddress] = useState("")
  const [newLocation, setNewLocation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user } = useUser()
  const { toast } = useToast()

  const dataService = new DataService()
  const blockchainService = new BlockchainService()

  const fetchProducts = async () => {
    if (!user) return
    try {
      setLoading(true)
      const result = await dataService.fetchProductsSupabaseFirst(user.id)
      if (result.products) {
        setProducts(result.products)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast({ title: "Error", description: "Failed to fetch products.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!selectedProduct || !selectedProduct.product.batch_id) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/batches/${selectedProduct.product.batch_id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ownershipTransfer',
          newHolderAddress,
          newLocation,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || 'Transfer failed')
      }

      toast({
        title: "Success!",
        description: `Batch transferred successfully. Transaction: ${result.transactionHash.slice(0, 10)}...`,
      })
      setIsModalOpen(false) // Close modal on success
      await fetchProducts() // Refresh data

    } catch (error: any) {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openTransferModal = (product: CombinedProductData) => {
    setSelectedProduct(product)
    setNewHolderAddress("")
    setNewLocation(product.batchData?.currentLocation || "")
    setIsModalOpen(true)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchProducts()
    setRefreshing(false)
  }

  useEffect(() => {
    if (user) {
      fetchProducts()
    }
  }, [user])

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-semibold">SupChain</Link>
            <Link href="/create-batch">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Product</Button>
            </Link>
            <Button onClick={refreshData} disabled={refreshing} variant="outline" className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <SignOutButton />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Products</h1>
          <div className="text-sm text-muted-foreground">{products.length} product{products.length !== 1 ? 's' : ''} found</div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">No products found</div>
            <Link href="/create-batch">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Your First Product</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((p) => (
              <Card key={p.product.id} className="p-4">
                <div className="flex items-start gap-4">
                  <img src={p.product.image || "/placeholder.svg"} alt={p.product.name} className="w-20 h-20 bg-gray-200 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-lg mb-2">{p.product.name}</h3>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {p.batchData?.status && <Badge className={blockchainService.getStatusColor(p.batchData.status)}>{p.batchData.status}</Badge>}
                      {p.batchData?.currentLocation && <Badge variant="outline" className="text-xs">📍 {p.batchData.currentLocation}</Badge>}
                      {p.batchData?.quantity && <Badge variant="outline" className="text-xs">Qty: {p.batchData.quantity.toString()}</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.product.cost)}</div>
                    {p.batchData?.manufacturingDate && <div className="text-sm text-muted-foreground">Mfg: {new Date(p.batchData.manufacturingDate * 1000).toLocaleDateString()}</div>}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${p.batchData ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-muted-foreground">Blockchain: {p.batchData ? 'Synced' : 'Not synced'}</span>
                  </div>
                  {p.batchData && (
                    <Button size="sm" onClick={() => openTransferModal(p)}>
                      <Send className="w-4 h-4 mr-2" />
                      Transfer Ownership
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Transfer Ownership Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Batch Ownership</DialogTitle>
            <DialogDescription>
              Transferring batch: {selectedProduct?.batchData?.internalBatchName} ({selectedProduct?.product?.batch_id?.slice(0, 8)}...)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-holder" className="text-right">New Holder</Label>
              <Input id="new-holder" value={newHolderAddress} onChange={(e) => setNewHolderAddress(e.target.value)} className="col-span-3" placeholder="0x..." />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-location" className="text-right">Location</Label>
              <Input id="new-location" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={isSubmitting || !newHolderAddress || !newLocation}>
              {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LoadingSkeleton() {
  // ... (skeleton component remains the same)
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
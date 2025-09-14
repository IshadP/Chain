'use client'

import { useState } from 'react'
import { useUser, useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Package, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import Image from 'next/image'

export default function CreateBatchPage() {
  const { userId } = useAuth()
  const { user } = useUser()
  const { toast } = useToast()
  const userRole = user?.publicMetadata?.role as string
  const [loading, setLoading] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    quantity: '',
    description: '',
    initialLocation: '',
    distributorAddress: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || userRole !== 'Manufacturer') {
      toast({
        title: 'Access Denied',
        description: 'Only manufacturers can create batches',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create batch')
      }

      const { batchId, qrUrl } = await response.json()
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(qrUrl)
      setQrCodeUrl(qrDataUrl)

      toast({
        title: 'Batch Created Successfully',
        description: `Batch ID: ${batchId}`,
      })

      // Reset form
      setFormData({
        name: '',
        sku: '',
        quantity: '',
        description: '',
        initialLocation: '',
        distributorAddress: '',
      })
    } catch (error) {
      console.error('Error creating batch:', error)
      toast({
        title: 'Error',
        description: 'Failed to create batch. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeUrl) return
    
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = 'batch-qr-code.png'
    link.click()
  }

  // Check if user has manufacturer role
  if (userRole !== 'Manufacturer') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <Package className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold">Access Denied</h1>
          </div>
          <p className="text-gray-600 mb-4">
            Only users with the Manufacturer role can create product batches.
          </p>
          <p className="text-sm text-gray-500">
            Your current role: <Badge>{userRole || 'Not Set'}</Badge>
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <Package className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Create Product Batch</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Batch Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Enter SKU"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="initialLocation">Initial Location</Label>
                  <Input
                    id="initialLocation"
                    value={formData.initialLocation}
                    onChange={(e) => setFormData({ ...formData, initialLocation: e.target.value })}
                    placeholder="Enter initial location"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="distributorAddress">Distributor Address</Label>
                  <Select value={formData.distributorAddress} onValueChange={(value) => setFormData({ ...formData, distributorAddress: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select distributor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0x70997970C51812dc3A010C7d01b50e0d17dc79C8">Distributor 1</SelectItem>
                      <SelectItem value="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC">Distributor 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Batch'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {qrCodeUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5" />
                  <span>QR Code</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <Image
                    src={qrCodeUrl}
                    alt="Batch QR Code"
                    width={200}
                    height={200}
                    className="mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-4 mb-4">
                  Scan this QR code to track the product journey
                </p>
                <Button onClick={downloadQRCode} variant="outline">
                  Download QR Code
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
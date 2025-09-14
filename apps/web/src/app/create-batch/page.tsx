'use client'

import { useState, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Package, QrCode, ArrowRight, Info, CheckCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import QRCode from 'qrcode'
import Image from 'next/image'

interface FormData {
  // Supabase Fields
  name: string
  cost: string
  description: string
  category: string
  image?: string
  
  // Blockchain Fields
  internalBatchName: string
  sku: string
  quantity: string
  initialLocation: string
  distributorAddress: string
}

interface BatchCreationState {
  loading: boolean
  qrCodeUrl: string
  batchId: string
  transactionHash: string
  step: 'form' | 'created' | 'transferred'
}

const distributors = [
  { value: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', label: 'Distributor 1 - Central Hub' },
  { value: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', label: 'Distributor 2 - Regional Hub' },
  { value: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', label: 'Distributor 3 - Local Hub' }
]

const categories = [
  'Electronics',
  'Clothing',
  'Food & Beverages',
  'Home & Garden',
  'Health & Beauty',
  'Sports & Outdoors',
  'Books & Media',
  'Automotive',
  'Industrial',
  'Other'
]

export default function CreateBatchPage() {
  const { userId } = useAuth()
  const { user } = useUser()
  const { toast } = useToast()
  const userRole = user?.publicMetadata?.role as string
  
  const [state, setState] = useState<BatchCreationState>({
    loading: false,
    qrCodeUrl: '',
    batchId: '',
    transactionHash: '',
    step: 'form'
  })

  const [formData, setFormData] = useState<FormData>({
    // Supabase Fields
    name: '',
    cost: '',
    description: '',
    category: '',
    
    // Blockchain Fields
    internalBatchName: '',
    sku: '',
    quantity: '',
    initialLocation: '',
    distributorAddress: '',
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  // Auto-generate internal batch name when other fields change
  useEffect(() => {
    if (formData.category && formData.sku && !formData.internalBatchName) {
      const date = new Date()
      const month = date.getMonth() + 1
      const quarter = Math.ceil(month / 3)
      const shortCategory = formData.category.substring(0, 4).toUpperCase()
      const shortSku = formData.sku.substring(0, 6).toUpperCase()
      setFormData(prev => ({
        ...prev,
        internalBatchName: `Q${quarter}-${shortCategory}-${shortSku}`
      }))
    }
  }, [formData.category, formData.sku, formData.internalBatchName])

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}
    
    // Supabase validations
    if (!formData.name.trim()) newErrors.name = 'Product name is required'
    if (!formData.cost || parseFloat(formData.cost) <= 0) newErrors.cost = 'Valid cost is required'
    if (!formData.category) newErrors.category = 'Category is required'
    
    // Blockchain validations
    if (!formData.internalBatchName.trim()) newErrors.internalBatchName = 'Internal batch name is required'
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    if (!formData.quantity || parseInt(formData.quantity) <= 0) newErrors.quantity = 'Valid quantity is required'
    if (!formData.initialLocation.trim()) newErrors.initialLocation = 'Manufacturing location is required'
    if (!formData.distributorAddress) newErrors.distributorAddress = 'Distributor selection is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userId || userRole?.toLowerCase() !== 'manufacturer') {
      toast({
        title: 'Access Denied',
        description: 'Only manufacturers can create batches.',
        variant: 'destructive',
      })
      return
    }

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form.',
        variant: 'destructive',
      })
      return
    }

    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          cost: parseFloat(formData.cost),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to create batch')
      }

      const { batchId, qrUrl, transactionHash } = await response.json()
      
      const qrDataUrl = await QRCode.toDataURL(qrUrl)
      
      setState(prev => ({
        ...prev,
        qrCodeUrl: qrDataUrl,
        batchId,
        transactionHash,
        step: 'created',
        loading: false
      }))

      toast({
        title: 'Batch Created Successfully!',
        description: `Batch ID: ${batchId}`,
      })

    } catch (error) {
      console.error('Error creating batch:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      toast({
        title: 'Error Creating Batch',
        description: errorMessage,
        variant: 'destructive',
      })
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleTransfer = async () => {
    if (!state.batchId || !formData.distributorAddress) {
      toast({ 
        title: 'Error', 
        description: 'Batch ID or distributor address is missing.', 
        variant: 'destructive' 
      })
      return
    }

    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const response = await fetch(`/api/batches/${state.batchId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newHolderAddress: formData.distributorAddress, 
          newLocation: 'In Transit to Distributor' 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to transfer batch')
      }
      
      toast({ 
        title: 'Success', 
        description: 'Batch is now in transit to the distributor.' 
      })
      
      setState(prev => ({ ...prev, step: 'transferred', loading: false }))

    } catch (error) {
      console.error('Transfer Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      toast({ 
        title: 'Transfer Failed', 
        description: errorMessage, 
        variant: 'destructive' 
      })
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const downloadQRCode = () => {
    if (!state.qrCodeUrl) return
    const link = document.createElement('a')
    link.href = state.qrCodeUrl
    link.download = `batch-${state.batchId}-qrcode.png`
    link.click()
  }

  const resetForm = () => {
    setFormData({
      name: '', cost: '', description: '', category: '',
      internalBatchName: '', sku: '', quantity: '',
      initialLocation: '', distributorAddress: '',
    })
    setState({
      loading: false, qrCodeUrl: '', batchId: '', 
      transactionHash: '', step: 'form'
    })
    setErrors({})
  }

  if (userRole?.toLowerCase() !== 'manufacturer') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <Package className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold">Access Denied</h1>
          </div>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only users with the Manufacturer role can create product batches.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-gray-500">
            Your current role: <Badge>{userRole || 'Not Set'}</Badge>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <Package className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Create &amp; Dispatch Product Batch</h1>
            <p className="text-gray-600">Create products in both Supabase and Blockchain</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${state.step === 'form' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${state.step === 'form' ? 'bg-blue-100' : 'bg-green-100'}`}>
                {state.step === 'form' ? '1' : <CheckCircle className="h-5 w-5" />}
              </div>
              <span>Create Batch</span>
            </div>
            <div className={`w-8 h-0.5 ${state.step !== 'form' ? 'bg-green-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center space-x-2 ${state.step === 'created' ? 'text-blue-600' : state.step === 'transferred' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${state.step === 'created' ? 'bg-blue-100' : state.step === 'transferred' ? 'bg-green-100' : 'bg-gray-100'}`}>
                {state.step === 'transferred' ? <CheckCircle className="h-5 w-5" /> : '2'}
              </div>
              <span>Transfer to Distributor</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Supabase Fields */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-800">Product Information</h3>
                    <Badge variant="outline">Supabase</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Product Name *</Label>
                      <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="e.g., Premium Widgets" 
                        className={errors.name ? 'border-red-500' : ''}
                        disabled={state.step !== 'form'}
                      />
                      {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="cost">Cost (per item) *</Label>
                      <Input 
                        id="cost" 
                        type="number" 
                        step="0.01"
                        value={formData.cost} 
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })} 
                        placeholder="e.g., 29.99" 
                        className={errors.cost ? 'border-red-500' : ''}
                        disabled={state.step !== 'form'}
                      />
                      {errors.cost && <p className="text-sm text-red-500 mt-1">{errors.cost}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      disabled={state.step !== 'form'}
                    >
                      <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      placeholder="Describe the product features and specifications"
                      disabled={state.step !== 'form'}
                    />
                  </div>
                </div>

                {/* Blockchain Fields */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-800">Batch Information</h3>
                    <Badge variant="outline">Blockchain</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
                      <Input 
                        id="sku" 
                        value={formData.sku} 
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })} 
                        placeholder="e.g., SKU12345" 
                        className={errors.sku ? 'border-red-500' : ''}
                        disabled={state.step !== 'form'}
                      />
                      {errors.sku && <p className="text-sm text-red-500 mt-1">{errors.sku}</p>}
                    </div>
                    <div>
                      <Label htmlFor="internalBatchName">Internal Batch Name *</Label>
                      <Input 
                        id="internalBatchName" 
                        value={formData.internalBatchName} 
                        onChange={(e) => setFormData({ ...formData, internalBatchName: e.target.value })} 
                        placeholder="Auto-generated or custom" 
                        className={errors.internalBatchName ? 'border-red-500' : ''}
                        disabled={state.step !== 'form'}
                      />
                      {errors.internalBatchName && <p className="text-sm text-red-500 mt-1">{errors.internalBatchName}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input 
                        id="quantity" 
                        type="number" 
                        value={formData.quantity} 
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} 
                        placeholder="e.g., 500" 
                        className={errors.quantity ? 'border-red-500' : ''}
                        disabled={state.step !== 'form'}
                      />
                      {errors.quantity && <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>}
                    </div>
                    <div>
                      <Label htmlFor="initialLocation">Manufacturing Location *</Label>
                      <Input 
                        id="initialLocation" 
                        value={formData.initialLocation} 
                        onChange={(e) => setFormData({ ...formData, initialLocation: e.target.value })} 
                        placeholder="e.g., Nagpur Manufacturing Plant" 
                        className={errors.initialLocation ? 'border-red-500' : ''}
                        disabled={state.step !== 'form'}
                      />
                      {errors.initialLocation && <p className="text-sm text-red-500 mt-1">{errors.initialLocation}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="distributorAddress">Select Distributor *</Label>
                    <Select 
                      value={formData.distributorAddress} 
                      onValueChange={(value) => setFormData({ ...formData, distributorAddress: value })}
                      disabled={state.step !== 'form'}
                    >
                      <SelectTrigger className={errors.distributorAddress ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select a distributor" />
                      </SelectTrigger>
                      <SelectContent>
                        {distributors.map(distributor => (
                          <SelectItem key={distributor.value} value={distributor.value}>
                            {distributor.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.distributorAddress && <p className="text-sm text-red-500 mt-1">{errors.distributorAddress}</p>}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex space-x-4">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={state.loading || state.step !== 'form'}
                  >
                    {state.loading ? 'Creating...' : 'Create Batch & Generate QR'}
                  </Button>
                  {state.step !== 'form' && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      disabled={state.loading}
                    >
                      Create New Batch
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Right Side - QR Code and Transfer */}
          <div className="space-y-6">
            {/* QR Code Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5" />
                  <span>QR Code & Batch Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center min-h-[300px] flex flex-col justify-center items-center">
                {state.step === 'form' ? (
                  <div className="text-gray-500">
                    <QrCode className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>QR code will appear here after batch creation.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg inline-block shadow-md border">
                      <Image 
                        src={state.qrCodeUrl} 
                        alt="Batch QR Code" 
                        width={200} 
                        height={200} 
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 break-all">
                        <strong>Batch ID:</strong> {state.batchId}
                      </p>
                      {state.transactionHash && (
                        <p className="text-xs text-gray-600 break-all">
                          <strong>Tx Hash:</strong> {state.transactionHash}
                        </p>
                      )}
                    </div>
                    <Button onClick={downloadQRCode} variant="outline" className="w-full">
                      Download QR Code
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Batch Information Display */}
            {state.step !== 'form' && (
              <Card>
                <CardHeader>
                  <CardTitle>Batch Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Product:</p>
                      <p className="text-gray-600">{formData.name}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Quantity:</p>
                      <p className="text-gray-600">{formData.quantity} units</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Category:</p>
                      <p className="text-gray-600">{formData.category}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Cost per item:</p>
                      <p className="text-gray-600">${formData.cost}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Internal Batch:</p>
                      <p className="text-gray-600">{formData.internalBatchName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Location:</p>
                      <p className="text-gray-600">{formData.initialLocation}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Selected Distributor:</p>
                    <p className="text-gray-600 text-xs">
                      {distributors.find(d => d.value === formData.distributorAddress)?.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transfer Section */}
            <Card className={state.step === 'form' ? 'bg-gray-50 opacity-50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowRight className="h-5 w-5" />
                  <span>Transfer to Distributor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {state.step === 'form' ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Create a batch first, then you can transfer it to the selected distributor.
                    </AlertDescription>
                  </Alert>
                ) : state.step === 'created' ? (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Batch created successfully! Ready to transfer to distributor.
                      </AlertDescription>
                    </Alert>
                    <Button 
                      onClick={handleTransfer} 
                      className="w-full" 
                      disabled={state.loading}
                    >
                      {state.loading ? 'Transferring...' : 'Transfer to Distributor'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      ✅ Batch successfully transferred to distributor! The batch is now in transit.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Data Storage Info</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-700">
                <div className="space-y-2">
                  <p><strong>Supabase stores:</strong> Product details, pricing, descriptions</p>
                  <p><strong>Blockchain stores:</strong> Batch tracking, manufacturing data, transfer history</p>
                  <p><strong>Both systems:</strong> Are linked via batch ID for complete traceability</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
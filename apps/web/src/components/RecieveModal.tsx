// src/components/ReceiveModal.tsx
import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ReceiveModalProps {
  batchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onReceiveSuccess: () => void
}

export default function ReceiveModal({
  batchId,
  open,
  onOpenChange,
  onReceiveSuccess,
}: ReceiveModalProps) {
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReceive = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/batches/${batchId}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Receive failed')
      }

      alert('Receive successful!')
      onReceiveSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Receive Batch</DialogTitle>
          <DialogDescription>
            Enter the location where you are receiving the batch.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="batchId" className="text-right">
              Batch ID
            </Label>
            <Input id="batchId" value={batchId} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Warehouse A"
              className="col-span-3"
            />
          </div>
          {error && <p className="text-red-500 col-span-4 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleReceive} disabled={loading}>
            {loading ? 'Receiving...' : 'Receive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
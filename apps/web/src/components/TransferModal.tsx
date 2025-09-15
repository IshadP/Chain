// src/components/TransferModal.tsx
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

interface TransferModalProps {
  batchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransferSuccess: () => void
}

export default function TransferModal({
  batchId,
  open,
  onOpenChange,
  onTransferSuccess,
}: TransferModalProps) {
  const [newHolderAddress, setNewHolderAddress] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTransfer = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/batches/${batchId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newHolderAddress, newLocation }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Transfer failed')
      }

      alert('Transfer successful!')
      onTransferSuccess()
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
          <DialogTitle>Transfer Batch</DialogTitle>
          <DialogDescription>
            Enter the details of the new holder to transfer the batch.
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
            <Label htmlFor="newHolderAddress" className="text-right">
              New Holder
            </Label>
            <Input
              id="newHolderAddress"
              value={newHolderAddress}
              onChange={(e) => setNewHolderAddress(e.target.value)}
              placeholder="0x..."
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="newLocation" className="text-right">
              New Location
            </Label>
            <Input
              id="newLocation"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="e.g., Warehouse B"
              className="col-span-3"
            />
          </div>
          {error && <p className="text-red-500 col-span-4 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleTransfer} disabled={loading}>
            {loading ? 'Transferring...' : 'Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { getUserRole } from '@/lib/user'
import { getContractInstance } from '@/lib/blockchain'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { batchId } = body

    const userRole = await getUserRole(userId)
    const contract = await getContractInstance()

    // Get batch info
    const batch = await contract.getBatch(batchId)
    
    // Determine action based on role and batch status
    if (userRole === 'Distributor' && batch.status === 0) { // Created
      // Distributor can mark as in transit
      const tx = await contract.transferBatch(batchId, batch.currentOwner, 'In Transit')
      await tx.wait()
    } else if (userRole === 'Retailer' && batch.status === 1) { // InTransit
      // Retailer can mark as received
      const tx = await contract.markReceived(batchId)
      await tx.wait()
    }

    return NextResponse.json({ 
      success: true,
      action: userRole === 'Retailer' ? 'received' : 'transit'
    })
  } catch (error) {
    console.error('Error adding batch to inventory:', error)
    return NextResponse.json(
      { error: 'Failed to add batch to inventory' },
      { status: 500 }
    )
  }
}
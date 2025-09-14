import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { getContractInstance } from '@/lib/blockchain'

export async function POST(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { batchId } = params

    // Mark batch as received on blockchain
    const contract = await getContractInstance()
    const tx = await contract.markReceived(batchId)
    await tx.wait()

    return NextResponse.json({
      success: true,
      transactionHash: tx.hash,
    })
  } catch (error) {
    console.error('Error marking batch as received:', error)
    return NextResponse.json(
      { error: 'Failed to mark batch as received' },
      { status: 500 }
    )
  }
}
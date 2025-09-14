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

    const body = await request.json()
    const { to, nextLocation } = body
    const { batchId } = params

    // Transfer batch on blockchain
    const contract = await getContractInstance()
    const tx = await contract.transferBatch(batchId, to, nextLocation)
    await tx.wait()

    return NextResponse.json({
      success: true,
      transactionHash: tx.hash,
    })
  } catch (error) {
    console.error('Error transferring batch:', error)
    return NextResponse.json(
      { error: 'Failed to transfer batch' },
      { status: 500 }
    )
  }
}
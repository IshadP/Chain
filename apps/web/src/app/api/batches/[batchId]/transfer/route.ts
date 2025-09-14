// src/app/api/batches/[batchId]/transfer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ethers } from 'ethers'
import { getContractInstance } from '@/lib/blockchain'

interface TransferRequest {
  newHolderAddress: string
  newLocation: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { batchId } = params
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    const body: TransferRequest = await request.json()
    const { newHolderAddress, newLocation } = body

    // Validate required fields
    if (!newHolderAddress || !newLocation) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'newHolderAddress and newLocation are required'
      }, { status: 400 })
    }

    // Validate Ethereum address
    if (!ethers.isAddress(newHolderAddress)) {
      return NextResponse.json({
        error: 'Invalid address',
        details: 'newHolderAddress must be a valid Ethereum address'
      }, { status: 400 })
    }

    console.log(`Transferring batch ${batchId} to ${newHolderAddress}`)

    // Get contract instance
    const contract = await getContractInstance()

    // First, verify the batch exists and the user owns it
    try {
      const batchData = await contract.getBatch(batchId)
      if (batchData.userId !== userId) {
        return NextResponse.json({
          error: 'Access denied',
          details: 'You can only transfer batches that you own'
        }, { status: 403 })
      }
    } catch (error) {
      return NextResponse.json({
        error: 'Batch not found',
        details: `Batch ${batchId} does not exist on the blockchain`
      }, { status: 404 })
    }

    // Execute the transfer transaction
    try {
      const tx = await contract.transferBatch(batchId, newHolderAddress, newLocation)
      console.log('Transfer transaction sent:', tx.hash)
      
      const receipt = await tx.wait()
      console.log('Transfer transaction confirmed:', receipt.hash)

      return NextResponse.json({
        success: true,
        message: 'Batch transferred successfully',
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        batchId,
        newHolder: newHolderAddress,
        newLocation
      })

    } catch (contractError) {
      console.error('Contract error during transfer:', contractError)
      
      // Parse contract error for better user feedback
      let errorMessage = 'Transfer failed'
      if (contractError instanceof Error) {
        if (contractError.message.includes('Only current holder can transfer')) {
          errorMessage = 'Only the current holder can transfer this batch'
        } else if (contractError.message.includes('Cannot transfer to same address')) {
          errorMessage = 'Cannot transfer batch to the same address'
        } else if (contractError.message.includes('Invalid address')) {
          errorMessage = 'Invalid recipient address'
        } else {
          errorMessage = contractError.message
        }
      }

      return NextResponse.json({
        error: 'Transfer failed',
        details: errorMessage
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error transferring batch:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({
      error: 'Transfer failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET endpoint to check transfer eligibility
export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { batchId } = params
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    const contract = await getContractInstance()

    try {
      const batchData = await contract.getBatch(batchId)
      
      const canTransfer = batchData.userId === userId && batchData.currentHolder === userId
      const isOwner = batchData.userId === userId
      
      return NextResponse.json({
        success: true,
        batchId,
        canTransfer,
        isOwner,
        currentHolder: batchData.currentHolder,
        currentLocation: batchData.currentLocation,
        status: batchData.status,
        message: canTransfer 
          ? 'Batch can be transferred' 
          : isOwner 
            ? 'Batch owned but not currently held by you'
            : 'You do not own this batch'
      })

    } catch (error) {
      return NextResponse.json({
        error: 'Batch not found',
        details: `Batch ${batchId} does not exist on the blockchain`
      }, { status: 404 })
    }

  } catch (error) {
    console.error('Error checking transfer eligibility:', error)
    return NextResponse.json({
      error: 'Failed to check transfer eligibility',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
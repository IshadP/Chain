// src/app/api/batches/[batchId]/transfer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ethers } from 'ethers'
import { getContractInstance, Role } from '@/lib/blockchain'

// Define interfaces for the two types of requests
interface StatusUpdateRequest {
  type: 'statusUpdate'
  newStatus: number
  newLocation: string
}

interface OwnershipTransferRequest {
  type: 'ownershipTransfer'
  newHolderAddress: string
  newLocation: string
}

type TransferRequest = StatusUpdateRequest | OwnershipTransferRequest

async function handleStatusUpdate(contract: ethers.Contract, batchId: string, newStatus: number, newLocation: string) {
  try {
    const tx = await contract.updateBatchStatus(batchId, newStatus, newLocation)
    const receipt = await tx.wait()
    return NextResponse.json({
      success: true,
      message: 'Batch status updated successfully',
      transactionHash: tx.hash,
    })
  } catch (contractError: any) {
    console.error('Contract error during status update:', contractError)
    const errorMessage = contractError.reason || 'Status update failed on-chain'
    return NextResponse.json({ error: 'Status update failed', details: errorMessage }, { status: 400 })
  }
}

async function handleOwnershipTransfer(contract: ethers.Contract, batchId: string, newHolderAddress: string, newLocation: string) {
  try {
    const tx = await contract.transferBatchOwnership(batchId, newHolderAddress, newLocation)
    const receipt = await tx.wait()
    return NextResponse.json({
      success: true,
      message: 'Batch ownership transferred successfully',
      transactionHash: tx.hash,
    })
  } catch (contractError: any) {
    console.error('Contract error during ownership transfer:', contractError)
    const errorMessage = contractError.reason || 'Ownership transfer failed on-chain'
    return NextResponse.json({ error: 'Ownership transfer failed', details: errorMessage }, { status: 400 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { sessionClaims } = auth();
    if (!sessionClaims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = sessionClaims.publicMetadata?.role as Role;
    if (!userRole || !['manufacturer', 'distributor', 'retailer'].includes(userRole)) {
        return NextResponse.json({ error: 'Invalid or missing role for this action' }, { status: 403 });
    }

    const { batchId } = params;
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const body: TransferRequest = await request.json();
    const contract = await getContractInstance(userRole);

    if (body.type === 'statusUpdate') {
      const { newStatus, newLocation } = body as StatusUpdateRequest;
      if (newStatus === undefined || !newLocation) {
        return NextResponse.json({ error: 'Missing fields for status update' }, { status: 400 });
      }
      return await handleStatusUpdate(contract, batchId, newStatus, newLocation);

    } else if (body.type === 'ownershipTransfer') {
      const { newHolderAddress, newLocation } = body as OwnershipTransferRequest;
      if (!newHolderAddress || !newLocation || !ethers.isAddress(newHolderAddress)) {
        return NextResponse.json({ error: 'Invalid fields for ownership transfer' }, { status: 400 });
      }
      return await handleOwnershipTransfer(contract, batchId, newHolderAddress, newLocation);

    } else {
      return NextResponse.json({ error: 'Invalid request type specified' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in transfer route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Request failed', details: errorMessage }, { status: 500 });
  }
}
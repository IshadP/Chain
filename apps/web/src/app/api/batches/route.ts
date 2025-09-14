import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { ethers } from 'ethers'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'
import { getContractInstance } from '@/lib/blockchain'
import { generateQRToken } from '@/lib/qr'

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, sku, quantity, description, initialLocation, distributorAddress } = body

    // Generate batch ID
    const batchId = ethers.keccak256(ethers.toUtf8Bytes(`${sku}-${Date.now()}`))

    // Store metadata in Firebase
    const batchData = {
      id: batchId,
      name,
      sku,
      quantity,
      description,
      initialLocation,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      images: [],
      metadataUri: '',
    }

    await addDoc(collection(db, 'batches'), batchData)

    // Create batch on blockchain
    const contract = await getContractInstance()
    const tx = await contract.createBatch(batchId, distributorAddress, initialLocation)
    await tx.wait()

    // Generate QR code URL with token
    const token = generateQRToken(batchId)
    const qrUrl = `${process.env.NEXTJS_URL || 'http://localhost:3000'}/qr/${batchId}?t=${token}`

    return NextResponse.json({
      batchId,
      qrUrl,
      transactionHash: tx.hash,
    })
  } catch (error) {
    console.error('Error creating batch:', error)
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    )
  }
}
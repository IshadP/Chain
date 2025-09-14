import { NextRequest, NextResponse } from 'next/server'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'
import { getContractInstance } from '@/lib/blockchain'

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { batchId } = params

    // Get blockchain data
    const contract = await getContractInstance()
    const [batch, events] = await Promise.all([
      contract.getBatch(batchId),
      contract.queryFilter(contract.filters.BatchCreated(batchId)),
    ])

    // Get Firebase metadata
    const batchesRef = collection(db, 'batches')
    const q = query(batchesRef, where('id', '==', batchId))
    const querySnapshot = await getDocs(q)
    
    let metadata = null
    querySnapshot.forEach((doc) => {
      metadata = doc.data()
    })

    if (!batch || !metadata) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Combine blockchain and Firebase data
    const combinedData = {
      id: batch.id,
      name: metadata.name,
      sku: metadata.sku,
      quantity: metadata.quantity,
      description: metadata.description,
      currentLocation: batch.currentLocation,
      currentOwner: batch.currentOwner,
      status: ['Created', 'InTransit', 'Delivered', 'Received'][batch.status],
      manufacturer: batch.manufacturer,
      createdAt: new Date(Number(batch.createdAt) * 1000).toISOString(),
      events: events.map(event => ({
        type: 'BatchCreated',
        timestamp: new Date(Number(event.args.timestamp) * 1000).toISOString(),
        location: event.args.initialLocation,
        txHash: event.transactionHash,
      })),
      images: metadata.images || [],
    }

    return NextResponse.json(combinedData)
  } catch (error) {
    console.error('Error fetching batch:', error)
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    )
  }
}
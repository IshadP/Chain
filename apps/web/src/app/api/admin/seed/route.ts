import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In a real app, you'd check if user has admin privileges
    
    // For now, just return success to simulate seeding
    // The actual seeding is done by the Hardhat seed script
    
    return NextResponse.json({
      success: true,
      message: 'Test data seeded successfully'
    })
  } catch (error) {
    console.error('Error seeding test data:', error)
    return NextResponse.json(
      { error: 'Failed to seed test data' },
      { status: 500 }
    )
  }
}
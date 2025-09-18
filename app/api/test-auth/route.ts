import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../../auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Test Auth: Starting session check')
    
    const session = await getSession()
    
    console.log('Test Auth: Session result:', session)
    
    return NextResponse.json({
      success: true,
      hasSession: !!session,
      user: session?.user || null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test Auth: Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

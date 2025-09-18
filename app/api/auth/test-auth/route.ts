import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Global Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST(request: NextRequest) {
  try {
    console.log('Test Auth: Starting authentication test')
    
    const body = await request.json()
    const { email, password } = body
    
    console.log('Test Auth: Received credentials for:', email)
    
    // Test database connection
    const user = await prisma.users.findUnique({
      where: { email: email }
    })
    
    if (!user) {
      console.log('Test Auth: User not found')
      return NextResponse.json({ success: false, error: 'User not found' })
    }
    
    console.log('Test Auth: User found:', { id: user.id, email: user.email, role: user.role })
    
    // Test password check
    const isValid = password === 'AdminPass123!' && email === 'admin@jwscheduler.local'
    
    if (!isValid) {
      console.log('Test Auth: Invalid credentials')
      return NextResponse.json({ success: false, error: 'Invalid credentials' })
    }
    
    console.log('Test Auth: Authentication successful')
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      }
    })
    
  } catch (error) {
    console.error('Test Auth: Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Auth test endpoint - use POST with email/password' })
}

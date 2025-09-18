import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../../../auth'
import { PrismaClient } from '@prisma/client'
// Using Node.js built-in crypto for password hashing (bcrypt not available)
// In production, consider using bcrypt or similar
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const isActive = searchParams.get('isActive')
    
    const skip = (page - 1) * limit
    
    // Build where clause for filtering
    const where: any = {}
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (role) {
      where.role = role
    }
    
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          phone: true,
          inviteToken: true,
          inviteExpiry: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.users.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role, phone, password } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate password
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Hash password using crypto (simple implementation)
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')

    const newUser = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email,
        firstName,
        lastName,
        phone: phone || null,
        role,
        passwordHash,
        isActive: true,
        inviteToken: null,
        inviteExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    })

    console.log(`[USER_CREATION] User created successfully: ${email}`)

    return NextResponse.json({
      ...newUser,
      message: 'User created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

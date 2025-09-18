import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.users.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        inviteToken: true,
        inviteExpiry: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// UPDATE user by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { email, firstName, lastName, phone, role, isActive } = body

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.users.findFirst({
      where: {
        email,
        NOT: { id: params.id }
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    const updatedUser = await prisma.users.update({
      where: { id: params.id },
      data: {
        email,
        firstName,
        lastName,
        phone: phone || null,
        ...(role && { role }),
        ...(typeof isActive === 'boolean' && { isActive }),
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
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE user by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id: params.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.users.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ message: 'User deactivated successfully' })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}

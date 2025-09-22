import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedSession } from '@/lib/auth-helpers'
import { successResponse, errorResponse, handleAPIError } from '@/lib/api-utils'
import { UpdateUserSchema, IdParamSchema } from '@/lib/validations'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/users/[id] - Get user by ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getAuthenticatedSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { id } = IdParamSchema.parse(params)

    // Users can only view their own profile unless they're admin/overseer
    const canViewAll = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER'].includes(session.user.role)
    if (!canViewAll && session.user.id !== id) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    })

    if (!user) {
      return errorResponse('User not found', 404)
    }

    return successResponse(user)
  } catch (error) {
    return handleAPIError(error)
  }
}

/**
 * PUT /api/users/[id] - Update user
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getAuthenticatedSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { id } = IdParamSchema.parse(params)
    const body = await req.json()
    const data = UpdateUserSchema.parse(body)

    // Users can only update their own profile unless they're admin
    const canUpdateAll = session.user.role === 'ADMIN'
    if (!canUpdateAll && session.user.id !== id) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    // Non-admins cannot change role
    if (!canUpdateAll && data.role) {
      return NextResponse.json({ success: false, error: 'Cannot change role' }, { status: 403 })
    }

    const user = await prisma.users.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        updatedAt: true
      }
    })

    return successResponse(user, 'User updated successfully')
  } catch (error) {
    return handleAPIError(error)
  }
}

/**
 * DELETE /api/users/[id] - Delete user (Admin only)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and admin role
    const session = await getAuthenticatedSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { id } = IdParamSchema.parse(params)

    // Prevent self-deletion
    if (session.user.id === id) {
      return errorResponse('Cannot delete your own account', 400)
    }

    await prisma.users.delete({
      where: { id }
    })

    return successResponse(null, 'User deleted successfully')
  } catch (error) {
    return handleAPIError(error)
  }
}

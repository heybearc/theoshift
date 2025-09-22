import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdminAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { successResponse, errorResponse, handleAPIError } from '@/lib/api-utils'
import { UpdateUserSchema, IdParamSchema } from '@/lib/validations'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/users/[id] - Get user by ID
 */
export const GET = withAuth(async (req: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { id } = IdParamSchema.parse(params)

    // Users can only view their own profile unless they're admin/overseer
    const canViewAll = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER'].includes(req.user!.role)
    if (!canViewAll && req.user!.id !== id) {
      return errorResponse('Insufficient permissions', 403)
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
})

/**
 * PUT /api/users/[id] - Update user
 */
export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { id } = IdParamSchema.parse(params)
    const body = await req.json()
    const data = UpdateUserSchema.parse(body)

    // Users can only update their own profile unless they're admin
    const canUpdateAll = req.user!.role === 'ADMIN'
    if (!canUpdateAll && req.user!.id !== id) {
      return errorResponse('Insufficient permissions', 403)
    }

    // Non-admins cannot change role
    if (!canUpdateAll && data.role) {
      return errorResponse('Cannot change role', 403)
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
})

/**
 * DELETE /api/users/[id] - Delete user (Admin only)
 */
export const DELETE = withAdminAuth(async (req: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { id } = IdParamSchema.parse(params)

    // Prevent self-deletion
    if (req.user!.id === id) {
      return errorResponse('Cannot delete your own account', 400)
    }

    await prisma.users.delete({
      where: { id }
    })

    return successResponse(null, 'User deleted successfully')
  } catch (error) {
    return handleAPIError(error)
  }
})

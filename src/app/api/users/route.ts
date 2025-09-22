import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdminAuth } from '@/lib/auth-middleware'
import { successResponse, errorResponse, handleAPIError, parsePagination, createPagination } from '@/lib/api-utils'
import { CreateUserSchema, UserQuerySchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'

/**
 * GET /api/users - List users with pagination and filtering
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const query = UserQuerySchema.parse(Object.fromEntries(searchParams))
    const { page, limit, skip } = parsePagination(searchParams)

    // Build where clause
    const where: any = {}
    
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } }
      ]
    }
    
    if (query.role) {
      where.role = query.role
    }
    
    if (query.isActive !== undefined) {
      where.isActive = query.isActive
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.users.count({ where })
    ])

    const pagination = createPagination(page, limit, total)

    return successResponse(users, undefined, pagination)
  } catch (error) {
    return handleAPIError(error)
  }
})

/**
 * POST /api/users - Create new user (Admin only)
 */
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const data = CreateUserSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return errorResponse('User with this email already exists', 409)
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8)
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    // Create user
    const user = await prisma.users.create({
      data: {
        ...data,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true
      }
    })

    // TODO: Send invitation email with temporary password
    // This will be implemented when we add the email service

    return successResponse(
      { ...user, tempPassword }, 
      'User created successfully'
    )
  } catch (error) {
    return handleAPIError(error)
  }
})

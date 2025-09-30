import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    switch (req.method) {
      case 'GET':
        return await handleGetUsers(req, res)
      case 'POST':
        return await handleCreateUser(req, res)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('User API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetUsers(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '10', search = '', role = '' } = req.query
  
  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  const where: any = {}
  
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } }
    ]
  }
  
  if (role) {
    where.role = role
  }

  try {
    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          _count: {
            select: { attendants: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.users.count({ where })
    ])

    const pages = Math.ceil(total / limitNum)

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages
        }
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch users' })
  }
}

async function handleCreateUser(req: NextApiRequest, res: NextApiResponse) {
  const { firstName, lastName, email, role = 'USER', isActive = true } = req.body

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' })
    }

    const user = await prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        role,
        isActive
      },
      include: {
        _count: {
          select: { attendants: true }
        }
      }
    })

    return res.status(201).json({
      success: true,
      data: { user }
    })
  } catch (error) {
    console.error('Create user error:', error)
    return res.status(500).json({ success: false, error: 'Failed to create user' })
  }
}

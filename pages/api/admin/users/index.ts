import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import crypto from 'crypto'

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
          attendants: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
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
  const { firstName, lastName, email, role = 'ATTENDANT', isActive = true, linkedAttendantId, sendInvitation = false } = req.body

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

    // Generate invitation token if sending invitation
    let inviteToken: string | null = null
    let inviteExpiry: Date | null = null
    
    if (sendInvitation) {
      inviteToken = crypto.randomBytes(32).toString('hex')
      inviteExpiry = new Date()
      inviteExpiry.setDate(inviteExpiry.getDate() + 7) // 7 days expiration
    }

    const user = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        firstName,
        lastName,
        email,
        role,
        isActive,
        inviteToken,
        inviteExpiry,
        updatedAt: new Date()
      }
    })

    // Handle attendant linking if provided
    if (linkedAttendantId) {
      try {
        await prisma.attendants.update({
          where: { id: linkedAttendantId },
          data: { userId: user.id }
        })
      } catch (linkError) {
        console.error('Failed to link attendant:', linkError)
        // Don't fail the user creation, just log the error
      }
    }

    // TODO: Send invitation email if sendInvitation is true
    // This would integrate with the existing invitation system
    if (sendInvitation && inviteToken) {
      console.log(`Invitation token generated for ${email}: ${inviteToken}`)
      // The invitation email sending would be implemented here
    }

    return res.status(201).json({
      success: true,
      data: { user },
      message: sendInvitation ? 'User created and invitation sent' : 'User created successfully'
    })
  } catch (error) {
    console.error('Create user error:', error)
    return res.status(500).json({ success: false, error: 'Failed to create user' })
  }
}

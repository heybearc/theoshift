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

    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid user ID' })
    }

    switch (req.method) {
      case 'GET':
        return await handleGetUser(req, res, id)
      case 'PUT':
        return await handleUpdateUser(req, res, id)
      case 'DELETE':
        return await handleDeleteUser(req, res, id)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('User API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetUser(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const user = await prisma.users.findUnique({
      where: { id }
    })

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    return res.status(200).json({
      success: true,
      data: { user }
    })
  } catch (error) {
    console.error('Get user error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch user' })
  }
}

async function handleUpdateUser(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { firstName, lastName, email, role, isActive } = req.body

  try {
    const user = await prisma.users.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(role && { role }),
        ...(typeof isActive === 'boolean' && { isActive })
      },
      include: {
        _count: {
          select: { attendants: true }
        }
      }
    })

    return res.status(200).json({
      success: true,
      data: { user }
    })
  } catch (error) {
    console.error('Update user error:', error)
    return res.status(500).json({ success: false, error: 'Failed to update user' })
  }
}

async function handleDeleteUser(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id }
    })

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Check if user has associated attendants
    const attendantCount = await prisma.attendants.count({
      where: { userId: id }
    })

    if (attendantCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete user with associated attendants' 
      })
    }

    await prisma.users.delete({
      where: { id }
    })

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return res.status(500).json({ success: false, error: 'Failed to delete user' })
  }
}

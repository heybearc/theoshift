import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { canManagePermissions } from '../../../../src/lib/eventAccess'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || !session.user?.email) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { id: eventId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    // Get user
    const user = await prisma.users.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Check if user can manage permissions (must be OWNER)
    const canManage = await canManagePermissions(user.id, eventId)

    if (req.method === 'GET') {
      // Get all permissions for this event
      const permissions = await prisma.event_permissions.findMany({
        where: { eventId },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: [
          { role: 'asc' },
          { users: { firstName: 'asc' } }
        ]
      })

      return res.status(200).json({
        success: true,
        data: {
          permissions,
          canManage
        }
      })
    }

    // All other methods require OWNER permission
    if (!canManage) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only event owners can manage permissions' 
      })
    }

    if (req.method === 'POST') {
      // Add new permission
      const { userId, role, scopeType, scopeIds } = req.body

      if (!userId || !role) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId and role are required' 
        })
      }

      // Check if permission already exists
      const existing = await prisma.event_permissions.findUnique({
        where: { userId_eventId: { userId, eventId } }
      })

      if (existing) {
        return res.status(400).json({ 
          success: false, 
          error: 'Permission already exists for this user' 
        })
      }

      const permission = await prisma.event_permissions.create({
        data: {
          id: require('crypto').randomUUID(),
          userId,
          eventId,
          role,
          scopeType: scopeType || null,
          scopeIds: scopeIds || null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })

      return res.status(201).json({
        success: true,
        data: permission,
        message: 'Permission granted successfully'
      })
    }

    if (req.method === 'DELETE') {
      // Remove permission
      const { userId } = req.body

      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId is required' 
        })
      }

      // Don't allow removing the last OWNER
      const ownerCount = await prisma.event_permissions.count({
        where: {
          eventId,
          role: 'OWNER'
        }
      })

      const permissionToDelete = await prisma.event_permissions.findUnique({
        where: { userId_eventId: { userId, eventId } }
      })

      if (permissionToDelete?.role === 'OWNER' && ownerCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove the last owner'
        })
      }

      await prisma.event_permissions.delete({
        where: { userId_eventId: { userId, eventId } }
      })

      return res.status(200).json({
        success: true,
        message: 'Permission removed successfully'
      })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('Event permissions API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

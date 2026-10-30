import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { canManagePermissions } from '../../../../../src/lib/eventAccess'
import { handleApiError } from '@/lib/apiError'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || !session.user?.email) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { id: eventId, userId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'User ID is required' })
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Check if current user can manage permissions (must be OWNER)
    const canManage = await canManagePermissions(currentUser.id, eventId)
    
    if (!canManage) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' })
    }

    if (req.method === 'PUT') {
      const { role } = req.body

      if (!role || !['VIEWER', 'SUPPORT', 'COORDINATOR', 'ADMIN'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' })
      }

      // Get existing permission
      const existingPermission = await prisma.event_permissions.findFirst({
        where: { 
          eventId,
          userId 
        }
      })

      if (!existingPermission) {
        return res.status(404).json({ success: false, error: 'Permission not found' })
      }

      // If demoting from ADMIN, ensure at least one ADMIN remains
      if (existingPermission.role === 'ADMIN' && role !== 'ADMIN') {
        const adminCount = await prisma.event_permissions.count({
          where: { 
            eventId,
            role: 'ADMIN' 
          }
        })

        if (adminCount <= 1) {
          return res.status(400).json({ 
            success: false, 
            error: 'Cannot remove the last ADMIN. At least one ADMIN must remain.' 
          })
        }
      }

      // Update the role
      const updatedPermission = await prisma.event_permissions.update({
        where: { id: existingPermission.id },
        data: { role },
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

      return res.status(200).json({ 
        success: true, 
        data: updatedPermission,
        message: 'Role updated successfully'
      })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })

  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

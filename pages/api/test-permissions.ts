import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { getUserEvents, checkEventAccess, canManageAttendants } from '../../src/lib/eventAccess'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user from database
    const { prisma } = await import('../../src/lib/prisma')
    const user = await prisma.users.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get all events user has access to
    const events = await getUserEvents(user.id)

    // Check permissions for each event
    const eventPermissions = await Promise.all(
      events.map(async (event) => {
        const permission = await checkEventAccess(user.id, event.id)
        const canManage = await canManageAttendants(user.id, event.id)

        return {
          eventId: event.id,
          eventName: event.name,
          userRole: event.userRole,
          scopeType: event.scopeType,
          scopeIds: event.scopeIds,
          canManageAttendants: canManage,
          permission
        }
      })
    )

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      eventsCount: events.length,
      events: eventPermissions
    })
  } catch (error) {
    console.error('Test permissions error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if user is admin
  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
    select: { role: true }
  })

  if (user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' })
  }

  if (req.method === 'GET') {
    try {
      // Fetch all active sessions with user information
      const sessions = await prisma.session.findMany({
        where: {
          expires: {
            gt: new Date() // Only active (non-expired) sessions
          }
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              firstName: true,
              lastName: true,
              isActive: true
            }
          }
        },
        orderBy: {
          expires: 'desc'
        }
      })

      // Transform sessions to include useful metadata
      const activeSessions = sessions.map(s => ({
        id: s.id,
        userId: s.userId,
        userName: s.users.name || `${s.users.firstName} ${s.users.lastName}`,
        userEmail: s.users.email,
        userRole: s.users.role,
        isUserActive: s.users.isActive,
        sessionToken: s.sessionToken.substring(0, 8) + '...', // Truncated for security
        expires: s.expires,
        isExpired: s.expires < new Date(),
        daysUntilExpiry: Math.ceil((s.expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }))

      return res.status(200).json({
        sessions: activeSessions,
        total: activeSessions.length,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error fetching sessions:', error)
      return res.status(500).json({ error: 'Failed to fetch sessions' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

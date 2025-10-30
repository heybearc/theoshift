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
      // Since we're using JWT strategy, we can't track active sessions from the database
      // Instead, we'll show all active users and their last activity
      
      // Get all active users
      const users = await prisma.users.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      // Transform to include useful metadata
      const activeUsers = users.map(u => ({
        id: u.id,
        userName: u.name || `${u.firstName} ${u.lastName}`,
        userEmail: u.email,
        userRole: u.role,
        isUserActive: u.isActive,
        createdAt: u.createdAt,
        lastUpdated: u.updatedAt,
        daysSinceCreated: Math.floor((Date.now() - u.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      }))

      return res.status(200).json({
        users: activeUsers,
        total: activeUsers.length,
        timestamp: new Date().toISOString(),
        note: 'Using JWT session strategy - showing active users instead of database sessions'
      })
    } catch (error) {
      console.error('Error fetching active users:', error)
      return res.status(500).json({ error: 'Failed to fetch active users' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get all users (no auth required for debugging)
      const users = await prisma.users.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Also check attendants table
      const attendants = await prisma.attendants.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          congregation: true,
          isActive: true
        },
        take: 10
      })

      return res.json({
        success: true,
        data: {
          users: users,
          totalUsers: users.length,
          attendants: attendants,
          totalAttendants: attendants.length,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}

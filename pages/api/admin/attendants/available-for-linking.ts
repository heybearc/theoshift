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

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    // Get attendants that are not linked to any user account
    const availableAttendants = await prisma.attendants.findMany({
      where: {
        userId: null,
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        congregation: true,
        isActive: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    return res.status(200).json({
      success: true,
      data: {
        attendants: availableAttendants
      }
    })
  } catch (error) {
    console.error('Available attendants API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // Check admin authentication
    const session = await getServerSession(req, res, authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }

    const { attendantId } = req.body

    if (!attendantId) {
      return res.status(400).json({ success: false, error: 'Attendant ID is required' })
    }

    // Set profile verification requirement using raw SQL to avoid Prisma client issues
    await prisma.$executeRaw`
      UPDATE attendants 
      SET "profileVerificationRequired" = true, "updatedAt" = NOW() 
      WHERE id = ${attendantId}
    `

    return res.status(200).json({
      success: true,
      message: 'Profile verification requirement set successfully'
    })
  } catch (error) {
    console.error('Force verification error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to set verification requirement'
    })
  }
}

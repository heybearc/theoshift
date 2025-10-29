import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || !session.user?.email) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { version } = req.body

    if (!version) {
      return res.status(400).json({ success: false, error: 'Version is required' })
    }

    // Update user's lastSeenReleaseVersion
    await prisma.users.update({
      where: { email: session.user.email },
      data: { 
        lastSeenReleaseVersion: version,
        updatedAt: new Date()
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Release banner dismissed'
    })
  } catch (error) {
    console.error('Dismiss release banner error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to dismiss banner'
    })
  }
}

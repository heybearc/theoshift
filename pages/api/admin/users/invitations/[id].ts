import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid invitation ID' })
    }

    switch (req.method) {
      case 'DELETE':
        return await handleDeleteInvitation(req, res, id)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Invitation API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleDeleteInvitation(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const invitation = await prisma.users.findUnique({
      where: {inviteToken: id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        inviteToken: true,
        inviteExpiry: true,
        createdAt: true,
        createdBy: true
      }
    })
    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invitation not found' })
    }

    await prisma.users.update({
      where: { inviteToken: id },
      data: { inviteToken: null, inviteExpiry: null }
    })

    return res.status(200).json({
      success: true,
      message: 'Invitation deleted successfully'
    })
  } catch (error) {
    console.error('Delete invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to delete invitation' })
  }
}

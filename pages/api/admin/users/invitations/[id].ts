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
      case 'GET':
        return await handleGetInvitation(req, res, id)
      case 'PUT':
        return await handleUpdateInvitation(req, res, id)
      case 'DELETE':
        return await handleCancelInvitation(req, res, id)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Invitation API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetInvitation(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const invitation = await prisma.userInvitations.findUnique({
      where: { id },
      include: {
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invitation not found' })
    }

    return res.status(200).json({
      success: true,
      data: { invitation }
    })
  } catch (error) {
    console.error('Get invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch invitation' })
  }
}

async function handleUpdateInvitation(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { action } = req.body

  if (!action) {
    return res.status(400).json({ success: false, error: 'Action is required' })
  }

  try {
    const invitation = await prisma.userInvitations.findUnique({
      where: { id }
    })

    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invitation not found' })
    }

    let updateData: any = {}

    switch (action) {
      case 'resend':
        if (invitation.status !== 'PENDING') {
          return res.status(400).json({ 
            success: false, 
            error: 'Can only resend pending invitations' 
          })
        }

        // Extend expiration date
        const newExpiresAt = new Date()
        newExpiresAt.setDate(newExpiresAt.getDate() + 7)
        
        updateData = {
          expiresAt: newExpiresAt,
          updatedAt: new Date()
        }

        // TODO: Resend email logic here
        break

      case 'expire':
        updateData = {
          status: 'EXPIRED',
          updatedAt: new Date()
        }
        break

      default:
        return res.status(400).json({ success: false, error: 'Invalid action' })
    }

    const updatedInvitation = await prisma.userInvitations.update({
      where: { id },
      data: updateData,
      include: {
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return res.status(200).json({
      success: true,
      data: { invitation: updatedInvitation },
      message: `Invitation ${action}ed successfully`
    })
  } catch (error) {
    console.error('Update invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to update invitation' })
  }
}

async function handleCancelInvitation(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const invitation = await prisma.userInvitations.findUnique({
      where: { id }
    })

    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invitation not found' })
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        error: 'Can only cancel pending invitations' 
      })
    }

    await prisma.userInvitations.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully'
    })
  } catch (error) {
    console.error('Cancel invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to cancel invitation' })
  }
}

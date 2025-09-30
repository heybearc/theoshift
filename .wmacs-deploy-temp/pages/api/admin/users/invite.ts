import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import crypto from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    return await handleCreateInvitation(req, res, session)
  } catch (error) {
    console.error('Invitation API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleCreateInvitation(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { email, firstName, lastName, role = 'ATTENDANT', message } = req.body

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ success: false, error: 'Email, first name, and last name are required' })
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser && !existingUser.inviteToken) {
      return res.status(400).json({ success: false, error: 'User already exists' })
    }

    if (existingUser && existingUser.inviteToken && existingUser.inviteExpiry && existingUser.inviteExpiry > new Date()) {
      return res.status(400).json({ success: false, error: 'Invitation already sent to this email' })
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    // Create or update user with invitation
    const user = existingUser ? 
      await prisma.users.update({
        where: { email },
        data: {
          inviteToken: invitationToken,
          inviteExpiry: expiresAt,
          updatedAt: new Date()
        }
      }) :
      await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email,
          firstName,
          lastName,
          role,
          inviteToken: invitationToken,
          inviteExpiry: expiresAt,
          createdBy: session.user.id,
          updatedAt: new Date()
        }
      })

    // Send invitation email (placeholder)
    const invitationUrl = `${process.env.NEXTAUTH_URL}/auth/accept-invitation?token=${invitationToken}`
    console.log(`Invitation created for ${email}: ${invitationUrl}`)

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        inviteToken: user.inviteToken,
        inviteExpiry: user.inviteExpiry,
        createdAt: user.createdAt
      },
      message: 'Invitation created successfully'
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to create invitation' })
  }
}

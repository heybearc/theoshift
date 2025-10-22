import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { token, password } = req.body

  if (!token || !password) {
    return res.status(400).json({ success: false, error: 'Token and password are required' })
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' })
  }

  try {
    // Find the invitation
    const invitation = await prisma.users.findFirst({
      where: {
        inviteToken: token
      }
    })

    if (!invitation) {
      return res.status(400).json({ success: false, error: 'Invalid or expired invitation' })
    }

    // Check if invitation is expired
    if (invitation.inviteExpiry && new Date() > invitation.inviteExpiry) {
      return res.status(400).json({ success: false, error: 'Invitation has expired' })
    }

    // Check if user already has a password (already activated)
    if (invitation.passwordHash) {
      return res.status(400).json({ success: false, error: 'Invitation has already been used' })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update the user with password and clear invitation token
    const user = await prisma.users.update({
      where: { id: invitation.id },
      data: {
        passwordHash: hashedPassword,
        inviteToken: null,
        inviteExpiry: null,
        updatedAt: new Date()
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Account activated successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Accept invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to accept invitation' })
  }
}

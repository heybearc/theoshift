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
    const invitation = await prisma.userInvitations.findFirst({
      where: {
        invitationToken: token,
        status: 'PENDING'
      }
    })

    if (!invitation) {
      return res.status(400).json({ success: false, error: 'Invalid or expired invitation' })
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      await prisma.userInvitations.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      })
      return res.status(400).json({ success: false, error: 'Invitation has expired' })
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: invitation.email }
    })

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create the user
    const user = await prisma.users.create({
      data: {
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        email: invitation.email,
        password: hashedPassword,
        role: invitation.role,
        isActive: true,
        emailVerified: new Date() // Mark as verified since they came from invitation
      }
    })

    // Update invitation status
    await prisma.userInvitations.update({
      where: { id: invitation.id },
      data: { 
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    })

    // Log the account creation
    console.log(`User account created via invitation: ${user.email} (${user.role})`)

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('Accept invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to create account' })
  }
}

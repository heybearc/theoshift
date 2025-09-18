import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Send invitation to existing user (resend invite)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email } = body

    if (!userId && !email) {
      return NextResponse.json({ error: 'User ID or email required' }, { status: 400 })
    }

    // Find user by ID or email
    const whereClause = userId ? { id: userId } : { email }
    const user = await prisma.users.findUnique({
      where: whereClause
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate new invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex')
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Update user with new invitation token
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: {
        inviteToken,
        inviteExpiry,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        inviteToken: true,
        inviteExpiry: true
      }
    })

    // Send invitation email
    const { EmailService } = await import('../../../../../utils/email')
    const emailSent = await EmailService.sendInvitationEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      inviteToken
    )

    if (!emailSent) {
      console.warn(`[INVITATION] Failed to send invitation email to ${user.email}`)
    }

    console.log(`[INVITATION] Token generated for ${user.email}: ${inviteToken}`)
    console.log(`[INVITATION] Invitation URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/auth/accept-invite?token=${inviteToken}`)

    return NextResponse.json({
      message: 'Invitation sent successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Failed to send invitation:', error)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}

// Bulk invite multiple users
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userIds } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array required' }, { status: 400 })
    }

    const results = []
    const errors = []

    for (const userId of userIds) {
      try {
        // Generate invitation token for each user
        const inviteToken = crypto.randomBytes(32).toString('hex')
        const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        const updatedUser = await prisma.users.update({
          where: { id: userId },
          data: {
            inviteToken,
            inviteExpiry,
            updatedAt: new Date()
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            inviteToken: true
          }
        })

        results.push(updatedUser)
        console.log(`[BULK_INVITATION] Token generated for ${updatedUser.email}: ${inviteToken}`)
      } catch (error) {
        errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: `Bulk invitation completed. ${results.length} successful, ${errors.length} failed.`,
      successful: results,
      failed: errors
    })
  } catch (error) {
    console.error('Failed to send bulk invitations:', error)
    return NextResponse.json({ error: 'Failed to send bulk invitations' }, { status: 500 })
  }
}

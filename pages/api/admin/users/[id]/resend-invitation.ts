import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import * as nodemailer from 'nodemailer'
import crypto from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { id } = req.query

  try {
    // Get the user
    const user = await prisma.users.findUnique({
      where: { id: id as string },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        inviteToken: true,
        passwordHash: true
      }
    })

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    if (user.passwordHash) {
      return res.status(400).json({ success: false, error: 'User has already accepted invitation' })
    }

    // Generate new invitation token and expiry
    const newToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    // Update user with new token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        inviteToken: newToken,
        inviteExpiry: expiresAt,
        updatedAt: new Date()
      }
    })

    // Send invitation email
    const invitationUrl = `${process.env.NEXTAUTH_URL}/auth/accept-invitation?token=${newToken}`
    
    try {
      await sendInvitationEmail(user.email, user.firstName, invitationUrl)
      console.log(`✅ Invitation resent to ${user.email}`)
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the request if email fails
    }

    return res.json({
      success: true,
      message: 'Invitation resent successfully',
      data: {
        invitationUrl // Include URL in response for manual sharing if needed
      }
    })
  } catch (error) {
    console.error('Resend invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to resend invitation' })
  }
}

async function sendInvitationEmail(email: string, firstName: string, invitationUrl: string) {
  // Get email configuration from database
  const emailConfig = await prisma.system_settings.findFirst({
    where: { key: 'email_config' }
  })

  if (!emailConfig) {
    throw new Error('Email configuration not found')
  }

  const { authType, config } = JSON.parse(emailConfig.value)

  // Create transporter
  let transporter
  
  if (authType === 'gmail') {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: config.gmailEmail,
        pass: config.gmailAppPassword
      }
    })
  } else {
    transporter = nodemailer.createTransport({
      host: config.smtpServer,
      port: parseInt(config.smtpPort || '587'),
      secure: config.smtpSecure || false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword
      }
    })
  }

  // Send invitation email
  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: email,
    subject: 'You\'re Invited to JW Attendant Scheduler',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">JW Attendant Scheduler</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${firstName},</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            You've been invited to join <strong>JW Attendant Scheduler</strong>.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Click the button below to accept your invitation and set up your account:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${invitationUrl}" style="color: #2563eb; word-break: break-all;">${invitationUrl}</a>
          </p>
          <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
            ⚠️ This invitation will expire in 7 days.
          </p>
        </div>
        <div style="background-color: #e5e7eb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">JW Attendant Scheduler</p>
          <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `
  })
}

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import * as nodemailer from 'nodemailer'
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

    // Send invitation email
    console.log('DEBUG: NEXTAUTH_URL =', process.env.NEXTAUTH_URL)
    console.log('DEBUG: All env vars:', Object.keys(process.env).filter(k => k.includes('NEXT')))
    const invitationUrl = `${process.env.NEXTAUTH_URL || 'https://blue.theoshift.com'}/auth/accept-invitation?token=${invitationToken}`
    console.log('DEBUG: Generated invitation URL:', invitationUrl)
    
    try {
      await sendInvitationEmail(email, firstName, invitationUrl, message)
      console.log(`Invitation email sent to ${email}`)
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the invitation creation if email fails
      // The invitation link is logged and can be shared manually
    }

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
        createdAt: user.createdAt,
        invitationUrl // Include URL in response for manual sharing if needed
      },
      message: 'Invitation created successfully'
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to create invitation' })
  }
}

async function sendInvitationEmail(email: string, firstName: string, invitationUrl: string, customMessage?: string) {
  // Get email configuration from database
  const emailConfig = await prisma.system_settings.findFirst({
    where: { key: 'email_config' }
  })

  if (!emailConfig) {
    throw new Error('Email configuration not found. Please configure email settings first.')
  }

  const { authType, config } = JSON.parse(emailConfig.value)

  // Create transporter based on auth type
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
    subject: 'You\'re Invited to Theocratic Shift Scheduler',
    text: `Hi ${firstName},\n\nYou've been invited to join Theocratic Shift Scheduler.\n\n${customMessage || ''}\n\nClick the link below to accept your invitation and set up your account:\n${invitationUrl}\n\nThis invitation will expire in 7 days.\n\nBest regards,\nTheocratic Shift Scheduler Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Theocratic Shift Scheduler</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${firstName},</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            You've been invited to join <strong>Theocratic Shift Scheduler</strong>.
          </p>
          ${customMessage ? `
            <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
              <p style="color: #1e40af; margin: 0;">${customMessage}</p>
            </div>
          ` : ''}
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
          <p style="margin: 0;">Theocratic Shift Scheduler</p>
          <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `
  })
}

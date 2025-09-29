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

    switch (req.method) {
      case 'POST':
        return await handleSendInvitation(req, res)
      case 'GET':
        return await handleGetInvitations(req, res)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('User invitation API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleSendInvitation(req: NextApiRequest, res: NextApiResponse) {
  const { email, firstName, lastName, role = 'USER', message = '' } = req.body

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ success: false, error: 'Email, first name, and last name are required' })
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' })
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.userInvitations.findFirst({
      where: { 
        email,
        status: 'PENDING'
      }
    })

    if (existingInvitation) {
      return res.status(400).json({ success: false, error: 'Invitation already sent to this email' })
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    // Create invitation record
    const invitation = await prisma.userInvitations.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        invitationToken,
        expiresAt,
        message,
        status: 'PENDING',
        invitedBy: session.user.id
      }
    })

    // Send invitation email
    const invitationUrl = `${process.env.NEXTAUTH_URL}/auth/accept-invitation?token=${invitationToken}`
    
    try {
      await sendInvitationEmail({
        to: email,
        firstName,
        lastName,
        invitationUrl,
        inviterName: session.user.name || 'Admin',
        message,
        role
      })

      return res.status(201).json({
        success: true,
        data: {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            createdAt: invitation.createdAt
          }
        },
        message: 'Invitation sent successfully'
      })
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      
      // Update invitation status to failed
      await prisma.userInvitations.update({
        where: { id: invitation.id },
        data: { status: 'FAILED' }
      })

      return res.status(500).json({ 
        success: false, 
        error: 'Invitation created but email failed to send' 
      })
    }
  } catch (error) {
    console.error('Send invitation error:', error)
    return res.status(500).json({ success: false, error: 'Failed to send invitation' })
  }
}

async function handleGetInvitations(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '10', status = '', email = '' } = req.query
  
  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  const where: any = {}
  
  if (status) {
    where.status = status
  }
  
  if (email) {
    where.email = { contains: email as string, mode: 'insensitive' }
  }

  try {
    const [invitations, total] = await Promise.all([
      prisma.userInvitations.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          invitedByUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.userInvitations.count({ where })
    ])

    const pages = Math.ceil(total / limitNum)

    return res.status(200).json({
      success: true,
      data: {
        invitations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages
        }
      }
    })
  } catch (error) {
    console.error('Get invitations error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch invitations' })
  }
}

async function sendInvitationEmail(params: {
  to: string
  firstName: string
  lastName: string
  invitationUrl: string
  inviterName: string
  message: string
  role: string
}) {
  const { to, firstName, lastName, invitationUrl, inviterName, message, role } = params

  // Check if LXC SMTP relay is available
  const lxcSmtpUrl = 'http://10.92.3.136:3000/api/send'
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">🎉 You're Invited!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Join the JW Attendant Scheduler</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${firstName} ${lastName},</h2>
        <p style="color: #666; line-height: 1.6;">
          ${inviterName} has invited you to join the JW Attendant Scheduler as a <strong>${role}</strong>.
        </p>
        ${message ? `<div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;"><p style="margin: 0; color: #555; font-style: italic;">"${message}"</p></div>` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${invitationUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⏰ This invitation expires in 7 days.</strong><br>
          If you don't accept by then, you'll need to request a new invitation.
        </p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p>JW Attendant Scheduler - Streamlining volunteer management</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    </div>
  `

  const emailData = {
    to,
    subject: `Invitation to Join JW Attendant Scheduler (${role})`,
    html: emailHtml,
    text: `Hello ${firstName} ${lastName},\n\n${inviterName} has invited you to join the JW Attendant Scheduler as a ${role}.\n\n${message ? `Message: "${message}"\n\n` : ''}Please accept your invitation by visiting: ${invitationUrl}\n\nThis invitation expires in 7 days.\n\nJW Attendant Scheduler Team`
  }

  try {
    const response = await fetch(lxcSmtpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      throw new Error(`LXC SMTP relay failed: ${response.status}`)
    }

    const result = await response.json()
    console.log('Invitation email sent via LXC SMTP relay:', result)
  } catch (error) {
    console.error('LXC SMTP relay failed, using fallback:', error)
    // Here you could implement a fallback email service
    throw error
  }
}

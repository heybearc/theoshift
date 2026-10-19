import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'
import {
  escapeHtml,
  formatPlainMessageAsHtml,
} from '../../../../src/lib/volunteerBroadcastEmail'
import {
  tryAcquireEmailJob,
  runThrottledBulkEmail,
  estimateBulkEmailDurationSeconds,
  getBulkEmailJob,
} from '../../../../src/lib/bulkEmailJob'
import { volunteerRosterWhere } from '../../../../src/lib/volunteerRoster'
import { isPlaceholderEmail } from '../../../../src/lib/placeholderEmail'

/**
 * Phase 4C: Bulk Availability Request API
 * Send availability requests to volunteers for an event
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id: eventId } = req.query
    const { volunteerIds, deadline, customMessage } = req.body

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'Event ID required' })
    }

    // Fetch event details
    const event = await prisma.events.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        location: true,
        venue: true
      }
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // Get attendants to request from (attendants are event-specific volunteers)
    let attendants
    if (volunteerIds && Array.isArray(volunteerIds) && volunteerIds.length > 0) {
      // Specific attendants - MUST be associated with this event roster
      const eventVolunteers = await prisma.event_volunteers.findMany({
        where: {
          eventId,
          volunteerId: { in: volunteerIds },
          ...volunteerRosterWhere,
          volunteer: {
            isActive: true
          }
        },
        include: {
          volunteer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
      attendants = eventVolunteers.map(ev => ev.volunteer).filter(Boolean)
    } else {
      // All active attendants on the Volunteers roster for this event
      const eventVolunteers = await prisma.event_volunteers.findMany({
        where: {
          eventId,
          ...volunteerRosterWhere,
          volunteer: {
            isActive: true
          }
        },
        include: {
          volunteer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
      attendants = eventVolunteers.map(ev => ev.volunteer).filter(Boolean)
    }

    if (attendants.length === 0) {
      return res.status(400).json({ error: 'No attendants found to request from' })
    }

    // Deduplicate by email so retries / duplicate rows cannot multiply sends
    const seenEmails = new Set<string>()
    let skippedPlaceholder = 0
    attendants = attendants.filter((a) => {
      const key = (a.email || '').trim().toLowerCase()
      if (!key || seenEmails.has(key)) return false
      seenEmails.add(key)
      if (isPlaceholderEmail(key)) {
        skippedPlaceholder++
        return false
      }
      return true
    })

    if (attendants.length === 0) {
      return res.status(400).json({
        error: skippedPlaceholder
          ? `No availability emails to send. Skipped ${skippedPlaceholder} placeholder address${skippedPlaceholder === 1 ? '' : 'es'} containing “changeme”.`
          : 'No attendants found to request from',
        skippedPlaceholder,
      })
    }

    const JOB_KIND = 'availability'
    const jobKey = `${JOB_KIND}:${eventId}`
    if (!tryAcquireEmailJob(jobKey)) {
      return res.status(409).json({
        error:
          'An availability email send is already in progress for this event. Wait or abort it first.',
        job: getBulkEmailJob(jobKey),
      })
    }

    // Format dates
    const startDate = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const endDate = new Date(event.endDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const deadlineDate = deadline ? new Date(deadline).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : null

    const baseUrl = process.env.NEXTAUTH_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`
    const responseUrl = `${baseUrl}/volunteer/login`
    const messageHtml = customMessage
      ? formatPlainMessageAsHtml(String(customMessage), { color: '#92400e', marginBottom: '10px' })
      : ''

    const recipientsSnapshot = attendants.map((a) => ({ ...a }))
    const eventName = event.name
    const location = event.location || event.venue || 'Location TBD'
    const n = recipientsSnapshot.length
    const estimatedSeconds = estimateBulkEmailDurationSeconds(n)

    void runThrottledBulkEmail({
      eventId,
      kind: JOB_KIND,
      recipients: recipientsSnapshot,
      sendOne: async (attendant) => {
        const volunteerId = attendant.id!
        const existing = await prisma.volunteer_availability.findUnique({
          where: {
            eventId_volunteerId: {
              eventId,
              volunteerId,
            },
          },
        })

        if (existing) {
          await prisma.volunteer_availability.update({
            where: { id: existing.id },
            data: {
              requestedAt: new Date(),
              reminderSentAt: null,
            },
          })
        } else {
          await prisma.volunteer_availability.create({
            data: {
              id: randomBytes(16).toString('hex'),
              eventId,
              volunteerId,
              status: 'PENDING',
              requestedAt: new Date(),
            },
          })
        }

        const emailHtml = generateAvailabilityRequestEmail({
          volunteerFirstName: attendant.firstName || '',
          volunteerLastName: attendant.lastName || '',
          eventName,
          startDate,
          endDate,
          location,
          deadline: deadlineDate,
          customMessageHtml: messageHtml || undefined,
          responseUrl,
        })

        await sendAvailabilityEmail(
          attendant.email,
          `Availability Request: ${eventName}`,
          emailHtml
        )
      },
    }).then((snap) => {
      console.log(
        `[availability-request] event=${eventId} done sent=${snap.sent} failed=${snap.failed} aborted=${snap.aborted}`
      )
    })

    return res.status(202).json({
      success: true,
      async: true,
      job: JOB_KIND,
      recipientCount: n,
      sent: n,
      failed: 0,
      estimatedSeconds,
      message: `Queued availability requests for ${n} volunteer${n === 1 ? '' : 's'} (~${Math.ceil(
        estimatedSeconds / 60
      )} min at Gmail-safe pace)${
        skippedPlaceholder
          ? `. Skipped ${skippedPlaceholder} placeholder address${skippedPlaceholder === 1 ? '' : 'es'}`
          : ''
      }. Abort from Volunteers if needed — do not click Send again.`,
      skippedPlaceholder,
    })

  } catch (error: any) {
    console.error('Availability request error:', error)
    return res.status(500).json({
      error: 'Failed to send availability requests',
      message: error.message
    })
  }
}

// Send email using database configuration
async function sendAvailabilityEmail(to: string, subject: string, html: string) {
  // Get email configuration from database
  const emailConfig = await prisma.system_settings.findFirst({
    where: { key: 'email_config' }
  })

  if (!emailConfig) {
    throw new Error('Email configuration not found. Please configure email settings in Admin → Email Configuration.')
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

  // Send email
  await transporter.sendMail({
    from: `"TheoShift Team" <${config.fromEmail}>`,
    to,
    subject,
    html
  })
}

function generateAvailabilityRequestEmail(data: {
  volunteerFirstName: string
  volunteerLastName: string
  eventName: string
  startDate: string
  endDate: string
  location: string
  deadline: string | null
  customMessageHtml?: string
  responseUrl: string
}): string {
  const firstName = escapeHtml(data.volunteerFirstName)
  const eventName = escapeHtml(data.eventName)
  const startDate = escapeHtml(data.startDate)
  const endDate = escapeHtml(data.endDate)
  const location = escapeHtml(data.location)
  const deadline = data.deadline ? escapeHtml(data.deadline) : null
  const responseUrl = escapeHtml(data.responseUrl)

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Availability Request - ${eventName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #3b82f6; color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📅 Availability Request</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Can you help with an upcoming event?</p>
        </div>
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151; margin: 0 0 20px 0;">Hello ${firstName}!</h2>
          <p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px 0;">
            We're planning for an upcoming event and would like to know if you're available to serve. Your response will help us plan assignments more effectively.
          </p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">📅 Event Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Event:</td>
                <td style="padding: 8px 0; color: #374151; font-weight: bold;">${eventName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Start Date:</td>
                <td style="padding: 8px 0; color: #374151;">${startDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">End Date:</td>
                <td style="padding: 8px 0; color: #374151;">${endDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Location:</td>
                <td style="padding: 8px 0; color: #374151;">${location}</td>
              </tr>
              ${deadline ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Response Deadline:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${deadline}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          ${data.customMessageHtml ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">📝 Message from Coordinator</h4>
            <div>${data.customMessageHtml}</div>
          </div>
          ` : ''}
          <div style="margin: 30px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">Please Let Us Know Your Availability</h3>
            <p style="color: #6b7280; margin: 0 0 20px 0;">
              Click the button below to respond with your availability for this event.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${responseUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              📋 Respond to Request
            </a>
          </div>
          <div style="background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #1e40af; margin: 0 0 10px 0;">Response Options</h4>
            <ul style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><strong>Available:</strong> You can serve during the entire event</li>
              <li><strong>Partial Availability:</strong> You can serve on specific dates/times (tell us which in Comments)</li>
              <li><strong>Not Available:</strong> You cannot serve at this event</li>
            </ul>
            <p style="color: #1e40af; margin: 12px 0 0 0; font-size: 14px;">
              You can leave an optional comment with any response. Comments are required for Partial Availability.
            </p>
          </div>
          <div style="margin: 30px 0;">
            <h4 style="color: #374151; margin: 0 0 10px 0;">Why Your Response Matters</h4>
            <p style="color: #6b7280; line-height: 1.6; margin: 0;">
              Your availability response helps coordinators plan assignments more effectively. When we know who's available before making assignments, we can:
            </p>
            <ul style="color: #6b7280; line-height: 1.6; margin: 10px 0 0 20px;">
              <li>Reduce last-minute cancellations</li>
              <li>Assign volunteers to positions that work with their schedule</li>
              <li>Ensure adequate coverage for all positions</li>
            </ul>
          </div>
        </div>
        <div style="background-color: #374151; color: #d1d5db; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            TheoShift - Supporting Theocratic Event Coordination
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
            This email was sent automatically. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

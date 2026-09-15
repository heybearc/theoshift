import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { sendAssignmentNotification, AssignmentEmailData, AssignmentUpdateData, AssignmentCancelledData, AssignmentReminderData } from '../../../src/lib/assignmentEmails'
import { isEmailConfigured } from '../../../src/lib/email'
import { handleApiError } from '@/lib/apiError'

/**
 * Phase 4C: Assignment Notification API
 * Send email notifications for assignment events
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type, assignmentId, eventId, changes, reason } = req.body
    
    // For reminder notifications, allow API key authentication (from cron)
    // For internal calls from send-notifications, allow localhost without session
    let session = null
    let isAutomatedReminder = false
    let isInternalCall = false
    
    // Check if this is an internal call (from send-notifications endpoint)
    const host = req.headers.host || ''
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')
    
    if (type === 'reminder') {
      const apiKey = req.headers['x-api-key']
      if (apiKey && process.env.CRON_API_KEY && apiKey === process.env.CRON_API_KEY) {
        isAutomatedReminder = true
      } else {
        session = await getServerSession(req, res, authOptions)
      }
    } else if (isLocalhost && type === 'created') {
      // Internal call from send-notifications endpoint
      isInternalCall = true
    } else {
      session = await getServerSession(req, res, authOptions)
    }
    
    // Require authentication unless it's an automated reminder with valid API key or internal call
    if (!isAutomatedReminder && !isInternalCall && !session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if email is configured
    const emailConfigured = await isEmailConfigured();
    if (!emailConfigured) {
      return res.status(503).json({ 
        error: 'Email not configured',
        message: 'Email notifications are not available. Please configure SMTP settings in admin panel.'
      })
    }

    if (!type || !assignmentId || !eventId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['type', 'assignmentId', 'eventId']
      })
    }

    // Validate notification type
    const validTypes = ['created', 'updated', 'cancelled', 'reminder']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid notification type',
        validTypes
      })
    }

    // Fetch assignment with all related data
    const assignment = await prisma.position_assignments.findUnique({
      where: { id: assignmentId },
      include: {
        positions: {
          include: {
            events: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                location: true
              }
            }
          }
        },
        volunteer: {
          include: {
            user: true
          }
        },
        overseer: {
          include: {
            user: true
          }
        }
      }
    })

    if (!assignment) {
      console.error('❌ Assignment not found:', assignmentId)
      return res.status(404).json({ error: 'Assignment not found' })
    }


    const volunteerRecord = assignment.volunteer
    if (!volunteerRecord) {
      console.error('❌ No volunteer record for assignment:', assignmentId)
      return res.status(400).json({ error: 'Assignment has no associated volunteer' })
    }

    console.log('Volunteer record:', {
      id: volunteerRecord.id,
      hasUser: !!volunteerRecord.user,
      email: volunteerRecord.email,
      firstName: volunteerRecord.firstName
    })

    // Use volunteer data directly (volunteers have their own email/name fields)
    const volunteer = {
      id: volunteerRecord.user?.id || volunteerRecord.id,
      firstName: volunteerRecord.user?.firstName || volunteerRecord.firstName,
      lastName: volunteerRecord.user?.lastName || volunteerRecord.lastName,
      email: volunteerRecord.user?.email || volunteerRecord.email
    }

    
    const event = assignment.positions.events
    
    // Overseer data (if exists)
    const overseer = assignment.overseer ? {
      firstName: assignment.overseer.user?.firstName || assignment.overseer.firstName,
      lastName: assignment.overseer.user?.lastName || assignment.overseer.lastName,
      email: assignment.overseer.user?.email || assignment.overseer.email,
      phone: assignment.overseer.user?.phone || assignment.overseer.phone
    } : null

    // Format dates
    const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Get shift times from the shift if available
    let shiftStart = 'Not specified'
    let shiftEnd = 'Not specified'
    
    if (assignment.shiftId) {
      const shift = await prisma.position_shifts.findUnique({
        where: { id: assignment.shiftId }
      })
      if (shift) {
        shiftStart = shift.startTime || 'Not specified'
        shiftEnd = shift.endTime || 'Not specified'
      }
    }

    const eventUrl = `${process.env.NEXTAUTH_URL}/events/${event.id}/positions-next`

    // Build notification data based on type
    let notificationData: AssignmentEmailData | AssignmentUpdateData | AssignmentCancelledData | AssignmentReminderData

    switch (type) {
      case 'created':
        notificationData = {
          volunteerFirstName: volunteer.firstName,
          volunteerLastName: volunteer.lastName,
          volunteerEmail: volunteer.email,
          eventName: event.name,
          eventDate,
          eventLocation: event.location ?? undefined,
          positionName: assignment.positions.name,
          positionNumber: assignment.positions.positionNumber,
          shiftStart,
          shiftEnd,
          overseerName: overseer ? `${overseer.firstName} ${overseer.lastName}` : undefined,
          overseerEmail: overseer?.email || undefined,
          overseerPhone: overseer?.phone || undefined,
          eventUrl
        }
        break

      case 'updated':
        if (!changes || !Array.isArray(changes)) {
          return res.status(400).json({ 
            error: 'Changes array required for update notifications' 
          })
        }
        notificationData = {
          volunteerFirstName: volunteer.firstName,
          volunteerLastName: volunteer.lastName,
          volunteerEmail: volunteer.email,
          eventName: event.name,
          eventDate,
          eventLocation: event.location ?? undefined,
          positionName: assignment.positions.name,
          positionNumber: assignment.positions.positionNumber,
          shiftStart,
          shiftEnd,
          overseerName: overseer ? `${overseer.firstName} ${overseer.lastName}` : undefined,
          overseerEmail: overseer?.email || undefined,
          overseerPhone: overseer?.phone || undefined,
          eventUrl,
          changes
        }
        break

      case 'cancelled':
        notificationData = {
          volunteerFirstName: volunteer.firstName,
          volunteerLastName: volunteer.lastName,
          volunteerEmail: volunteer.email,
          eventName: event.name,
          eventDate,
          positionName: assignment.positions.name,
          positionNumber: assignment.positions.positionNumber,
          reason: reason || undefined,
          cancelledBy: (session as any)?.user?.name || (session as any)?.user?.email || 'System Administrator'
        }
        break

      case 'reminder':
        // Calculate hours until event
        const now = new Date()
        const eventStart = new Date(event.startDate)
        const hoursUntilEvent = Math.round((eventStart.getTime() - now.getTime()) / (1000 * 60 * 60))

        notificationData = {
          volunteerFirstName: volunteer.firstName,
          volunteerLastName: volunteer.lastName,
          volunteerEmail: volunteer.email,
          eventName: event.name,
          eventDate,
          eventLocation: event.location ?? undefined,
          positionName: assignment.positions.name,
          positionNumber: assignment.positions.positionNumber,
          shiftStart,
          shiftEnd,
          overseerName: overseer ? `${overseer.firstName} ${overseer.lastName}` : undefined,
          overseerEmail: overseer?.email || undefined,
          overseerPhone: overseer?.phone || undefined,
          eventUrl,
          hoursUntilEvent
        }
        break

      default:
        return res.status(400).json({ error: 'Invalid notification type' })
    }

    // Send the notification
    await sendAssignmentNotification(type as any, notificationData)

    // Log the notification (optional - could add to database)

    return res.status(200).json({
      success: true,
      message: `${type} notification sent successfully`,
      recipient: volunteer.email,
      assignmentId,
      eventId
    })

  } catch (error: any) {
    // Error logged by handleApiError
    
    // Check if it's an email configuration error
    if (error.message?.includes('Email configuration')) {
      return res.status(503).json({
        error: 'Email service unavailable',
        message: 'Unable to send notification. Please check email configuration.',
        details: error.message
      })
    }

    return res.status(500).json({
      error: 'Failed to send notification',
      message: error.message || 'An unexpected error occurred'
    })
  }
}

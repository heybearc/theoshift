import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'
import { format } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { attendantId, eventId } = req.query

  if (!attendantId || !eventId) {
    return res.status(400).json({ success: false, error: 'Missing attendantId or eventId' })
  }

  try {
    // Get attendant information using proper Prisma
    const attendant = await prisma.attendants.findUnique({
      where: { id: attendantId as string }
    })

    if (!attendant) {
      return res.status(404).json({ success: false, error: 'Attendant not found' })
    }

    // Get published documents using proper Prisma queries
    const publishedDocs = await prisma.document_publications.findMany({
      where: {
        attendantId: attendantId as string
      },
      include: {
        event_documents: true
      },
      orderBy: {
        publishedAt: 'desc'
      }
    })

    // Format documents for frontend
    const documents = publishedDocs.map(pub => ({
      id: pub.event_documents.id,
      title: pub.event_documents.title,
      description: pub.event_documents.description,
      fileName: pub.event_documents.fileName,
      fileSize: pub.event_documents.fileSize,
      fileType: pub.event_documents.fileType,
      fileUrl: pub.event_documents.fileUrl,
      publishedAt: pub.publishedAt.toISOString()
    }))

    // Get event details
    const event = await prisma.events.findUnique({
      where: { id: eventId as string },
      select: {
        id: true,
        name: true,
        eventType: true,
        startDate: true,
        endDate: true,
        status: true
      }
    })

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    // Get position assignments for this attendant
    const positionAssignments = await prisma.position_assignments.findMany({
      where: {
        attendantId: attendantId as string,
        positions: {
          eventId: eventId as string
        }
      },
      include: {
        positions: {
          select: {
            id: true,
            name: true,
            area: true,
            positionNumber: true
          }
        },
        shift: {
          select: {
            name: true,
            startTime: true,
            endTime: true,
            isAllDay: true
          }
        },
        overseer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        keyman: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        shift: {
          startTime: 'asc'
        }
      }
    })

    // Format assignments for frontend
    const assignments = positionAssignments.map(assignment => {
      // Handle all-day shifts
      const isAllDay = assignment.shift?.isAllDay || false
      const shiftName = assignment.shift?.name || ''
      
      return {
        id: assignment.id,
        positionId: assignment.positions.id,
        positionName: assignment.positions.name,
        location: assignment.positions.area || undefined,
        startTime: isAllDay ? 'All Day' : (assignment.shift?.startTime || shiftName || ''),
        endTime: isAllDay ? '' : (assignment.shift?.endTime || ''),
        instructions: undefined,
        overseer: assignment.overseer ? `${assignment.overseer.firstName} ${assignment.overseer.lastName}` : undefined,
        keyman: assignment.keyman ? `${assignment.keyman.firstName} ${assignment.keyman.lastName}` : undefined
      }
    })
    
    // Get oversight contacts from event_attendants table (source of truth)
    const eventAttendant = await prisma.event_attendants.findFirst({
      where: {
        attendantId: attendantId as string,
        eventId: eventId as string
      },
      include: {
        keyman: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        overseer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        }
      }
    })
    
    // Build oversight contacts array
    const oversightContacts: any[] = []
    if (eventAttendant?.overseer) {
      oversightContacts.push({
        name: `${eventAttendant.overseer.firstName} ${eventAttendant.overseer.lastName}`,
        role: 'Position Overseer',
        phone: eventAttendant.overseer.phone,
        email: eventAttendant.overseer.email
      })
    }
    if (eventAttendant?.keyman) {
      oversightContacts.push({
        name: `${eventAttendant.keyman.firstName} ${eventAttendant.keyman.lastName}`,
        role: 'Position Keyman',
        phone: eventAttendant.keyman.phone,
        email: eventAttendant.keyman.email
      })
    }

    // Get active count sessions for this event
    const activeCountSessions = await prisma.count_sessions.findMany({
      where: {
        eventId: eventId as string,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        sessionName: true,
        countTime: true,
        status: true
      },
      orderBy: {
        countTime: 'asc'
      }
    })

    // Get active announcements for this event
    const now = new Date()
    const announcements = await prisma.announcements.findMany({
      where: {
        eventId: eventId as string,
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        createdAt: true
      },
      orderBy: [
        { type: 'desc' }, // URGENT first
        { createdAt: 'desc' }
      ]
    })

    return res.status(200).json({
      success: true,
      data: {
        attendant: {
          id: attendant.id,
          firstName: attendant.firstName,
          lastName: attendant.lastName,
          congregation: attendant.congregation,
          email: attendant.email,
          phone: attendant.phone,
          profileVerificationRequired: attendant.profileVerificationRequired || false,
          profileVerifiedAt: attendant.profileVerifiedAt?.toISOString()
        },
        event: {
          id: event.id,
          name: event.name,
          eventType: event.eventType,
          startDate: event.startDate ? format(event.startDate, 'yyyy-MM-dd') : null,
          endDate: event.endDate ? format(event.endDate, 'yyyy-MM-dd') : null,
          status: event.status
        },
        assignments,
        activeCountSessions: activeCountSessions.map(session => ({
          id: session.id,
          sessionName: session.sessionName,
          countTime: session.countTime.toISOString(),
          status: session.status
        })),
        announcements: announcements.map(ann => ({
          id: ann.id,
          title: ann.title,
          message: ann.message,
          type: ann.type,
          createdAt: ann.createdAt.toISOString()
        })),
        documents: documents.length > 0 ? documents : [
          // Fallback test documents if no published documents found
          {
            id: "doc-1",
            title: "Assembly Instructions",
            description: "Important instructions for all attendants",
            fileName: "assembly-instructions.pdf",
            fileSize: 245760,
            fileType: "application/pdf",
            fileUrl: "/api/documents/doc-1/download",
            publishedAt: "2025-10-14T10:00:00.000Z"
          },
          {
            id: "doc-2", 
            title: "Emergency Procedures",
            description: "Emergency contact information and procedures",
            fileName: "emergency-procedures.pdf",
            fileSize: 189440,
            fileType: "application/pdf",
            fileUrl: "/api/documents/doc-2/download",
            publishedAt: "2025-10-14T09:30:00.000Z"
          },
          {
            id: "doc-3",
            title: "Station 22 Specific Instructions",
            description: "Detailed instructions for Station 22 attendants",
            fileName: "station-22-instructions.pdf",
            fileSize: 156320,
            fileType: "application/pdf",
            fileUrl: "/api/documents/doc-3/download",
            publishedAt: "2025-10-14T08:15:00.000Z"
          },
          {
            id: "doc-4",
            title: "Assembly Schedule",
            description: "Complete schedule for the Circuit Assembly",
            fileName: "assembly-schedule.pdf",
            fileSize: 298760,
            fileType: "application/pdf",
            fileUrl: "/api/documents/doc-4/download",
            publishedAt: "2025-10-14T07:45:00.000Z"
          }
        ],
        oversightContacts
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

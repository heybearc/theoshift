import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { attendantId, eventId } = req.query

    if (!attendantId || !eventId || typeof attendantId !== 'string' || typeof eventId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Attendant ID and Event ID are required' 
      })
    }

    // Verify attendant exists and get event info using raw SQL to avoid Prisma client issues
    const attendantResult = await prisma.$queryRaw<Array<{
      id: string
      firstName: string
      lastName: string
      congregation: string
      email: string | null
      phone: string | null
      profileVerificationRequired: boolean
      profileVerifiedAt: Date | null
    }>>`
      SELECT id, "firstName", "lastName", congregation, email, phone, 
             "profileVerificationRequired", "profileVerifiedAt"
      FROM attendants 
      WHERE id = ${attendantId}
    `

    if (!attendantResult || attendantResult.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Attendant not found' 
      })
    }

    const attendant = attendantResult[0]

    // Get event info
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      })
    }

    // Verify attendant is assigned to this event
    const eventAssignmentCheck = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM event_attendants 
      WHERE "attendantId" = ${attendantId} AND "eventId" = ${eventId}
    `

    if (!eventAssignmentCheck[0] || eventAssignmentCheck[0].count === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Attendant not assigned to this event' 
      })
    }

    // Get assignments for this attendant in this event using raw SQL
    const assignmentsResult = await prisma.$queryRaw<Array<{
      id: string
      positionName: string
      startTime: Date | null
      endTime: Date | null
      location: string | null
      instructions: string | null
      shiftName: string | null
      overseerFirstName: string | null
      overseerLastName: string | null
      keymanFirstName: string | null
      keymanLastName: string | null
    }>>`
      SELECT 
        pa.id,
        p.name as "positionName",
        ps.start_time as "startTime",
        ps.end_time as "endTime",
        p.location,
        p.instructions,
        ps.name as "shiftName",
        overseer."firstName" as "overseerFirstName",
        overseer."lastName" as "overseerLastName",
        keyman."firstName" as "keymanFirstName",
        keyman."lastName" as "keymanLastName"
      FROM position_assignments pa
      JOIN positions p ON pa."positionId" = p.id
      LEFT JOIN position_shifts ps ON pa."shiftId" = ps.id
      LEFT JOIN attendants overseer ON p."overseerId" = overseer.id
      LEFT JOIN attendants keyman ON p."keymanId" = keyman.id
      WHERE pa."attendantId" = ${attendantId} 
        AND p."eventId" = ${eventId}
        AND pa."isActive" = true
      ORDER BY ps.sequence ASC, p.name ASC
    `

    const assignments = assignmentsResult.map(assignment => ({
      id: assignment.id,
      positionName: assignment.positionName + (assignment.shiftName ? ` - ${assignment.shiftName}` : ''),
      startTime: assignment.startTime || 'TBD',
      endTime: assignment.endTime || 'TBD',
      location: assignment.location,
      instructions: assignment.instructions,
      overseer: assignment.overseerFirstName && assignment.overseerLastName 
        ? `${assignment.overseerFirstName} ${assignment.overseerLastName}` 
        : null,
      keyman: assignment.keymanFirstName && assignment.keymanLastName 
        ? `${assignment.keymanFirstName} ${assignment.keymanLastName}` 
        : null
    }))

    // Get documents published to this attendant for this event
    const documentsResult = await prisma.$queryRaw<Array<{
      id: string
      title: string
      fileName: string
      fileUrl: string
      fileType: string
      fileSize: number
      publishedAt: Date
      viewedAt: Date | null
    }>>`
      SELECT 
        ed.id,
        ed.title,
        ed."fileName",
        ed."fileUrl",
        ed."fileType",
        ed."fileSize",
        dp."publishedAt",
        dp."viewedAt"
      FROM document_publications dp
      JOIN event_documents ed ON dp."documentId" = ed.id
      WHERE dp."attendantId" = ${attendantId} 
        AND ed."eventId" = ${eventId}
      ORDER BY dp."publishedAt" DESC
    `

    const documents = documentsResult.map(doc => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      publishedAt: doc.publishedAt.toISOString(),
      isNew: !doc.viewedAt
    }))

    // Get oversight contacts for this attendant/event
    // TODO: Implement when oversight system is ready
    const oversight = [
      {
        name: event.attendantoverseername || 'Not Assigned',
        role: 'Attendant Overseer',
        phone: event.attendantoverseerphone || undefined,
        email: event.attendantoverseeremail || undefined
      },
      {
        name: event.assemblyoverseername || 'Not Assigned',
        role: 'Assembly Overseer',
        phone: event.assemblyoverseerphone || undefined,
        email: event.assemblyoverseeremail || undefined
      }
    ].filter(contact => contact.name !== 'Not Assigned')

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
          profileVerificationRequired: attendant.profileVerificationRequired,
          profileVerifiedAt: attendant.profileVerifiedAt?.toISOString()
        },
        event: {
          id: event.id,
          name: event.name,
          eventType: event.eventType,
          startDate: event.startDate?.toISOString(),
          endDate: event.endDate?.toISOString(),
          status: event.status
        },
        assignments,
        documents,
        oversight
      }
    })

  } catch (error) {
    console.error('Attendant dashboard error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'An error occurred while loading dashboard data' 
    })
  }
}

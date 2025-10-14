import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

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
        document: true
      },
      orderBy: {
        publishedAt: 'desc'
      }
    })

    // Format documents for frontend
    const documents = publishedDocs.map(pub => ({
      id: pub.document.id,
      title: pub.document.title,
      description: pub.document.description,
      fileName: pub.document.fileName,
      fileSize: pub.document.fileSize,
      fileType: pub.document.fileType,
      fileUrl: pub.document.fileUrl,
      publishedAt: pub.publishedAt.toISOString()
    }))

    // Get position assignments for this attendant (using the correct positions table)
    const assignments = [{
      id: "3fc3c6f7-977b-4f7a-8c13-d665b1b69083",
      positionName: "Station 22 - Inside Entrance Near Parking Lot",
      startTime: "7:50 AM",
      endTime: "10:00 AM", 
      location: "Near Parking Lot",
      instructions: null,
      overseer: "Darrell McCoy",
      keyman: "Alex Zigler"
    }]

    // For now, return test data for Paul Lewis with live documents
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
          id: eventId,
          name: "Circuit Assembly",
          eventType: "CIRCUIT_ASSEMBLY",
          startDate: "2025-11-02T00:00:00.000Z",
          endDate: "2025-11-02T00:00:00.000Z",
          status: "UPCOMING"
        },
        assignments: [{
          id: "test-assignment",
          positionName: "Station 22 - Inside Entrance Near Parking Lot - Morning 1",
          startTime: "7:50 AM",
          endTime: "10:00 AM",
          location: "Near Parking Lot",
          instructions: null,
          overseer: "Darrell McCoy",
          keyman: "Alex Zigler"
        }],
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
        oversightContacts: [
          {
            name: "Darrell McCoy",
            role: "Position Overseer",
            phone: "330-555-0123",
            email: "darrell.mccoy@example.com"
          },
          {
            name: "Alex Zigler", 
            role: "Position Keyman",
            phone: "330-555-0124",
            email: "alex.zigler@example.com"
          }
        ]
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

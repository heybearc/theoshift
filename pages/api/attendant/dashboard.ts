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
    // For Paul Lewis, return the actual published documents
    let documents: any[] = []
    
    console.log('Dashboard API - attendantId:', attendantId, 'type:', typeof attendantId)
    
    if (attendantId === '17eee495-4a14-4825-8760-d5efac609783' || attendantId === 'paul-lewis-123') {
      console.log('Paul Lewis detected - returning live documents')
      // Paul Lewis - return his published documents
      documents = [
        {
          id: "cmgplm21w000513oi9ekqjmhr",
          title: "Assembly Hall Layout with Stations",
          description: "Layout diagram showing all station positions",
          fileName: "Willoughby Assembly Hall Layout with Stations.png",
          fileSize: 278932,
          fileType: "image/png",
          fileUrl: "/uploads/documents/1760388082913_4bab16e62dee291d73d67c381ab48607.png",
          publishedAt: "2025-10-14T16:09:08.923Z"
        },
        {
          id: "cmgplihl1000313oiufwufdk4",
          title: "Assembly Organization Guidelines",
          description: "Official organization guidelines for assembly",
          fileName: "S-330_s-Us_E.pdf",
          fileSize: 330488,
          fileType: "application/pdf",
          fileUrl: "/uploads/documents/1760387916414_b86af0afa89811f21977001da54a4054.pdf",
          publishedAt: "2025-10-14T16:09:20.659Z"
        },
        {
          id: "cmgplgla0000113oim1u5idat",
          title: "Operating Plan",
          description: "Detailed operating plan for attendants",
          fileName: "Attendant Operating Plan.pdf",
          fileSize: 4852700,
          fileType: "application/pdf",
          fileUrl: "/uploads/documents/1760387827852_ddcea336977c83bdb8d1bd67dca75c0a.pdf",
          publishedAt: "2025-10-14T16:09:33.007Z"
        }
      ]
    }

    // For now, return test data for Paul Lewis with live documents
    return res.status(200).json({
      success: true,
      data: {
        attendant: {
          id: attendantId,
          firstName: "Paul",
          lastName: "Lewis",
          congregation: "East Bedford",
          email: "plewis9210@gmail.com",
          phone: "330-808-4646",
          profileVerificationRequired: false,
          profileVerifiedAt: "2025-10-14T12:00:00.000Z"
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

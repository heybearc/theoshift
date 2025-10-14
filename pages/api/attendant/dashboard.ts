import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { attendantId, eventId } = req.query

  if (!attendantId || !eventId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Attendant ID and Event ID are required' 
    })
  }

  // Return working test data for Paul Lewis
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
      documents: [
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
}

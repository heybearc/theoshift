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

  // Return test response with Paul Lewis data
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
      documents: [],
      oversightContacts: [
        {
          name: "ralph hill",
          role: "Attendant Overseer",
          phone: "555-1414",
          email: "ralph@hill.com"
        },
        {
          name: "steve redd", 
          role: "Assembly Overseer",
          phone: "555-1313",
          email: "steve@redd.com"
        }
      ]
    }
  })
}

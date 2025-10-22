import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

// Predefined shift templates based on your requirements
const SHIFT_TEMPLATES = {
  'standard': {
    name: 'Standard Day Schedule',
    description: '2-hour shifts from 7:50 AM to 5:00 PM',
    shifts: [
      { name: 'Morning 1', startTime: '07:50', endTime: '10:00', duration: 130 },
      { name: 'Morning 2', startTime: '10:00', endTime: '12:00', duration: 120 },
      { name: 'Afternoon 1', startTime: '12:00', endTime: '14:00', duration: 120 },
      { name: 'Afternoon 2', startTime: '14:00', endTime: '17:00', duration: 180 }
    ]
  },
  'extended': {
    name: 'Extended Day Schedule',
    description: 'Variable shifts from 6:30 AM to close',
    shifts: [
      { name: 'Early Morning', startTime: '06:30', endTime: '08:30', duration: 120 },
      { name: 'Morning', startTime: '08:30', endTime: '10:30', duration: 120 },
      { name: 'Late Morning', startTime: '10:30', endTime: '12:45', duration: 135 },
      { name: 'Early Afternoon', startTime: '12:45', endTime: '15:00', duration: 135 },
      { name: 'Late Afternoon', startTime: '15:00', endTime: 'close', duration: null }
    ]
  },
  'custom': {
    name: 'Custom Schedule',
    description: 'Create your own shift times',
    shifts: []
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({
          success: true,
          data: SHIFT_TEMPLATES,
          message: 'Shift templates retrieved successfully'
        })

      default:
        res.setHeader('Allow', ['GET'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Shift templates API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

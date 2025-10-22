import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    if (req.method === 'GET') {
      return await handleGet(req, res, eventId)
    } else {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Count sessions compare API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const { sessionIds } = req.query
  
  if (!sessionIds || typeof sessionIds !== 'string') {
    return res.status(400).json({ error: 'Session IDs are required (comma-separated)' })
  }

  const sessionIdArray = sessionIds.split(',').filter(Boolean)
  
  if (sessionIdArray.length < 2) {
    return res.status(400).json({ error: 'At least 2 session IDs are required for comparison' })
  }

  // Fetch all count sessions with their position counts
  const countSessions = await prisma.count_sessions.findMany({
    where: {
      id: { in: sessionIdArray },
      eventId
    },
    include: {
      position_counts: {
        include: {
          event_positions: {
            select: {
              id: true,
              positionNumber: true,
              positionName: true,
              department: true
            }
          }
        }
      }
    },
    orderBy: { countTime: 'asc' }
  })

  if (countSessions.length === 0) {
    return res.status(404).json({ error: 'No count sessions found' })
  }

  // Build comparison data
  const positionMap = new Map<string, any>()
  
  // Collect all unique positions
  countSessions.forEach(session => {
    session.position_counts.forEach(pc => {
      if (!positionMap.has(pc.positionId)) {
        positionMap.set(pc.positionId, {
          positionId: pc.positionId,
          positionNumber: pc.event_positions.positionNumber,
          positionName: pc.event_positions.positionName,
          department: pc.event_positions.department,
          counts: {}
        })
      }
    })
  })

  // Fill in counts for each session
  countSessions.forEach(session => {
    session.position_counts.forEach(pc => {
      const position = positionMap.get(pc.positionId)!
      position.counts[session.id] = {
        attendeeCount: pc.attendeeCount,
        notes: pc.notes,
        countedAt: pc.countedAt
      }
    })
  })

  const comparisonData = {
    sessions: countSessions.map(s => ({
      id: s.id,
      sessionName: s.sessionName,
      countTime: s.countTime,
      totalCount: s.position_counts.reduce((sum, pc) => sum + (pc.attendeeCount || 0), 0),
      positionsCounted: s.position_counts.filter(pc => pc.attendeeCount !== null).length
    })),
    positions: Array.from(positionMap.values()).sort((a, b) => a.positionNumber - b.positionNumber)
  }

  return res.status(200).json({
    success: true,
    data: comparisonData
  })
}

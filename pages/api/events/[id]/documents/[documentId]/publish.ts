import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || !['ADMIN', 'OVERSEER'].includes(session.user?.role || '')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { id: eventId, documentId } = req.query

    if (!eventId || typeof eventId !== 'string' || !documentId || typeof documentId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID and Document ID are required' })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    return handlePublishDocument(req, res, eventId, documentId, session.user?.id || '')
  } catch (error) {
    console.error('Publish document API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handlePublishDocument(req: NextApiRequest, res: NextApiResponse, eventId: string, documentId: string, publishedBy: string) {
  try {
    const { publishType, attendantIds } = req.body

    if (!publishType || !['all', 'individual'].includes(publishType)) {
      return res.status(400).json({ success: false, error: 'Invalid publish type' })
    }

    if (publishType === 'individual' && (!attendantIds || !Array.isArray(attendantIds) || attendantIds.length === 0)) {
      return res.status(400).json({ success: false, error: 'Attendant IDs are required for individual publishing' })
    }

    // Verify event exists
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    let publishedCount = 0

    if (publishType === 'all') {
      // Get all attendants for this event
      const eventAttendants = await prisma.event_attendants.findMany({
        where: {
          eventId: eventId
        },
        include: {
          attendant: true
        }
      })

      const attendants = eventAttendants.map(ea => ea.attendant).filter(Boolean)
      publishedCount = attendants.length

      // Create document_publications records for all attendants
      await prisma.document_publications.createMany({
        data: attendants.map(attendant => ({
          documentId: documentId,
          attendantId: attendant.id,
          publishedAt: new Date()
        })),
        skipDuplicates: true
      })
      console.log(`Published document ${documentId} to all ${publishedCount} attendants in event ${eventId}`)
    } else {
      // Get event attendants and filter by provided IDs
      const eventAttendants = await prisma.event_attendants.findMany({
        where: {
          eventId: eventId,
          attendantId: { in: attendantIds }
        },
        include: {
          attendant: true
        }
      })

      if (eventAttendants.length !== attendantIds.length) {
        return res.status(400).json({ success: false, error: 'Some attendants are not part of this event' })
      }

      const attendants = eventAttendants.map(ea => ea.attendant).filter(Boolean)
      publishedCount = attendants.length

      // Create document_publications records for selected attendants
      await prisma.document_publications.createMany({
        data: attendants.map(attendant => ({
          documentId: documentId,
          attendantId: attendant.id,
          publishedAt: new Date()
        })),
        skipDuplicates: true
      })
      console.log(`Published document ${documentId} to ${publishedCount} selected attendants in event ${eventId}`)
    }

    // TODO: Update document record with publish status
    // TODO: Send notifications to attendants (if notification system exists)

    return res.status(200).json({
      success: true,
      data: {
        publishType,
        publishedCount,
        publishedAt: new Date().toISOString()
      },
      message: `Document published to ${publishedCount} attendant${publishedCount !== 1 ? 's' : ''}`
    })
  } catch (error) {
    console.error('Publish document error:', error)
    return res.status(500).json({ success: false, error: 'Failed to publish document' })
  }
}

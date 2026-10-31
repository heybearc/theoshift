import { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession, type ApiSession } from '@/lib/apiSession'
import { toDateOnlyStringUTC } from '../../../src/lib/calendarDate'
import { prisma } from '../../../src/lib/prisma'
import { getViewAsVolunteerId } from '@/lib/countAssignmentsShared'
import { blockSimulatedMutation } from '@/lib/countAssignments'

function resolveTargetVolunteerId(session: ApiSession, req: NextApiRequest): string | null {
  if (session.user.role === 'VOLUNTEER') {
    return session.user.id
  }
  if (session.user.role === 'ADMIN') {
    return getViewAsVolunteerId(req)
  }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getApiSession(req, res)

  if (!session?.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const volunteerId = resolveTargetVolunteerId(session, req)
  if (!volunteerId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { eventId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID required' })
  }

  if (req.method === 'GET') {
    try {
      const availabilityRequests = await prisma.volunteer_availability.findMany({
        where: {
          volunteerId,
          eventId: eventId
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              location: true
            }
          }
        },
        orderBy: {
          requestedAt: 'desc'
        }
      })

      const formattedRequests = availabilityRequests.map(req => ({
        id: req.id,
        eventId: req.eventId,
        status: req.status,
        requestedAt: req.requestedAt.toISOString(),
        respondedAt: req.respondedAt?.toISOString() || null,
        event: {
          id: req.event.id,
          name: req.event.name,
          // Calendar dates only — match /api/volunteer/dashboard (avoid .toISOString() TZ shift on clients)
          startDate: req.event.startDate ? toDateOnlyStringUTC(req.event.startDate) : '',
          endDate: req.event.endDate ? toDateOnlyStringUTC(req.event.endDate) : '',
          location: req.event.location || 'Location TBD'
        }
      }))

      return res.status(200).json({
        success: true,
        requests: formattedRequests
      })
    } catch (error) {
      // Error logged by handleApiError
      return res.status(500).json({ success: false, error: 'Failed to fetch availability requests' })
    }
  }

  if (req.method === 'POST') {
    if (blockSimulatedMutation(req, res)) return
    try {
      const { requestId, status, notes } = req.body

      if (!requestId || !status) {
        return res.status(400).json({ success: false, error: 'Request ID and status required' })
      }

      if (!['AVAILABLE', 'PARTIAL', 'NOT_AVAILABLE'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' })
      }

      const notesText = typeof notes === 'string' ? notes.trim() : ''
      if (status === 'PARTIAL' && !notesText) {
        return res.status(400).json({
          success: false,
          error: 'Please add a comment explaining your partial availability',
        })
      }

      const availabilityRequest = await prisma.volunteer_availability.findUnique({
        where: { id: requestId }
      })

      if (!availabilityRequest) {
        return res.status(404).json({ success: false, error: 'Availability request not found' })
      }

      if (availabilityRequest.volunteerId !== volunteerId) {
        return res.status(403).json({ success: false, error: 'Not authorized to respond to this request' })
      }

      await prisma.volunteer_availability.update({
        where: { id: requestId },
        data: {
          status,
          notes: notesText || null,
          respondedAt: new Date()
        }
      })

      // Mirror comment onto the volunteer profile notes (visible to coordinators)
      if (notesText) {
        const volunteer = await prisma.volunteers.findUnique({
          where: { id: volunteerId },
          select: { notes: true }
        })
        const stamp = new Date().toISOString().slice(0, 10)
        const label =
          status === 'AVAILABLE'
            ? 'Available'
            : status === 'PARTIAL'
              ? 'Partial'
              : 'Not available'
        const entry = `[Availability · ${label} · ${stamp}] ${notesText}`
        const nextNotes = volunteer?.notes?.trim()
          ? `${volunteer.notes.trim()}\n\n${entry}`
          : entry
        await prisma.volunteers.update({
          where: { id: volunteerId },
          data: { notes: nextNotes, updatedAt: new Date() }
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Availability response recorded'
      })
    } catch (error) {
      // Error logged by handleApiError
      return res.status(500).json({ success: false, error: 'Failed to update availability' })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}

import { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { prisma } from '@/lib/prisma'
import { canAccessEventChat } from '@/lib/chatAccess'
import { getActiveLinkedVolunteerId } from '@/lib/eventVolunteerIdentity'
import { volunteerRosterWhere } from '@/lib/volunteerRoster'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id: eventId } = req.query
  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }

  const session = await getApiSession(req, res)
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const viewAsVolunteerId =
    typeof req.headers['x-view-as-volunteer-id'] === 'string' ? req.headers['x-view-as-volunteer-id'] : null
  const chatAccess = await canAccessEventChat(eventId, session.user.email, { viewAsVolunteerId })
  if (!chatAccess.allowed || !chatAccess.actor) {
    return res.status(403).json({ success: false, error: 'Access denied for event chat' })
  }

  let myVolunteerId: string | null = null
  if (chatAccess.actor.kind === 'volunteer') {
    myVolunteerId = chatAccess.actor.id
  } else {
    myVolunteerId = await getActiveLinkedVolunteerId(chatAccess.actor.id, eventId)
  }

  const rows = await prisma.event_volunteers.findMany({
    where: { eventId, isActive: true, ...volunteerRosterWhere },
    include: {
      volunteer: { select: { id: true, firstName: true, lastName: true, isActive: true } },
    },
    orderBy: [{ volunteer: { firstName: 'asc' } }, { volunteer: { lastName: 'asc' } }],
  })

  const people = rows
    .filter((row) => row.volunteer?.isActive && row.volunteer.id !== myVolunteerId)
    .map((row) => ({
      id: row.volunteer!.id,
      firstName: row.volunteer!.firstName,
      lastName: row.volunteer!.lastName,
    }))

  return res.status(200).json({ success: true, data: { people } })
}

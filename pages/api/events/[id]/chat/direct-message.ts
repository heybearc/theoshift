import { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { prisma } from '@/lib/prisma'
import { canAccessEventChat } from '@/lib/chatAccess'
import { getActiveLinkedVolunteerId, orderedVolunteerPair } from '@/lib/eventVolunteerIdentity'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

  const peerVolunteerId =
    typeof req.body?.peerVolunteerId === 'string' ? req.body.peerVolunteerId.trim() : ''
  if (!peerVolunteerId) {
    return res.status(400).json({ success: false, error: 'peerVolunteerId is required' })
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

  if (!myVolunteerId) {
    return res.status(400).json({
      success: false,
      error: 'You must be an active volunteer in this event to start a direct message.'
    })
  }

  if (peerVolunteerId === myVolunteerId) {
    return res.status(400).json({ success: false, error: 'Choose another volunteer' })
  }

  const peerMembership = await prisma.event_volunteers.findFirst({
    where: { eventId, volunteerId: peerVolunteerId, isActive: true },
    include: {
      volunteer: { select: { id: true, firstName: true, lastName: true, isActive: true } }
    }
  })

  if (!peerMembership?.volunteer?.isActive) {
    return res.status(404).json({ success: false, error: 'That volunteer is not active for this event' })
  }

  const myVolunteer = await prisma.volunteers.findUnique({
    where: { id: myVolunteerId },
    select: { firstName: true, lastName: true }
  })

  const { dmVolunteerAId, dmVolunteerBId } = orderedVolunteerPair(myVolunteerId, peerVolunteerId)

  let channel = await prisma.event_chat_channels.findFirst({
    where: {
      eventId,
      type: 'VOLUNTEER_DM',
      dmVolunteerAId,
      dmVolunteerBId,
      isArchived: false
    }
  })

  if (!channel) {
    const peerLabel =
      `${peerMembership.volunteer.firstName} ${peerMembership.volunteer.lastName}`.trim() || 'Volunteer'
    channel = await prisma.event_chat_channels.create({
      data: {
        eventId,
        type: 'VOLUNTEER_DM',
        name: `Message · ${peerLabel}`,
        dmVolunteerAId,
        dmVolunteerBId
      }
    })
  }

  await prisma.event_chat_members.upsert({
    where: { channelId_volunteerId: { channelId: channel.id, volunteerId: myVolunteerId } },
    create: { channelId: channel.id, volunteerId: myVolunteerId, role: 'MEMBER' },
    update: {}
  })
  await prisma.event_chat_members.upsert({
    where: { channelId_volunteerId: { channelId: channel.id, volunteerId: peerVolunteerId } },
    create: { channelId: channel.id, volunteerId: peerVolunteerId, role: 'MEMBER' },
    update: {}
  })

  return res.status(200).json({
    success: true,
    data: {
      channel: {
        id: channel.id,
        eventId: channel.eventId,
        type: channel.type,
        name: channel.name,
        dmVolunteerAId: channel.dmVolunteerAId,
        dmVolunteerBId: channel.dmVolunteerBId
      },
      peerPreview: {
        id: peerMembership.volunteer.id,
        firstName: peerMembership.volunteer.firstName,
        lastName: peerMembership.volunteer.lastName
      },
      selfPreview: myVolunteer
        ? { firstName: myVolunteer.firstName, lastName: myVolunteer.lastName }
        : null
    }
  })
}

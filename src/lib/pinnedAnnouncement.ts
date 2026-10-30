import { prisma } from './prisma'
import { canAccessEventChat } from './chatAccess'
import { getActiveLinkedVolunteerId } from './eventVolunteerIdentity'

export type PinnedAnnouncement = {
  messageId: string
  channelId: string
  body: string
  createdAt: string
  senderName: string
}

export async function resolveDashboardVolunteerId(
  eventId: string,
  sessionEmail: string,
  viewAsVolunteerId: string | null
): Promise<{ volunteerId: string; simulated: boolean } | null> {
  const access = await canAccessEventChat(eventId, sessionEmail, { viewAsVolunteerId })
  if (!access.allowed || !access.actor) return null

  if (access.actor.kind === 'volunteer') {
    return { volunteerId: access.actor.id, simulated: !!viewAsVolunteerId }
  }

  const linked = await getActiveLinkedVolunteerId(access.actor.id, eventId)
  if (!linked) return null
  return { volunteerId: linked, simulated: false }
}

function senderLabel(
  senderUser: { firstName: string; lastName: string } | null,
  senderVolunteer: { firstName: string; lastName: string } | null
) {
  const sender = senderUser || senderVolunteer
  const name = sender ? `${sender.firstName} ${sender.lastName}`.trim() : ''
  return name || 'Organizers'
}

export async function getUnacknowledgedPinnedAnnouncement(
  eventId: string,
  volunteerId: string
): Promise<PinnedAnnouncement | null> {
  const channel = await prisma.event_chat_channels.findFirst({
    where: {
      eventId,
      type: 'EVENT_ANNOUNCEMENTS',
      isArchived: false,
      pinnedMessageId: { not: null }
    },
    select: { id: true, pinnedMessageId: true }
  })
  if (!channel?.pinnedMessageId) return null

  const message = await prisma.event_chat_messages.findFirst({
    where: { id: channel.pinnedMessageId, channelId: channel.id, deletedAt: null },
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderUser: { select: { firstName: true, lastName: true } },
      senderVolunteer: { select: { firstName: true, lastName: true } }
    }
  })
  if (!message) return null

  const ack = await prisma.event_chat_pin_acknowledgments.findUnique({
    where: { messageId_volunteerId: { messageId: message.id, volunteerId } },
    select: { id: true }
  })
  if (ack) return null

  return {
    messageId: message.id,
    channelId: channel.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    senderName: senderLabel(message.senderUser, message.senderVolunteer)
  }
}

export async function acknowledgePinnedAnnouncement(
  eventId: string,
  volunteerId: string,
  messageId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const channel = await prisma.event_chat_channels.findFirst({
    where: {
      eventId,
      type: 'EVENT_ANNOUNCEMENTS',
      isArchived: false,
      pinnedMessageId: messageId
    },
    select: { id: true }
  })
  if (!channel) {
    return { ok: false, error: 'That announcement is no longer pinned' }
  }

  const message = await prisma.event_chat_messages.findFirst({
    where: { id: messageId, channelId: channel.id, deletedAt: null },
    select: { id: true }
  })
  if (!message) {
    return { ok: false, error: 'That announcement is no longer available' }
  }

  await prisma.event_chat_pin_acknowledgments.upsert({
    where: { messageId_volunteerId: { messageId, volunteerId } },
    create: { messageId, volunteerId },
    update: {}
  })

  return { ok: true }
}

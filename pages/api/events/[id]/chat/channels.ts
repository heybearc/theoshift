import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { canAccessEventChat } from '@/lib/chatAccess'
import { sortEventChatChannels } from '@/lib/chatChannelSort'
import { getActiveLinkedVolunteerId } from '@/lib/eventVolunteerIdentity'

async function archiveLegacyAnnouncementChannels(eventId: string) {
  await prisma.event_chat_channels.updateMany({
    where: { eventId, type: 'EVENT_ANNOUNCEMENTS', isArchived: false },
    data: { isArchived: true }
  })
}

async function ensureDefaultChannels(eventId: string) {
  await archiveLegacyAnnouncementChannels(eventId)

  const general = await prisma.event_chat_channels.findFirst({
    where: { eventId, type: 'EVENT_GENERAL', isArchived: false }
  })

  if (!general) {
    await prisma.event_chat_channels.create({
      data: {
        eventId,
        type: 'EVENT_GENERAL',
        name: 'Event General'
      }
    })
  }

  const staffInternal = await prisma.event_chat_channels.findFirst({
    where: { eventId, type: 'STAFF_INTERNAL', isArchived: false }
  })
  if (!staffInternal) {
    await prisma.event_chat_channels.create({
      data: {
        eventId,
        type: 'STAFF_INTERNAL',
        name: 'Staff Internal'
      }
    })
  }
}

function positionChannelName(position: { name: string; positionNumber: number }) {
  const trimmed = position.name.trim()
  return trimmed ? trimmed : `Position ${position.positionNumber}`
}

async function ensurePositionChannels(eventId: string) {
  const positions = await prisma.positions.findMany({
    where: { eventId, isActive: true },
    select: { id: true, name: true, positionNumber: true }
  })
  if (positions.length === 0) return

  const existing = await prisma.event_chat_channels.findMany({
    where: { eventId, type: 'POSITION', positionId: { not: null } },
    select: { id: true, positionId: true, name: true }
  })
  const byPositionId = new Map(existing.map((channel) => [channel.positionId, channel]))

  const missing: { eventId: string; type: 'POSITION'; positionId: string; name: string }[] = []
  const renames: { id: string; name: string }[] = []
  for (const position of positions) {
    const name = positionChannelName(position)
    const current = byPositionId.get(position.id)
    if (!current) {
      missing.push({ eventId, type: 'POSITION', positionId: position.id, name })
    } else if (current.name !== name) {
      renames.push({ id: current.id, name })
    }
  }

  if (missing.length > 0) {
    await prisma.event_chat_channels.createMany({
      data: missing,
      skipDuplicates: true
    })
  }

  if (renames.length > 0) {
    await prisma.$transaction(
      renames.map((channel) =>
        prisma.event_chat_channels.update({
          where: { id: channel.id },
          data: { name: channel.name }
        })
      )
    )
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id: eventId } = req.query
  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const viewAsVolunteerId =
    typeof req.headers['x-view-as-volunteer-id'] === 'string' ? req.headers['x-view-as-volunteer-id'] : null
  const chatAccess = await canAccessEventChat(eventId, session.user.email, { viewAsVolunteerId })
  if (!chatAccess.allowed || !chatAccess.actor) {
    return res.status(403).json({ success: false, error: 'Access denied for event chat' })
  }

  await ensureDefaultChannels(eventId)
  await ensurePositionChannels(eventId)

  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { settings: true }
  })
  const pushNotificationsEnabled = !!(event?.settings as any)?.chat?.pushNotificationsEnabled

  let positionIdsForVolunteer: string[] | null = null
  if (chatAccess.actor.kind === 'volunteer') {
    const assignments = await prisma.position_assignments.findMany({
      where: {
        volunteerId: chatAccess.actor.id,
        positions: { eventId }
      },
      select: { positionId: true }
    })
    positionIdsForVolunteer = [...new Set(assignments.map((a) => a.positionId))]
  }

  let linkedVolunteerId: string | null = null
  if (chatAccess.actor.kind === 'user') {
    linkedVolunteerId = await getActiveLinkedVolunteerId(chatAccess.actor.id, eventId)
  }

  const channels = await prisma.event_chat_channels.findMany({
    where: {
      eventId,
      isArchived: false,
      ...(chatAccess.actor.kind === 'volunteer'
        ? {
            OR: [
              { type: 'EVENT_GENERAL' },
              {
                type: 'POSITION',
                positionId:
                  positionIdsForVolunteer && positionIdsForVolunteer.length > 0
                    ? { in: positionIdsForVolunteer }
                    : { in: ['__none__'] }
              },
              {
                type: 'VOLUNTEER_DM',
                OR: [{ dmVolunteerAId: chatAccess.actor.id }, { dmVolunteerBId: chatAccess.actor.id }]
              }
            ]
          }
        : {
            OR: [
              { type: 'EVENT_GENERAL' },
              { type: 'POSITION' },
              { type: 'STAFF_INTERNAL' },
              ...(linkedVolunteerId
                ? [
                    {
                      type: 'VOLUNTEER_DM' as const,
                      OR: [{ dmVolunteerAId: linkedVolunteerId }, { dmVolunteerBId: linkedVolunteerId }]
                    }
                  ]
                : [])
            ]
          })
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      eventId: true,
      type: true,
      name: true,
      positionId: true,
      createdAt: true,
      updatedAt: true,
      pinnedMessageId: true,
      dmVolunteerAId: true,
      dmVolunteerBId: true
    }
  })

  // For DMs, show the other person's name (channel.name is set from the creator's peer)
  const selfVolunteerId =
    chatAccess.actor.kind === 'volunteer' ? chatAccess.actor.id : linkedVolunteerId
  let channelsForClient = channels
  if (selfVolunteerId) {
    const peerIds = [
      ...new Set(
        channels
          .filter((c) => c.type === 'VOLUNTEER_DM')
          .flatMap((c) => [c.dmVolunteerAId, c.dmVolunteerBId])
          .filter((id): id is string => !!id && id !== selfVolunteerId)
      )
    ]
    if (peerIds.length > 0) {
      const peers = await prisma.volunteers.findMany({
        where: { id: { in: peerIds } },
        select: { id: true, firstName: true, lastName: true }
      })
      const peerName = new Map(
        peers.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim() || 'Volunteer'])
      )
      channelsForClient = channels.map((c) => {
        if (c.type !== 'VOLUNTEER_DM') return c
        const peerId =
          c.dmVolunteerAId === selfVolunteerId
            ? c.dmVolunteerBId
            : c.dmVolunteerBId === selfVolunteerId
              ? c.dmVolunteerAId
              : null
        if (!peerId) return c
        const name = peerName.get(peerId)
        return name ? { ...c, name: `Message · ${name}` } : c
      })
    }
  }

  const channelsWithUnread = await Promise.all(
    sortEventChatChannels(channelsForClient).map(async (channel) => {
      const readState = await prisma.event_chat_reads.findFirst({
        where: {
          channelId: channel.id,
          ...(chatAccess.actor.kind === 'user'
            ? { userId: chatAccess.actor.id }
            : { volunteerId: chatAccess.actor.id })
        },
        select: { lastReadAt: true }
      })

      // Unread = messages after lastRead that are not "from this viewer".
      // Using NOT { senderVolunteerId: id } is wrong for volunteers: staff messages have null
      // senderVolunteerId, and in SQL NOT (NULL = id) is unknown, so those rows were excluded.
      const actorUserId = chatAccess.actor.id
      const unreadFromOthers =
        chatAccess.actor.kind === 'user'
          ? ({
              OR: [
                // Another staff member (senderUserId set)
                {
                  AND: [{ senderUserId: { not: null } }, { NOT: { senderUserId: actorUserId } }]
                },
                linkedVolunteerId
                  ? {
                      AND: [{ senderVolunteerId: { not: null } }, { NOT: { senderVolunteerId: linkedVolunteerId } }]
                    }
                  : { senderVolunteerId: { not: null } },
                // System / unknown sender
                { AND: [{ senderUserId: null }, { senderVolunteerId: null }] }
              ]
            } as const)
          : ({
              OR: [
                { senderVolunteerId: null },
                { NOT: { senderVolunteerId: actorUserId } }
              ]
            } as const)

      const unreadCount = await prisma.event_chat_messages.count({
        where: {
          channelId: channel.id,
          deletedAt: null,
          ...(readState?.lastReadAt ? { createdAt: { gt: readState.lastReadAt } } : {}),
          ...unreadFromOthers
        }
      })

      const latestMessage = await prisma.event_chat_messages.findFirst({
        where: { channelId: channel.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })

      return {
        ...channel,
        unreadCount,
        lastMessageAt: latestMessage?.createdAt?.toISOString() || null
      }
    })
  )

  return res.status(200).json({
    success: true,
    data: {
      actor: { kind: chatAccess.actor.kind, id: chatAccess.actor.id, role: chatAccess.actor.role },
      linkedVolunteerId,
      channels: channelsWithUnread,
      pushNotificationsEnabled
    }
  })
}

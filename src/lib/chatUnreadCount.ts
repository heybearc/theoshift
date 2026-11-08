import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

type ChatActor = { kind: 'user' | 'volunteer'; id: string }

export async function countUnreadChat(actor: ChatActor): Promise<number> {
  if (actor.kind === 'volunteer') return countUnreadForVolunteer(actor.id)
  return countUnreadForUser(actor.id)
}

async function countUnreadForVolunteer(volunteerId: string): Promise<number> {
  const [assignments, memberships] = await Promise.all([
    prisma.position_assignments.findMany({
      where: { volunteerId },
      select: { positionId: true },
      distinct: ['positionId'],
    }),
    prisma.event_volunteers.findMany({
      where: { volunteerId, isActive: true },
      select: { eventId: true },
    }),
  ])

  const positionIds = assignments.map((row) => row.positionId).filter(Boolean)
  const eventIds = memberships.map((row) => row.eventId).filter(Boolean)
  const or: Prisma.event_chat_channelsWhereInput[] = [
    {
      type: 'VOLUNTEER_DM',
      OR: [{ dmVolunteerAId: volunteerId }, { dmVolunteerBId: volunteerId }],
    },
  ]
  if (positionIds.length > 0) or.push({ type: 'POSITION', positionId: { in: positionIds } })
  if (eventIds.length > 0) {
    or.push({ type: { in: ['EVENT_GENERAL', 'EVENT_ANNOUNCEMENTS'] }, eventId: { in: eventIds } })
  }

  const channels = await prisma.event_chat_channels.findMany({
    where: { isArchived: false, OR: or },
    select: { id: true },
  })

  return countUnreadOnChannels(
    channels.map((channel) => channel.id),
    { volunteerId },
    {
      OR: [{ senderVolunteerId: null }, { NOT: { senderVolunteerId: volunteerId } }],
    }
  )
}

async function countUnreadForUser(userId: string): Promise<number> {
  const [permissions, linked] = await Promise.all([
    prisma.event_permissions.findMany({
      where: { userId },
      select: { eventId: true },
    }),
    prisma.volunteers.findMany({
      where: { userId },
      select: { id: true },
    }),
  ])

  const eventIds = permissions.map((row) => row.eventId).filter(Boolean)
  const linkedIds = linked.map((row) => row.id)
  const or: Prisma.event_chat_channelsWhereInput[] = []
  if (eventIds.length > 0) {
    or.push({ eventId: { in: eventIds }, NOT: { type: 'VOLUNTEER_DM' } })
  }
  if (linkedIds.length > 0) {
    or.push({
      type: 'VOLUNTEER_DM',
      OR: linkedIds.flatMap((id) => [{ dmVolunteerAId: id }, { dmVolunteerBId: id }]),
    })
  }
  if (or.length === 0) return 0

  const channels = await prisma.event_chat_channels.findMany({
    where: { isArchived: false, OR: or },
    select: { id: true },
  })

  return countUnreadOnChannels(
    channels.map((channel) => channel.id),
    { userId },
    {
      OR: [
        { AND: [{ senderUserId: { not: null } }, { NOT: { senderUserId: userId } }] },
        linkedIds.length > 0
          ? { AND: [{ senderVolunteerId: { not: null } }, { NOT: { senderVolunteerId: { in: linkedIds } } }] }
          : { senderVolunteerId: { not: null } },
        { AND: [{ senderUserId: null }, { senderVolunteerId: null }] },
      ],
    }
  )
}

async function countUnreadOnChannels(
  channelIds: string[],
  reader: { userId: string } | { volunteerId: string },
  notFromSelf: Prisma.event_chat_messagesWhereInput
): Promise<number> {
  if (channelIds.length === 0) return 0

  const reads = await prisma.event_chat_reads.findMany({
    where: {
      channelId: { in: channelIds },
      ...('userId' in reader ? { userId: reader.userId } : { volunteerId: reader.volunteerId }),
    },
    select: { channelId: true, lastReadAt: true },
  })
  const readAt = new Map(reads.map((row) => [row.channelId, row.lastReadAt]))
  const neverRead = channelIds.filter((id) => !readAt.has(id))
  const byTime = new Map<number, string[]>()
  for (const id of channelIds) {
    const read = readAt.get(id)
    if (!read) continue
    const key = read.getTime()
    const list = byTime.get(key) || []
    list.push(id)
    byTime.set(key, list)
  }

  const counts = await Promise.all([
    neverRead.length === 0
      ? Promise.resolve(0)
      : prisma.event_chat_messages.count({
          where: { channelId: { in: neverRead }, deletedAt: null, AND: [notFromSelf] },
        }),
    ...[...byTime.entries()].map(([time, ids]) =>
      prisma.event_chat_messages.count({
        where: {
          channelId: { in: ids },
          deletedAt: null,
          createdAt: { gt: new Date(time) },
          AND: [notFromSelf],
        },
      })
    ),
  ])

  return counts.reduce((sum, count) => sum + count, 0)
}

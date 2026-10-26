import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { canAccessChatChannel } from '@/lib/chatAccess'
import { checkEventAccess } from '@/lib/eventAccess'
import { getActiveLinkedVolunteerId } from '@/lib/eventVolunteerIdentity'
import { broadcastToChannel, broadcastToEvent } from '@/lib/chatRealtime'
import { isReleaseGateChatProbe } from '@/lib/chatReleaseGate'
import { sendWebPush } from '@/lib/webPush'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, channelId } = req.query
  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }
  if (!channelId || typeof channelId !== 'string') {
    return res.status(400).json({ success: false, error: 'Channel ID is required' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const viewAsVolunteerId =
    typeof req.headers['x-view-as-volunteer-id'] === 'string' ? req.headers['x-view-as-volunteer-id'] : null
  const access = await canAccessChatChannel(eventId, channelId, session.user.email, { viewAsVolunteerId })
  if (!access.allowed || !access.actor || !access.channel) {
    return res.status(403).json({ success: false, error: 'Access denied for this channel' })
  }

  if (req.method === 'GET') {
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 40
    const limit = Number.isNaN(limitRaw) ? 40 : Math.min(Math.max(limitRaw, 1), 100)
    const before = typeof req.query.before === 'string' ? req.query.before : undefined

    const messages = await prisma.event_chat_messages.findMany({
      where: {
        channelId,
        deletedAt: null,
        ...(before ? { createdAt: { lt: new Date(before) } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        body: true,
        kind: true,
        createdAt: true,
        editedAt: true,
        senderUser: { select: { id: true, firstName: true, lastName: true, role: true } },
        senderVolunteer: { select: { id: true, firstName: true, lastName: true } }
      }
    })

    if (messages.length > 0) {
      const newestMessage = messages[0]
      await prisma.event_chat_reads.upsert({
        where:
          access.actor.kind === 'user'
            ? { channelId_userId: { channelId, userId: access.actor.id } }
            : { channelId_volunteerId: { channelId, volunteerId: access.actor.id } },
        create:
          access.actor.kind === 'user'
            ? {
                channelId,
                userId: access.actor.id,
                lastReadMessageId: newestMessage.id,
                lastReadAt: new Date()
              }
            : {
                channelId,
                volunteerId: access.actor.id,
                lastReadMessageId: newestMessage.id,
                lastReadAt: new Date()
              },
        update: {
          lastReadMessageId: newestMessage.id,
          lastReadAt: new Date()
        }
      })
    }

    const pinnedMessageId = access.channel.pinnedMessageId || null
    const pinnedMessage =
      pinnedMessageId
        ? await prisma.event_chat_messages.findFirst({
            where: { id: pinnedMessageId, channelId, deletedAt: null },
            select: {
              id: true,
              body: true,
              kind: true,
              createdAt: true,
              editedAt: true,
              senderUser: { select: { id: true, firstName: true, lastName: true, role: true } },
              senderVolunteer: { select: { id: true, firstName: true, lastName: true } }
            }
          })
        : null

    return res.status(200).json({
      success: true,
      data: {
        channel: access.channel,
        actor: { kind: access.actor.kind, id: access.actor.id, role: access.actor.role },
        messages: [...messages].reverse(),
        nextBefore: messages.length > 0 ? messages[messages.length - 1].createdAt.toISOString() : null,
        pinnedMessageId,
        pinnedMessage
      }
    })
  }

  if (req.method === 'POST') {
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    if (!body) {
      return res.status(400).json({ success: false, error: 'Message body is required' })
    }
    if (body.length > 2000) {
      return res.status(400).json({ success: false, error: 'Message is too long (max 2000 chars)' })
    }

    const channelRow = access.channel

    let dmVolunteerSenderId: string | null = null
    if (channelRow.type === 'VOLUNTEER_DM') {
      if (access.actor.kind === 'volunteer') {
        dmVolunteerSenderId = access.actor.id
      } else {
        const linked = await getActiveLinkedVolunteerId(access.actor.id, eventId)
        const a = channelRow.dmVolunteerAId
        const b = channelRow.dmVolunteerBId
        if (!linked || !a || !b || (linked !== a && linked !== b)) {
          return res.status(403).json({ success: false, error: 'Access denied for this channel' })
        }
        dmVolunteerSenderId = linked
      }

      const member = await prisma.event_chat_members.findFirst({
        where: { channelId, volunteerId: dmVolunteerSenderId },
        select: { mutedUntil: true }
      })

      if (member?.mutedUntil && member.mutedUntil > new Date()) {
        return res.status(403).json({ success: false, error: 'You are muted in this channel' })
      }

      await prisma.event_chat_members.upsert({
        where: { channelId_volunteerId: { channelId, volunteerId: dmVolunteerSenderId } },
        create: { channelId, volunteerId: dmVolunteerSenderId, role: 'MEMBER' },
        update: {}
      })
    } else {
      const member = await prisma.event_chat_members.findFirst({
        where: {
          channelId,
          ...(access.actor.kind === 'user' ? { userId: access.actor.id } : { volunteerId: access.actor.id })
        },
        select: { mutedUntil: true }
      })

      if (member?.mutedUntil && member.mutedUntil > new Date()) {
        return res.status(403).json({ success: false, error: 'You are muted in this channel' })
      }

      await prisma.event_chat_members.upsert({
        where:
          access.actor.kind === 'user'
            ? { channelId_userId: { channelId, userId: access.actor.id } }
            : { channelId_volunteerId: { channelId, volunteerId: access.actor.id } },
        create:
          access.actor.kind === 'user'
            ? { channelId, userId: access.actor.id, role: 'MEMBER' }
            : { channelId, volunteerId: access.actor.id, role: 'MEMBER' },
        update: {}
      })
    }

    const message = await prisma.event_chat_messages.create({
      data: {
        channelId,
        body,
        kind: 'TEXT',
        ...(channelRow.type === 'VOLUNTEER_DM' && dmVolunteerSenderId
          ? { senderVolunteerId: dmVolunteerSenderId }
          : access.actor.kind === 'user'
            ? { senderUserId: access.actor.id }
            : { senderVolunteerId: access.actor.id })
      },
      select: {
        id: true,
        body: true,
        kind: true,
        createdAt: true,
        editedAt: true,
        senderUser: { select: { id: true, firstName: true, lastName: true, role: true } },
        senderVolunteer: { select: { id: true, firstName: true, lastName: true } }
      }
    })

    const releaseGateProbe = isReleaseGateChatProbe(
      req.headers['x-theoshift-release-gate'],
      body
    )

    if (!releaseGateProbe) {
    broadcastToChannel(channelId, { type: 'message:new', channelId, message })
    broadcastToEvent(eventId, { type: 'channel:activity', eventId, channelId, createdAt: message.createdAt })

    // Best-effort web push notifications (opt-in via subscription).
    // This is intentionally async and non-blocking for the request.
    ;(async () => {
      try {
        const channel = await prisma.event_chat_channels.findFirst({
          where: { id: channelId, eventId },
          select: {
            id: true,
            name: true,
            type: true,
            positionId: true,
            dmVolunteerAId: true,
            dmVolunteerBId: true
          }
        })
        if (!channel) return

        // Same person may have both a users subscription and a volunteers subscription (different sessions).
        // Skip notify if EITHER identity matches the subscription row — not only user:userId vs user:userId.
        const senderUserIds = new Set<string>()
        const senderVolunteerIds = new Set<string>()
        if (channel.type === 'VOLUNTEER_DM' && dmVolunteerSenderId) {
          senderVolunteerIds.add(dmVolunteerSenderId)
          const vol = await prisma.volunteers.findUnique({
            where: { id: dmVolunteerSenderId },
            select: { userId: true },
          })
          if (vol?.userId) senderUserIds.add(vol.userId)
        } else if (access.actor.kind === 'user') {
          senderUserIds.add(access.actor.id)
          const linkedVol = await getActiveLinkedVolunteerId(access.actor.id, eventId)
          if (linkedVol) senderVolunteerIds.add(linkedVol)
        } else {
          senderVolunteerIds.add(access.actor.id)
          const vol = await prisma.volunteers.findUnique({
            where: { id: access.actor.id },
            select: { userId: true },
          })
          if (vol?.userId) senderUserIds.add(vol.userId)
        }

        const staffUserIds = (
          await prisma.event_permissions.findMany({
            where: { eventId },
            select: { userId: true }
          })
        )
          .map((p) => p.userId)
          .filter(Boolean)

        let volunteerIds: string[] = []
        if (channel.type === 'POSITION' && channel.positionId) {
          volunteerIds = (
            await prisma.position_assignments.findMany({
              where: {
                positionId: channel.positionId,
                positions: { eventId }
              },
              select: { volunteerId: true }
            })
          )
            .map((a) => a.volunteerId)
            .filter(Boolean)
        } else if (channel.type === 'EVENT_GENERAL') {
          volunteerIds = (
            await prisma.event_volunteers.findMany({
              where: { eventId, isActive: true, volunteerId: { not: null } },
              select: { volunteerId: true }
            })
          )
            .map((ev) => ev.volunteerId as string)
            .filter(Boolean)
        } else if (
          channel.type === 'VOLUNTEER_DM' &&
          channel.dmVolunteerAId &&
          channel.dmVolunteerBId
        ) {
          volunteerIds = [channel.dmVolunteerAId, channel.dmVolunteerBId]
        }

        // STAFF_INTERNAL should notify staff only.
        if (channel.type === 'STAFF_INTERNAL') {
          volunteerIds = []
        }

        // Web push targets: DMs must only notify the two participants. The prior logic OR'd
        // all event staff (event_permissions) with volunteerIds, so every staff user received
        // volunteer DM push notifications.
        let pushUserIds: string[] = staffUserIds
        let pushVolunteerIds: string[] = volunteerIds
        if (channel.type === 'VOLUNTEER_DM' && channel.dmVolunteerAId && channel.dmVolunteerBId) {
          pushVolunteerIds = [channel.dmVolunteerAId, channel.dmVolunteerBId]
          const linkedUsers = await prisma.volunteers.findMany({
            where: { id: { in: pushVolunteerIds } },
            select: { userId: true }
          })
          pushUserIds = [...new Set(linkedUsers.map((v) => v.userId).filter((id): id is string => !!id))]
        }

        const orFilters: Array<{ userId: { in: string[] } } | { volunteerId: { in: string[] } }> = []
        if (pushUserIds.length) orFilters.push({ userId: { in: pushUserIds } })
        if (pushVolunteerIds.length) orFilters.push({ volunteerId: { in: pushVolunteerIds } })
        if (orFilters.length === 0) return

        const subs = await prisma.event_chat_push_subscriptions.findMany({
          where: { OR: orFilters },
          select: { endpoint: true, p256dh: true, auth: true, userId: true, volunteerId: true }
        })

        const payloadBase = {
          v: 1,
          kind: 'chat:new-message',
          eventId,
          channelId,
          channelName: channel.name,
          messageId: message.id,
          bodyPreview: message.body.slice(0, 140)
        }

        await Promise.all(
          subs.map(async (s) => {
            const skipSelf =
              (s.userId != null && senderUserIds.has(s.userId)) ||
              (s.volunteerId != null && senderVolunteerIds.has(s.volunteerId))
            if (skipSelf) return

            const url =
              s.userId
                ? `/events/${eventId}/chat`
                : `/volunteer/chat?eventId=${encodeURIComponent(eventId)}`

            try {
              await sendWebPush(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                { ...payloadBase, url }
              )
            } catch (err: any) {
              const statusCode = err?.statusCode
              if (statusCode === 404 || statusCode === 410) {
                await prisma.event_chat_push_subscriptions.deleteMany({ where: { endpoint: s.endpoint } })
              }
            }
          })
        )
      } catch {
        // ignore
      }
    })()
    }

    return res.status(201).json({ success: true, data: message })
  }

  if (req.method === 'DELETE') {
    const messageId = typeof req.query.messageId === 'string' ? req.query.messageId : null
    if (!messageId) {
      return res.status(400).json({ success: false, error: 'messageId is required' })
    }

    if (access.channel.type === 'VOLUNTEER_DM') {
      const a = access.channel.dmVolunteerAId
      const b = access.channel.dmVolunteerBId
      const linked =
        access.actor.kind === 'user' ? await getActiveLinkedVolunteerId(access.actor.id, eventId) : null
      const participantVolunteerId =
        access.actor.kind === 'volunteer' ? access.actor.id : linked
      const isParticipant = !!(a && b && participantVolunteerId && (participantVolunteerId === a || participantVolunteerId === b))
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          error: 'Direct messages are only visible to the two participants'
        })
      }
    }

    if (access.actor.kind !== 'user') {
      return res.status(403).json({ success: false, error: 'Only staff can moderate messages' })
    }

    const isSystemStaff = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(access.actor.role)
    const eventPermission = await checkEventAccess(access.actor.id, eventId, 'COORDINATOR')
    const isEventStaff = !!eventPermission && ['ADMIN', 'COORDINATOR'].includes(eventPermission.role)

    if (!isSystemStaff && !isEventStaff) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to moderate messages' })
    }

    const existing = await prisma.event_chat_messages.findFirst({
      where: { id: messageId, channelId, deletedAt: null },
      select: { id: true }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Message not found' })
    }

    await prisma.event_chat_messages.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    })

    if (access.channel.pinnedMessageId === messageId) {
      await prisma.event_chat_channels.update({
        where: { id: channelId },
        data: { pinnedMessageId: null }
      })
      broadcastToChannel(channelId, { type: 'pin:update', channelId, pinnedMessageId: null })
    }

    broadcastToChannel(channelId, { type: 'message:delete', channelId, messageId })

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}

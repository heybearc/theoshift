import type { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { prisma } from '@/lib/prisma'
import { resolveActorFromSessionEmail } from '@/lib/chatAccess'
import { isExpoPushToken } from '@/lib/expoPush'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const session = await getApiSession(req, res)
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const actor = await resolveActorFromSessionEmail(session.user.email)
  if (!actor) {
    return res.status(403).json({ success: false, error: 'Unable to resolve actor' })
  }

  const expoPushToken = typeof req.body?.expoPushToken === 'string' ? req.body.expoPushToken.trim() : ''
  const platform = req.body?.platform === 'ios' || req.body?.platform === 'android' ? req.body.platform : 'unknown'
  if (!isExpoPushToken(expoPushToken)) {
    return res.status(400).json({ success: false, error: 'A phone notification token is required' })
  }

  await prisma.event_chat_push_subscriptions.upsert({
    where: { endpoint: expoPushToken },
    create: {
      endpoint: expoPushToken,
      p256dh: 'expo',
      auth: 'expo',
      userAgent: `expo-${platform}`,
      lastSeenAt: new Date(),
      ...(actor.kind === 'user' ? { userId: actor.id } : { volunteerId: actor.id }),
    },
    update: {
      p256dh: 'expo',
      auth: 'expo',
      userAgent: `expo-${platform}`,
      lastSeenAt: new Date(),
      userId: actor.kind === 'user' ? actor.id : null,
      volunteerId: actor.kind === 'volunteer' ? actor.id : null,
    },
  })

  return res.status(200).json({ success: true })
}

import type { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { resolveActorFromSessionEmail } from '@/lib/chatAccess'
import { countUnreadChat } from '@/lib/chatUnreadCount'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

  const count = await countUnreadChat(actor)
  return res.status(200).json({ success: true, data: { count } })
}

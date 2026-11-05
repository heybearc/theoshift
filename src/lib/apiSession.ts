import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../pages/api/auth/[...nextauth]'
import { verifyMobileToken } from './mobileSession'
import { volunteerAccessAllows } from './volunteerSignins'

export type ApiSessionUser = {
  id: string
  email: string | null
  role: string
  name?: string | null
}

export type ApiSession = {
  user: ApiSessionUser
  sid: string | null
}

export async function getApiSession(req: NextApiRequest, res: NextApiResponse): Promise<ApiSession | null> {
  const header = req.headers.authorization
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const payload = verifyMobileToken(header.slice('Bearer '.length).trim())
    if (!payload) return null
    const allowed = await volunteerAccessAllows(payload.sub, payload.sid, payload.iat)
    if (!allowed) return null
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      },
      sid: payload.sid,
    }
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return null
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      role: session.user.role,
      name: session.user.name,
    },
    sid: session.sid ?? null,
  }
}

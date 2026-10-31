import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../pages/api/auth/[...nextauth]'
import { verifyMobileToken } from './mobileSession'

export type ApiSessionUser = {
  id: string
  email: string | null
  role: string
  name?: string | null
}

export type ApiSession = {
  user: ApiSessionUser
}

export async function getApiSession(req: NextApiRequest, res: NextApiResponse): Promise<ApiSession | null> {
  const header = req.headers.authorization
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const payload = verifyMobileToken(header.slice('Bearer '.length).trim())
    if (!payload) return null
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      },
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
  }
}

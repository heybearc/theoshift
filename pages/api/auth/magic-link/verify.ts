import type { NextApiRequest, NextApiResponse } from 'next'
import { consumeMagicLink } from '@/lib/magicLink'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, email: emailParam } = req.query

  if (!token || !emailParam || typeof token !== 'string' || typeof emailParam !== 'string') {
    return res.redirect('/auth/signin?error=InvalidToken')
  }

  try {
    const result = await consumeMagicLink(token, emailParam)
    if (!result.ok) {
      return res.redirect(`/auth/signin?error=${result.error}`)
    }

    const sessionToken = token.substring(0, 32)
    return res.redirect(
      `/api/auth/magic-link/callback?session=${sessionToken}&email=${encodeURIComponent(result.volunteer.email)}`
    )
  } catch (error) {
    console.error('Magic link verification error:', error)
    return res.redirect('/auth/signin?error=VerificationFailed')
  }
}

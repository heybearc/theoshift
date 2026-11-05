import type { NextApiRequest, NextApiResponse } from 'next'
import { consumeMagicLink } from '@/lib/magicLink'
import { createVolunteerSignin, mobileAccessToken } from '@/lib/volunteerSignins'
import { normalizeSigninPlatform } from '@/lib/signinAccess'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  if (!token || !email) {
    return res.status(400).json({ success: false, error: 'Token and email are required' })
  }

  try {
    const result = await consumeMagicLink(token, email)
    if (!result.ok) {
      const status = result.error === 'TokenExpired' ? 410 : 401
      return res.status(status).json({ success: false, error: result.error })
    }

    const signin = await createVolunteerSignin(result.volunteer.id, normalizeSigninPlatform(req.body?.platform))
    const accessToken = mobileAccessToken(
      { ...result.volunteer, congregation: '' },
      signin.id
    )
    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        volunteer: {
          id: result.volunteer.id,
          email: result.volunteer.email,
          firstName: result.volunteer.firstName,
          lastName: result.volunteer.lastName,
        },
      },
    })
  } catch (error) {
    console.error('Mobile magic-link exchange error:', error)
    const message = error instanceof Error ? error.message : 'Failed to sign in'
    return res.status(500).json({ success: false, error: message })
  }
}

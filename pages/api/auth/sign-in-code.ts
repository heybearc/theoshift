import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyReviewSignIn } from '@/lib/reviewSignIn'
import { normalizeSigninPlatform } from '@/lib/signinAccess'
import { createVolunteerSignin, mobileAccessToken, writeVolunteerSessionCookie } from '@/lib/volunteerSignins'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  const code = typeof req.body?.code === 'string' ? req.body.code : ''
  if (!email || !code.trim()) {
    return res.status(400).json({ success: false, error: 'Email and sign-in code are required' })
  }

  try {
    const result = await verifyReviewSignIn(email, code)
    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.error })
    }

    const forMobile = req.body?.client === 'mobile'
    const platform = forMobile ? normalizeSigninPlatform(req.body?.platform) : 'web'
    const signin = await createVolunteerSignin(result.volunteer.id, platform)

    if (forMobile) {
      const accessToken = mobileAccessToken(result.volunteer, signin.id)
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
    }

    await writeVolunteerSessionCookie(req, res, result.volunteer, signin.id)
    return res.status(200).json({ success: true, data: { redirect: '/volunteer/select-event' } })
  } catch (error) {
    console.error('Sign-in code error', error)
    return res.status(500).json({ success: false, error: 'Could not sign in' })
  }
}

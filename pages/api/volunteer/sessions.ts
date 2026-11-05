import type { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { prisma } from '@/lib/prisma'
import { normalizeSigninPlatform } from '@/lib/signinAccess'
import {
  listVolunteerSignins,
  mobileAccessToken,
  revokeCurrentOrLegacy,
  revokeOtherVolunteerSignins,
  revokeVolunteerSignin,
  writeVolunteerSessionCookie,
} from '@/lib/volunteerSignins'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getApiSession(req, res)
  if (!session?.user?.id || session.user.role !== 'VOLUNTEER') {
    return res.status(401).json({ success: false, error: 'Sign in as a volunteer first.' })
  }

  const volunteerId = session.user.id
  const bearer = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')

  try {
    if (req.method === 'GET') {
      const signins = await listVolunteerSignins(volunteerId, session.sid)
      return res.status(200).json({ success: true, data: { currentId: session.sid, signins } })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    const action = typeof req.body?.action === 'string' ? req.body.action : ''

    if (action === 'revoke-current') {
      await revokeCurrentOrLegacy(volunteerId, session.sid)
      return res.status(200).json({ success: true })
    }

    if (action === 'revoke') {
      const id = typeof req.body?.id === 'string' ? req.body.id : ''
      if (!id) return res.status(400).json({ success: false, error: 'Choose a sign-in to end.' })
      const revoked = await revokeVolunteerSignin(volunteerId, id)
      if (!revoked) return res.status(404).json({ success: false, error: 'That sign-in is already ended.' })
      return res.status(200).json({ success: true, data: { signedOut: id === session.sid } })
    }

    if (action === 'revoke-others') {
      const platform = bearer ? normalizeSigninPlatform(req.body?.platform) : 'web'
      const signin = await revokeOtherVolunteerSignins(volunteerId, platform)
      const volunteer = await prisma.volunteers.findUnique({ where: { id: volunteerId } })
      if (!volunteer) return res.status(401).json({ success: false, error: 'Volunteer not found' })

      if (bearer) {
        return res.status(200).json({
          success: true,
          data: { accessToken: mobileAccessToken(volunteer, signin.id) },
        })
      }

      await writeVolunteerSessionCookie(req, res, volunteer, signin.id)
      return res.status(200).json({ success: true, data: {} })
    }

    return res.status(400).json({ success: false, error: 'Unknown action' })
  } catch (error) {
    console.error('Volunteer sessions error', error)
    return res.status(500).json({ success: false, error: 'Could not update sign-ins' })
  }
}

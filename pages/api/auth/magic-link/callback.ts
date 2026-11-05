import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../src/lib/prisma'
import { findVolunteerByEmailCaseInsensitive } from '@/lib/volunteerEmailLookup'
import { createVolunteerSignin, writeVolunteerSessionCookie } from '@/lib/volunteerSignins'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { session: sessionToken, email } = req.query

  if (!sessionToken || !email || typeof email !== 'string') {
    return res.redirect('/auth/signin?error=InvalidSession')
  }

  try {
    let volunteer = await prisma.volunteers.findUnique({
      where: { email }
    })
    if (!volunteer) {
      volunteer = await findVolunteerByEmailCaseInsensitive(email)
    }

    if (!volunteer) {
      return res.redirect('/auth/signin?error=VolunteerNotFound')
    }

    const signin = await createVolunteerSignin(volunteer.id, 'web')
    await writeVolunteerSessionCookie(req, res, volunteer, signin.id)

    return res.redirect('/volunteer/select-event')
    
  } catch (error) {
    console.error('Magic link callback error:', error)
    return res.redirect('/auth/signin?error=CallbackFailed')
  }
}

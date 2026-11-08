import type { NextApiRequest, NextApiResponse } from 'next'
import { handoffHtml, verifyWebHandoff, writeStaffSessionCookie } from '@/lib/appWebHandoff'
import { prisma } from '@/lib/prisma'
import { createVolunteerSignin, volunteerAccessAllows, writeVolunteerSessionCookie } from '@/lib/volunteerSignins'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const handoff = code ? verifyWebHandoff(code) : null
  if (!handoff) {
    return res.redirect('/auth/signin?error=InvalidSession')
  }

  try {
    if (handoff.kind === 'volunteer') {
      const allowed = await volunteerAccessAllows(handoff.sub, handoff.sid, handoff.iat ?? undefined)
      if (!allowed) return res.redirect('/auth/signin?error=InvalidSession')

      const volunteer = await prisma.volunteers.findUnique({ where: { id: handoff.sub } })
      if (!volunteer) return res.redirect('/auth/signin?error=VolunteerNotFound')

      let sid = handoff.sid
      if (!sid) {
        const signin = await createVolunteerSignin(volunteer.id, 'web')
        sid = signin.id
      }

      await writeVolunteerSessionCookie(
        req,
        res,
        {
          id: volunteer.id,
          email: volunteer.email || '',
          firstName: volunteer.firstName,
          lastName: volunteer.lastName,
          congregation: volunteer.congregation || '',
        },
        sid
      )
    } else {
      const user = await prisma.users.findUnique({ where: { id: handoff.sub } })
      if (!user || !user.isActive) return res.redirect('/auth/signin?error=InvalidSession')
      await writeStaffSessionCookie(req, res, user)
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(handoffHtml(handoff.path))
  } catch (error) {
    console.error('Mobile web session error:', error)
    return res.redirect('/auth/signin?error=CallbackFailed')
  }
}

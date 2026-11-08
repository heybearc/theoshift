import type { NextApiRequest, NextApiResponse } from 'next'
import { handoffHtml, sessionDeniedHtml, verifyWebHandoff, writeStaffSessionCookie } from '@/lib/appWebHandoff'
import { isOversightRole } from '@/lib/mobileSession'
import { prisma } from '@/lib/prisma'
import { createVolunteerSignin, volunteerAccessAllows, writeVolunteerSessionCookie } from '@/lib/volunteerSignins'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const handoff = code ? verifyWebHandoff(code) : null
  if (!handoff) return deny(res)

  try {
    if (handoff.kind === 'volunteer') {
      const allowed = await volunteerAccessAllows(handoff.sub, handoff.sid, handoff.iat ?? undefined)
      if (!allowed) return deny(res)

      const volunteer = await prisma.volunteers.findUnique({ where: { id: handoff.sub } })
      if (!volunteer) return deny(res)

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
      if (!user || !user.isActive || !isOversightRole(user.role)) {
        return deny(res)
      }
      await writeStaffSessionCookie(req, res, user)
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(handoffHtml(handoff.path))
  } catch (error) {
    console.error('Mobile web session error:', error)
    return deny(res)
  }
}

function deny(res: NextApiResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(401).send(sessionDeniedHtml())
}

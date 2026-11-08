import type { NextApiRequest, NextApiResponse } from 'next'
import { safeAppPath, signWebHandoff } from '@/lib/appWebHandoff'
import { verifyMobileToken, verifyStaffToken } from '@/lib/mobileSession'
import { volunteerAccessAllows } from '@/lib/volunteerSignins'

function bearer(req: NextApiRequest): string {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length).trim()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const path = safeAppPath(req.body?.path)
  if (!path) {
    return res.status(400).json({ success: false, error: 'That page is not available in the app' })
  }

  const token = bearer(req)
  const volunteer = token ? verifyMobileToken(token) : null
  const staff = token ? verifyStaffToken(token) : null
  if (!volunteer && !staff) {
    return res.status(401).json({ success: false, error: 'Sign in again to open that page' })
  }

  try {
    if (volunteer) {
      const allowed = await volunteerAccessAllows(volunteer.sub, volunteer.sid, volunteer.iat)
      if (!allowed) {
        return res.status(401).json({ success: false, error: 'Sign in again to open that page' })
      }
      const code = signWebHandoff({
        sub: volunteer.sub,
        kind: 'volunteer',
        path,
        sid: volunteer.sid,
        iat: volunteer.iat ?? null,
      })
      return res.status(200).json({ success: true, data: { code } })
    }

    const code = signWebHandoff({
      sub: staff!.sub,
      kind: 'staff',
      path,
      sid: null,
      iat: null,
    })
    return res.status(200).json({ success: true, data: { code } })
  } catch (error) {
    console.error('Mobile web handoff error:', error)
    const message = error instanceof Error ? error.message : 'Could not open that page'
    return res.status(500).json({ success: false, error: message })
  }
}

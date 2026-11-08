import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'
import { encode } from 'next-auth/jwt'
import { VOLUNTEER_SESSION_SECONDS } from './mobileSession'
import { sessionTokenCookieName, useSecureCookies } from './nextAuthCookieHelpers'

export { safeAppPath, signWebHandoff, verifyWebHandoff, volunteerMayOpen } from './appWebHandoffToken'
export type { WebHandoff } from './appWebHandoffToken'

export async function writeStaffSessionCookie(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: string; email: string; firstName: string; lastName: string; role: string }
) {
  const key = process.env.NEXTAUTH_SECRET
  if (!key) throw new Error('NEXTAUTH_SECRET not configured')

  const token = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
    },
    secret: key,
    maxAge: VOLUNTEER_SESSION_SECONDS,
  })

  res.setHeader(
    'Set-Cookie',
    serialize(sessionTokenCookieName(req), token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: useSecureCookies(req),
      maxAge: VOLUNTEER_SESSION_SECONDS,
    })
  )
}

export function sessionDeniedHtml(): string {
  return '<!doctype html><html><head><meta charset="utf-8"></head><body><p>Sign in again in the TheoShift app.</p></body></html>'
}

export function handoffHtml(path: string): string {
  const safe = path.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${safe}"></head><body><p><a href="${safe}">Continue</a></p></body></html>`
}

import jwt from 'jsonwebtoken'

const HANDOFF_TYPE = 'theoshift-web-handoff'
const HANDOFF_SECONDS = 90

const ALLOWED_PREFIXES = [
  '/events',
  '/admin',
  '/volunteer',
  '/help',
  '/profile',
  '/release-notes',
  '/privacy',
  '/guest-lookup',
  '/account',
]

const VOLUNTEER_PREFIXES = ['/volunteer', '/help', '/profile', '/privacy', '/account']

export type WebHandoff = {
  sub: string
  kind: 'volunteer' | 'staff'
  path: string
  sid: string | null
  iat: number | null
}

function secret(): string | null {
  const value = process.env.NEXTAUTH_SECRET
  return value && value.length > 0 ? value : null
}

/** Relative website path the phone app is allowed to open. */
export function safeAppPath(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\') || trimmed.includes('..')) {
    return null
  }

  let url: URL
  try {
    url = new URL(trimmed, 'https://theoshift.com')
  } catch {
    return null
  }
  if (url.origin !== 'https://theoshift.com') return null
  if (url.username || url.password || url.hash) return null

  const pathname = url.pathname
  const allowed = ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (!allowed) return null
  return `${pathname}${url.search}`
}

/** Volunteer sign-ins can open volunteer pages. Event and admin pages need oversight. */
export function volunteerMayOpen(path: string): boolean {
  const pathname = path.split('?')[0]
  return VOLUNTEER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function signWebHandoff(handoff: WebHandoff): string {
  const key = secret()
  if (!key) throw new Error('Server misconfigured (NEXTAUTH_SECRET missing)')
  return jwt.sign(
    {
      typ: HANDOFF_TYPE,
      kind: handoff.kind,
      path: handoff.path,
      sid: handoff.sid,
      issuedAt: handoff.iat,
    },
    key,
    { subject: handoff.sub, expiresIn: HANDOFF_SECONDS }
  )
}

export function verifyWebHandoff(token: string): WebHandoff | null {
  const key = secret()
  if (!key) return null
  try {
    const decoded = jwt.verify(token, key)
    if (!decoded || typeof decoded === 'string') return null
    if (decoded.typ !== HANDOFF_TYPE) return null
    if (decoded.kind !== 'volunteer' && decoded.kind !== 'staff') return null
    if (typeof decoded.sub !== 'string') return null
    const path = safeAppPath(decoded.path)
    if (!path) return null
    return {
      sub: decoded.sub,
      kind: decoded.kind,
      path,
      sid: typeof decoded.sid === 'string' ? decoded.sid : null,
      iat: typeof decoded.issuedAt === 'number' ? decoded.issuedAt : null,
    }
  } catch {
    return null
  }
}

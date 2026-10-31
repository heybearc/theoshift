import jwt from 'jsonwebtoken'

const MOBILE_TOKEN_TYPE = 'theoshift-mobile'

export type MobileTokenPayload = {
  sub: string
  email: string
  role: 'VOLUNTEER'
  name: string
}

function secret(): string | null {
  const value = process.env.NEXTAUTH_SECRET
  return value && value.length > 0 ? value : null
}

export function signMobileToken(volunteer: {
  id: string
  email: string
  firstName: string
  lastName: string
}): string {
  const key = secret()
  if (!key) {
    throw new Error('Server misconfigured (NEXTAUTH_SECRET missing)')
  }

  return jwt.sign(
    {
      typ: MOBILE_TOKEN_TYPE,
      email: volunteer.email,
      role: 'VOLUNTEER',
      name: `${volunteer.firstName} ${volunteer.lastName}`.trim(),
    },
    key,
    { subject: volunteer.id, expiresIn: '30d' }
  )
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  const key = secret()
  if (!key) return null

  try {
    const decoded = jwt.verify(token, key)
    if (!decoded || typeof decoded === 'string') return null
    if (decoded.typ !== MOBILE_TOKEN_TYPE) return null
    if (decoded.role !== 'VOLUNTEER') return null
    if (typeof decoded.sub !== 'string' || typeof decoded.email !== 'string') return null
    return {
      sub: decoded.sub,
      email: decoded.email,
      role: 'VOLUNTEER',
      name: typeof decoded.name === 'string' ? decoded.name : '',
    }
  } catch {
    return null
  }
}

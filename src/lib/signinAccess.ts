export type SigninRow = {
  volunteerId: string
  revokedAt: Date | null
  expiresAt: Date
}

export function signinIsActive(input: {
  volunteerId: string
  sid: string | null
  iat: number | undefined
  sessionValidAfter: Date | null
  isActive: boolean
  row: SigninRow | null
  now?: Date
}): boolean {
  if (!input.isActive) return false
  const now = input.now ?? new Date()
  if (input.sessionValidAfter) {
    const issuedAtMs = (input.iat ?? 0) * 1000
    if (issuedAtMs < input.sessionValidAfter.getTime()) return false
  }
  if (!input.sid) return true
  const row = input.row
  if (!row) return false
  if (row.volunteerId !== input.volunteerId) return false
  if (row.revokedAt) return false
  if (row.expiresAt.getTime() <= now.getTime()) return false
  return true
}

export function platformLabel(platform: string): string {
  if (platform === 'ios') return 'iPhone or iPad'
  if (platform === 'android') return 'Android phone'
  if (platform === 'web') return 'Website'
  return 'Phone'
}

export function normalizeSigninPlatform(value: unknown): string {
  if (value === 'ios' || value === 'android' || value === 'web') return value
  return 'unknown'
}

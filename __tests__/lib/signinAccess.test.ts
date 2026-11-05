import { signinIsActive } from '../../src/lib/signinAccess'

const now = new Date('2026-11-05T15:00:00.000Z')
const volunteerId = 'vol_1'

function row(overrides: Partial<{ revokedAt: Date | null; expiresAt: Date; volunteerId: string }> = {}) {
  return {
    volunteerId,
    revokedAt: null,
    expiresAt: new Date('2026-12-05T15:00:00.000Z'),
    ...overrides,
  }
}

describe('signinIsActive', () => {
  it('keeps an older sign-in that has no device id', () => {
    expect(
      signinIsActive({
        volunteerId,
        sid: null,
        iat: Math.floor(now.getTime() / 1000) - 60,
        sessionValidAfter: null,
        isActive: true,
        row: null,
        now,
      })
    ).toBe(true)
  })

  it('ends older sign-ins once a lost phone is signed out everywhere else', () => {
    const floor = new Date(now.getTime() - 2000)
    expect(
      signinIsActive({
        volunteerId,
        sid: null,
        iat: Math.floor((floor.getTime() - 60_000) / 1000),
        sessionValidAfter: floor,
        isActive: true,
        row: null,
        now,
      })
    ).toBe(false)
  })

  it('rejects a revoked phone', () => {
    expect(
      signinIsActive({
        volunteerId,
        sid: 'signin_1',
        iat: Math.floor(now.getTime() / 1000),
        sessionValidAfter: null,
        isActive: true,
        row: row({ revokedAt: now }),
        now,
      })
    ).toBe(false)
  })

  it('accepts the phone that just signed in', () => {
    const floor = new Date(now.getTime() - 2000)
    expect(
      signinIsActive({
        volunteerId,
        sid: 'signin_2',
        iat: Math.floor(now.getTime() / 1000),
        sessionValidAfter: floor,
        isActive: true,
        row: row(),
        now,
      })
    ).toBe(true)
  })
})

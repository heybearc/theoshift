import { signMobileToken, signStaffToken, verifyMobileToken, verifyStaffToken } from '../../src/lib/mobileSession'

describe('mobileSession', () => {
  const previous = process.env.NEXTAUTH_SECRET

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-mobile-secret'
  })

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = previous
  })

  it('round-trips a volunteer token', () => {
    const token = signMobileToken(
      {
        id: 'vol_1',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
      'signin_1'
    )
    expect(verifyMobileToken(token)).toEqual({
      sub: 'vol_1',
      email: 'ada@example.com',
      role: 'VOLUNTEER',
      name: 'Ada Lovelace',
      sid: 'signin_1',
      iat: expect.any(Number),
    })
  })

  it('round-trips an oversight token and keeps it off the volunteer checker', () => {
    const token = signStaffToken({
      id: 'user_1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'ADMIN',
    })
    expect(verifyStaffToken(token)?.role).toBe('ADMIN')
    expect(verifyMobileToken(token)).toBeNull()
  })

  it('rejects a volunteer role on the oversight checker', () => {
    const token = signStaffToken({
      id: 'user_1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'VOLUNTEER',
    })
    expect(verifyStaffToken(token)).toBeNull()
  })

  it('rejects a token signed for another purpose', () => {
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken')
    const token = jwt.sign({ typ: 'other', email: 'ada@example.com', role: 'VOLUNTEER' }, 'test-mobile-secret', {
      subject: 'vol_1',
    })
    expect(verifyMobileToken(token)).toBeNull()
  })
})

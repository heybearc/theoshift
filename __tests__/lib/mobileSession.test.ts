import { signMobileToken, verifyMobileToken } from '../../src/lib/mobileSession'

describe('mobileSession', () => {
  const previous = process.env.NEXTAUTH_SECRET

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-mobile-secret'
  })

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = previous
  })

  it('round-trips a volunteer token', () => {
    const token = signMobileToken({
      id: 'vol_1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
    expect(verifyMobileToken(token)).toEqual({
      sub: 'vol_1',
      email: 'ada@example.com',
      role: 'VOLUNTEER',
      name: 'Ada Lovelace',
    })
  })

  it('rejects a token signed for another purpose', () => {
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken')
    const token = jwt.sign({ typ: 'other', email: 'ada@example.com', role: 'VOLUNTEER' }, 'test-mobile-secret', {
      subject: 'vol_1',
    })
    expect(verifyMobileToken(token)).toBeNull()
  })
})

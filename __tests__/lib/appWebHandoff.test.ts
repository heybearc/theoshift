import { safeAppPath, signWebHandoff, verifyWebHandoff } from '../../src/lib/appWebHandoffToken'

describe('appWebHandoff', () => {
  const previous = process.env.NEXTAUTH_SECRET

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-mobile-secret'
  })

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = previous
  })

  it('allows website pages and drops anything else', () => {
    expect(safeAppPath('/events/abc/volunteers')).toBe('/events/abc/volunteers')
    expect(safeAppPath('/admin/users?x=1')).toBe('/admin/users?x=1')
    expect(safeAppPath('https://theoshift.com/admin')).toBeNull()
    expect(safeAppPath('//evil.example/admin')).toBeNull()
    expect(safeAppPath('/api/auth/mobile/staff')).toBeNull()
    expect(safeAppPath('/events/../admin')).toBeNull()
  })

  it('round-trips a signed handoff', () => {
    const token = signWebHandoff({
      sub: 'user_1',
      kind: 'staff',
      path: '/events/select',
      sid: null,
      iat: null,
    })
    expect(verifyWebHandoff(token)).toMatchObject({
      sub: 'user_1',
      kind: 'staff',
      path: '/events/select',
    })
  })
})

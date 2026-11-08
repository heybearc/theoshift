import { parseMobileSignInBody } from '../../src/lib/mobileSignInBody'

const payload = { email: 'ada@example.com', password: 's&cret', platform: 'ios' }

describe('parseMobileSignInBody', () => {
  it('reads utf-8 json', () => {
    const body = Buffer.from(JSON.stringify(payload), 'utf8')
    expect(parseMobileSignInBody(body, 'application/json')).toEqual(payload)
  })

  it('reads utf-16 json that the default parser rejects', () => {
    const body = Buffer.from(JSON.stringify(payload), 'utf16le')
    expect(parseMobileSignInBody(body, 'application/json; charset=utf-8')).toEqual(payload)
  })

  it('reads a form body', () => {
    const body = Buffer.from('email=ada%40example.com&password=s%26cret&platform=ios', 'utf8')
    expect(parseMobileSignInBody(body, 'application/x-www-form-urlencoded; charset=utf-8')).toEqual(payload)
  })

  it('rejects a body that is not a sign-in', () => {
    expect(() => parseMobileSignInBody(Buffer.from('not a sign-in', 'utf8'), 'application/json')).toThrow(
      'Unreadable sign-in body'
    )
  })
})
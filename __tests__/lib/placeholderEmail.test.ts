import { isPlaceholderEmail } from '../../src/lib/placeholderEmail'

describe('isPlaceholderEmail', () => {
  it('matches changeme anywhere in the address, ignoring case', () => {
    expect(isPlaceholderEmail('changeme@example.com')).toBe(true)
    expect(isPlaceholderEmail('Person.ChangeMe@congregation.org')).toBe(true)
    expect(isPlaceholderEmail('  ')).toBe(false)
    expect(isPlaceholderEmail('ada@example.com')).toBe(false)
    expect(isPlaceholderEmail(null)).toBe(false)
  })
})

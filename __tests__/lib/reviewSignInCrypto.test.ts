import { decryptReviewCode, encryptReviewCode, reviewCodesMatch } from '../../src/lib/reviewSignInCrypto'

describe('review sign-in code', () => {
  const previous = process.env.NEXTAUTH_SECRET

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-review-secret'
  })

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = previous
  })

  it('stores a code that can be shown again to paste into the stores', () => {
    const encrypted = encryptReviewCode('review-code-123')
    expect(encrypted).not.toContain('review-code-123')
    expect(decryptReviewCode(encrypted)).toBe('review-code-123')
  })

  it('matches the code without comparing the raw text', () => {
    expect(reviewCodesMatch('review-code-123', 'review-code-123')).toBe(true)
    expect(reviewCodesMatch('review-code-123', 'review-code-124')).toBe(false)
  })
})
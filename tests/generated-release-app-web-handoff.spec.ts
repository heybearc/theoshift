/**
 * Generated release tests for opening the website from the phone app:
 * - a page outside the app is rejected
 * - opening a real page requires the phone sign-in
 * - a handoff link with no code does not start a website session
 * - the phone badge count requires a website sign-in
 */
import { test, expect } from '@playwright/test'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

test.describe('Generated release — open the website from the phone', () => {
  test('an outside address cannot be opened from the phone', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/mobile/web-handoff`, {
      data: { path: 'https://example.com' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })

  test('opening a website page requires the phone sign-in', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/mobile/web-handoff`, {
      data: { path: '/volunteer/dashboard' },
    })
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(String(body.error || '')).toMatch(/sign in/i)
  })

  test('a handoff link without a code does not sign the browser in', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/auth/mobile/web-session`)
    expect(response.status()).toBe(401)
    const html = await response.text()
    expect(html).toContain('Sign in again in the TheoShift app.')
  })

  test('the phone badge count requires a sign-in', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/chat/push/badge`)
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
  })
})

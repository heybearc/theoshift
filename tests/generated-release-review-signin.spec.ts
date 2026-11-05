/**
 * Generated release tests for store review sign-in and lost-phone sign-out:
 * - volunteer sign-in shows a sign-in code field and button
 * - a code that is not the review code is rejected
 * - phone sign-out requires a volunteer session
 */
import { test, expect } from '@playwright/test'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

test.describe('Generated release — review sign-in and lost phone', () => {
  test('volunteer sign-in offers a sign-in code', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin?role=volunteer`)
    await page.getByRole('button', { name: /Volunteer/ }).click()
    await expect(page.locator('#volunteer-code')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in with code' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send Sign-In Link' })).toBeVisible()
  })

  test('an unknown sign-in code is rejected', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-in-code`, {
      data: {
        email: `review-check-${Date.now()}@example.com`,
        code: 'not-the-review-code',
        client: 'web',
      },
    })
    expect([400, 401]).toContain(response.status())
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(String(body.error || '').length).toBeGreaterThan(0)
  })

  test('listing phones requires a volunteer sign-in', async ({ page, request }) => {
    const response = await request.get(`${BASE_URL}/api/volunteer/sessions`)
    expect(response.status()).toBe(401)

    await page.goto(`${BASE_URL}/volunteer/devices`)
    await page.waitForURL(/\/auth\/signin/, { timeout: 15000 })
    expect(page.url()).toContain('role=volunteer')
  })
})

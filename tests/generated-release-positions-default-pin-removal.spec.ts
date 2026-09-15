/**
 * Generated release tests for Positions default + volunteer PIN removal.
 * Covers BASE_REV v4.32.1..HEAD behavior.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl, getValidEventId } from './helpers/test-config'

const BASE_URL = getBaseUrl()

test.describe('Generated release — Positions default and PIN removal', () => {
  test('volunteer PIN login API is retired', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/volunteer/login`, {
      data: {
        firstName: 'Test',
        lastName: 'Volunteer',
        congregation: 'Example',
        pin: '1234',
      },
    })
    expect(response.status()).toBe(410)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(String(body.error)).toMatch(/removed|email sign-in/i)
  })

  test('attendant PIN admin page is gone', async ({ page }) => {
    await loginAsAdmin(page)
    const response = await page.goto(`${BASE_URL}/admin/attendant-pins`)
    expect(response?.status()).toBe(404)
  })

  test('Positions nav from an event overview goes to the day board', async ({ page }) => {
    await loginAsAdmin(page)
    const eventId = await getValidEventId(page)
    await page.goto(`${BASE_URL}/events/${eventId}`)
    await page.waitForLoadState('domcontentloaded')

    const positionsLink = page.getByRole('link', { name: /Positions/i }).first()
    await expect(positionsLink).toHaveAttribute(
      'href',
      new RegExp(`/events/${eventId}/positions-next`)
    )
  })
})

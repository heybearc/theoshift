/**
 * Generated release test: Bulk create on the day board stays open
 * after shift patterns load (v4.33.5..HEAD).
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl, getValidEventId } from './helpers/test-config'

const BASE_URL = getBaseUrl()

let cachedEventId: string | null = null

async function getEventId(page: import('@playwright/test').Page): Promise<string> {
  if (!cachedEventId) {
    cachedEventId = await getValidEventId(page)
  }
  return cachedEventId
}

test.describe('Generated release — bulk create shift patterns', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('bulk create stays open after shift patterns load', async ({ page }) => {
    const eventId = await getEventId(page)
    await page.goto(`${BASE_URL}/events/${eventId}/positions-next`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText(/Stations by day/i).first()).toBeVisible({ timeout: 15000 })

    const templates = page.waitForResponse(
      (response) =>
        response.url().includes('/api/shift-templates') &&
        response.request().method() === 'GET'
    )
    await page.getByRole('button', { name: 'Bulk create' }).click()
    const response = await templates
    expect(response.ok()).toBeTruthy()

    await expect(page.getByRole('heading', { name: 'Bulk Create Positions' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'No shifts (positions only)' })).toBeVisible()
    await expect(page.getByText('f.find is not a function')).toHaveCount(0)
    await expect(page.getByText('Error Boundary')).toHaveCount(0)
  })
})

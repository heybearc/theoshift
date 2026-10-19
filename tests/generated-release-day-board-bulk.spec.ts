/**
 * Generated release tests for day-board bulk tools (v4.32.5..HEAD).
 * Covers select-and-bulk-edit of shift overseer/keyman, plus More… parity actions.
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

test.describe('Generated release — day board bulk tools', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('managers can open bulk edit for shift overseer and keyman', async ({ page }) => {
    const eventId = await getEventId(page)
    await page.goto(`${BASE_URL}/events/${eventId}/positions-next`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText(/Stations by day/i).first()).toBeVisible({ timeout: 15000 })

    const selectVisible = page.getByRole('button', { name: /Select visible/i })
    if (await selectVisible.isVisible().catch(() => false)) {
      await selectVisible.click()
      await page.getByRole('button', { name: /Bulk edit/i }).click()
      await expect(page.getByRole('heading', { name: /Bulk edit/i })).toBeVisible()
      await expect(page.getByText(/Shift overseer and keyman/i)).toBeVisible()
      await expect(page.getByText(/Station overseer and keyman/i)).toBeVisible()
      return
    }

    const more = page.getByLabel('More actions')
    const actions = page.getByLabel('Actions')
    const menu = (await more.isVisible().catch(() => false)) ? more : actions
    await expect(menu).toBeVisible()
    await expect(menu.locator('option', { hasText: /Available volunteers/i })).toHaveCount(1)
    await expect(menu.locator('option', { hasText: /Clear all shifts/i })).toHaveCount(1)
  })
})

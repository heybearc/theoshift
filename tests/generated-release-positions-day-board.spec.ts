/**
 * Generated release tests for Positions day board (default Positions tab).
 * Covers BASE_REV v4.32.1..HEAD: day board is default; classic remains available.
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

test.describe('Generated release — Positions day board', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('Positions tab opens the day board by default', async ({ page }) => {
    const eventId = await getEventId(page)
    await page.goto(`${BASE_URL}/events/${eventId}`)
    await page.waitForLoadState('domcontentloaded')

    const positionsTab = page.getByRole('link', { name: /Positions/i }).first()
    await expect(positionsTab).toHaveAttribute(
      'href',
      new RegExp(`/events/${eventId}/positions-next`)
    )
    await positionsTab.click()
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}/positions-next`))
    await expect(page.getByText(/Stations by day/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('link', { name: /Use classic layout/i })).toBeVisible()
  })

  test('classic Positions remains available with a return to the day board', async ({ page }) => {
    const eventId = await getEventId(page)
    await page.goto(`${BASE_URL}/events/${eventId}/positions`)
    await page.waitForLoadState('domcontentloaded')

    const useDayBoard = page.getByRole('link', { name: /Use day board/i })
    await expect(useDayBoard).toBeVisible({ timeout: 15000 })
    await expect(useDayBoard).toHaveAttribute(
      'href',
      new RegExp(`/events/${eventId}/positions-next`)
    )
  })

  test('day board exposes underfilled filter and expand controls when stations exist', async ({
    page,
  }) => {
    const eventId = await getEventId(page)
    await page.goto(`${BASE_URL}/events/${eventId}/positions-next`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/Underfilled only/i).first()).toBeVisible({
      timeout: 15000,
    })

    const emptyState = page.getByText(/No shifts for this day/i)
    const expandAll = page.getByRole('button', { name: /Expand all/i })

    if (await expandAll.isVisible().catch(() => false)) {
      await expandAll.click()
      await expect(page.getByRole('button', { name: /Collapse filled/i })).toBeVisible()
    } else {
      await expect(emptyState.or(page.locator('section')).first()).toBeVisible()
    }
  })

  test('day board Actions or Create control is available to managers', async ({ page }) => {
    const eventId = await getEventId(page)
    await page.goto(`${BASE_URL}/events/${eventId}/positions-next`)
    await page.waitForLoadState('domcontentloaded')

    const actions = page.getByLabel('Actions')
    const createBtn = page.getByRole('button', { name: /^Create$/ })

    const hasActions = await actions.isVisible().catch(() => false)
    const hasCreate = await createBtn.first().isVisible().catch(() => false)

    expect(hasActions || hasCreate).toBeTruthy()
  })
})

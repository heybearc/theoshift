/**
 * Generated release test: selected-row count stays visible, and the
 * volunteers per-page control stays available on a single page.
 */
import { test, expect, type Page } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

type EventRow = { id?: string }

function eventList(body: unknown): EventRow[] {
  if (Array.isArray(body)) return body as EventRow[]
  const record = body as { data?: { events?: EventRow[] }; events?: EventRow[] }
  return record?.data?.events || record?.events || []
}

async function findEventWithRoster(page: Page): Promise<string> {
  const eventsResponse = await page.request.get(`${BASE_URL}/api/events`)
  expect(eventsResponse.ok()).toBeTruthy()
  for (const event of eventList(await eventsResponse.json())) {
    if (!event?.id) continue
    const roster = await page.request.get(`${BASE_URL}/api/events/${event.id}/volunteers`)
    if (!roster.ok()) continue
    const body = await roster.json()
    const volunteers = body?.volunteers
    if (Array.isArray(volunteers) && volunteers.length >= 1) return event.id
  }
  throw new Error('No event with volunteers')
}

test.describe('Generated release — selection count and page size', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('selecting a volunteer shows the count and the page size stays available', async ({ page }) => {
    test.setTimeout(60_000)
    const eventId = await findEventWithRoster(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE_URL}/events/${eventId}/volunteers`)
    await expect(page.getByRole('heading', { name: /Volunteers List/i })).toBeVisible({
      timeout: 15000,
    })

    const perPage = page.locator('#volunteers-per-page')
    await expect(perPage).toBeVisible()

    let rowCheckbox = page.locator('table tbody tr input[type="checkbox"]').first()
    if (!(await rowCheckbox.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /^All\b/ }).first().click()
      rowCheckbox = page.locator('table tbody tr input[type="checkbox"]').first()
    }
    await expect(rowCheckbox).toBeVisible({ timeout: 10000 })
    await rowCheckbox.check()

    await expect(page.getByText('1 volunteer selected')).toBeVisible()
    await expect(page.getByText('1 selected')).toBeVisible()

    await perPage.selectOption('-1')
    await expect(page.getByText(/Showing all/)).toBeVisible()
    await expect(perPage).toBeVisible()
    await expect(perPage).toHaveValue('-1')
  })
})

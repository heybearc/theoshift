/**
 * Generated release test: each shift on the day board has a Select box
 * without opening the station first.
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

async function findEventWithShifts(page: Page): Promise<string> {
  const eventsResponse = await page.request.get(`${BASE_URL}/api/events`)
  expect(eventsResponse.ok()).toBeTruthy()
  const events = eventList(await eventsResponse.json()).filter((event) => event?.id).slice(0, 8)

  for (const event of events) {
    await page.goto(`${BASE_URL}/events/${event.id}/positions-next`)
    const heading = page.getByText(/Stations by day/i).first()
    if (!(await heading.isVisible({ timeout: 8000 }).catch(() => false))) continue

    const shiftBox = page.getByRole('checkbox', { name: /Select shift/i }).first()
    if (await shiftBox.isVisible().catch(() => false)) return event.id!

    const days = page.getByRole('button').filter({ hasText: /Mon|Tue|Wed|Thu|Fri|Sat|Sun|No day/i })
    const dayCount = await days.count()
    for (let i = 0; i < dayCount; i++) {
      await days.nth(i).click()
      if (await shiftBox.isVisible().catch(() => false)) return event.id!
    }
  }

  throw new Error('No day board with a shift Select box')
}

test.describe('Generated release — shift select stays visible', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('a shift Select box is visible on the day board', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    const eventId = await findEventWithShifts(page)
    await page.goto(`${BASE_URL}/events/${eventId}/positions-next`)
    await expect(page.getByText(/Stations by day/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('checkbox', { name: /Select shift/i }).first()).toBeVisible()
  })
})

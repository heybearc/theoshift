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
  for (const event of eventList(await eventsResponse.json())) {
    if (!event?.id) continue
    const positionsResponse = await page.request.get(`${BASE_URL}/api/events/${event.id}/positions`)
    if (!positionsResponse.ok()) continue
    const body = await positionsResponse.json()
    const positions = body?.positions
    if (
      Array.isArray(positions) &&
      positions.some(
        (position: { isActive?: boolean; shifts?: unknown[] }) =>
          position.isActive !== false && (position.shifts?.length || 0) > 0
      )
    ) {
      return event.id
    }
  }
  throw new Error('No event with an active station that has a shift')
}

test.describe('Generated release — shift select stays visible', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('a shift Select box is visible on the day board', async ({ page }) => {
    test.setTimeout(60_000)
    const eventId = await findEventWithShifts(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE_URL}/events/${eventId}/positions-next`)
    await expect(page.getByText(/Stations by day/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('checkbox', { name: /Select shift/i }).first()).toBeVisible()
  })
})

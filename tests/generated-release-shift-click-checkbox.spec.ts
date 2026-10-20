/**
 * Generated release test: shift-click selects a range and the last box stays checked.
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
    if (Array.isArray(volunteers) && volunteers.length >= 3) return event.id
  }
  throw new Error('No event with at least three volunteers')
}

test.describe('Generated release — shift-click checks the last box', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('the last checkbox in a shift-click range shows its check', async ({ page }) => {
    test.setTimeout(60_000)
    const eventId = await findEventWithRoster(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE_URL}/events/${eventId}/volunteers`)
    await expect(page.getByRole('heading', { name: /Volunteers List/i })).toBeVisible({
      timeout: 15000,
    })

    const boxes = page.locator('table tbody tr input[type="checkbox"]')
    await expect(boxes.nth(2)).toBeVisible()
    await boxes.nth(0).click()
    await boxes.nth(2).click({ modifiers: ['Shift'] })

    await expect(boxes.nth(0)).toBeChecked()
    await expect(boxes.nth(1)).toBeChecked()
    await expect(boxes.nth(2)).toBeChecked()
  })
})

/**
 * Generated release test: shift-click keeps the last shift box checked,
 * and Volunteers export follows the filters on screen.
 */
import { readFileSync } from 'fs'
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
  throw new Error('No event with a volunteer')
}

async function findDayWithShiftSelect(page: Page, eventId: string): Promise<void> {
  await page.goto(`${BASE_URL}/events/${eventId}/positions-next`)
  await expect(page.getByText(/Stations by day/i).first()).toBeVisible({ timeout: 15000 })
  const shiftBox = page.getByRole('checkbox', { name: /^Select shift /i })
  if ((await shiftBox.count()) >= 2) return

  const days = page.getByRole('button').filter({ hasText: /Mon|Tue|Wed|Thu|Fri|Sat|Sun|No day/i })
  const dayCount = await days.count()
  for (let i = 0; i < dayCount; i++) {
    await days.nth(i).click()
    if ((await shiftBox.count()) >= 2) return
  }
  throw new Error('No day with two shift Select boxes')
}

test.describe('Generated release — shift-click and filtered export', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('shift-click on the day board checks the last shift box', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    const eventId = await findEventWithRoster(page)
    await findDayWithShiftSelect(page, eventId)

    const boxes = page.getByRole('checkbox', { name: /^Select shift /i })
    await boxes.nth(0).click()
    await boxes.nth(1).click({ modifiers: ['Shift'] })

    await expect(boxes.nth(0)).toBeChecked()
    await expect(boxes.nth(1)).toBeChecked()
  })

  test('export list downloads the filtered volunteers', async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    const eventId = await findEventWithRoster(page)
    await page.goto(`${BASE_URL}/events/${eventId}/volunteers`)
    await expect(page.getByRole('heading', { name: /Volunteers List/i })).toBeVisible({
      timeout: 15000,
    })

    const exportButton = page.getByRole('button', { name: 'Export list' })
    await expect(exportButton).toBeEnabled()
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/volunteers\.csv$/)
    const csv = readFileSync(await download.path(), 'utf8')
    expect(csv).toContain('First name')
    expect(csv).toContain('Availability')

    await page.getByPlaceholder('Search by name, email, phone, congregation...').fill('zz-no-such-volunteer')
    await expect(exportButton).toBeDisabled()
  })
})

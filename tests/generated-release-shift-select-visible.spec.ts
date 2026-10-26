/**
 * Collapsed stations stay one row. Shift Select appears after the station is opened.
 */
import { test, expect, type Page, type Locator } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

type EventRow = { id?: string }

function eventList(body: unknown): EventRow[] {
  if (Array.isArray(body)) return body as EventRow[]
  const record = body as { data?: { events?: EventRow[] }; events?: EventRow[] }
  return record?.data?.events || record?.events || []
}

async function openDayBoardWithStations(page: Page): Promise<void> {
  const eventsResponse = await page.request.get(`${BASE_URL}/api/events`)
  expect(eventsResponse.ok()).toBeTruthy()
  const events = eventList(await eventsResponse.json()).filter((event) => event?.id).slice(0, 8)

  for (const event of events) {
    await page.goto(`${BASE_URL}/events/${event.id}/positions-next`)
    const heading = page.getByText(/Stations by day/i).first()
    if (!(await heading.isVisible({ timeout: 8000 }).catch(() => false))) continue
    const station = page.locator('section').filter({
      has: page.getByRole('checkbox', { name: /Select station /i })
    }).first()
    if (await station.isVisible().catch(() => false)) return
  }

  throw new Error('No day board with a station checkbox')
}

async function collapsedStation(page: Page): Promise<{ section: Locator; header: Locator }> {
  const sections = page.locator('section').filter({
    has: page.getByRole('checkbox', { name: /Select station /i })
  })
  const count = await sections.count()
  for (let i = 0; i < count; i++) {
    const section = sections.nth(i)
    if (await section.getByText('No shifts this day').count()) continue
    const header = section.locator('button[aria-expanded]').first()
    if ((await header.getAttribute('aria-expanded')) === 'false') {
      return { section, header }
    }
  }
  for (let i = 0; i < count; i++) {
    const section = sections.nth(i)
    if (await section.getByText('No shifts this day').count()) continue
    const header = section.locator('button[aria-expanded]').first()
    await header.click()
    await expect(header).toHaveAttribute('aria-expanded', 'false')
    return { section, header }
  }
  throw new Error('No station with shifts on this day')
}

test.describe('Day board collapsed stations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('a collapsed station hides its shifts until opened', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    await openDayBoardWithStations(page)

    const { section, header } = await collapsedStation(page)
    const checkbox = section.getByRole('checkbox', { name: /Select station /i })
    await expect(checkbox).toBeVisible()
    const checkboxBox = await checkbox.boundingBox()
    const headerBox = await header.boundingBox()
    expect(checkboxBox && headerBox && checkboxBox.x < headerBox.x).toBeTruthy()
    await expect(section.getByRole('checkbox', { name: /^Select shift /i })).toHaveCount(0)
    await expect(section.getByRole('checkbox', { name: /Select shifts at/i })).toHaveCount(0)

    await header.click()
    await expect(header).toHaveAttribute('aria-expanded', 'true')
    await expect(section.getByRole('checkbox', { name: /^Select shift /i }).first()).toBeVisible()
  })

  test('the station box can set overseer and keyman for this day', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    await openDayBoardWithStations(page)

    const { section } = await collapsedStation(page)
    await section.getByRole('checkbox', { name: /Select station /i }).check()
    await page.getByRole('button', { name: 'Set overseer/keyman' }).click()
    await expect(page.getByRole('heading', { name: /Bulk edit/i })).toBeVisible()
    await expect(page.getByText(/Shift overseer and keyman/i)).toBeVisible()
  })
})

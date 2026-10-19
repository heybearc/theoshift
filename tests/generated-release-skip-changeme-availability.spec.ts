/**
 * Generated release test: availability email skips addresses containing changeme.
 * Selects only that person, so the send is refused before any mail goes out.
 */
import { test, expect, type Page } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

type RosterVolunteer = { id?: string; email?: string | null }
type EventRow = { id?: string }

function eventList(body: unknown): EventRow[] {
  if (Array.isArray(body)) return body as EventRow[]
  const record = body as { data?: { events?: EventRow[] }; events?: EventRow[] }
  return record?.data?.events || record?.events || []
}

async function findChangemeVolunteer(page: Page): Promise<{ eventId: string; volunteerId: string }> {
  const eventsResponse = await page.request.get(`${BASE_URL}/api/events`)
  expect(eventsResponse.ok()).toBeTruthy()
  const events = eventList(await eventsResponse.json())

  for (const event of events) {
    if (!event?.id) continue
    const roster = await page.request.get(`${BASE_URL}/api/events/${event.id}/volunteers`)
    if (!roster.ok()) continue
    const payload = await roster.json()
    const volunteers: RosterVolunteer[] = payload?.volunteers || payload?.data || []
    const match = volunteers.find((volunteer) =>
      (volunteer.email || '').toLowerCase().includes('changeme')
    )
    if (match?.id) {
      return { eventId: event.id, volunteerId: match.id }
    }
  }

  throw new Error('No active roster address containing changeme')
}

test.describe('Generated release — skip changeme availability emails', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('refuses a send that only includes a changeme address', async ({ page }) => {
    test.setTimeout(60_000)
    const { eventId, volunteerId } = await findChangemeVolunteer(page)

    const skipped = await page.request.post(
      `${BASE_URL}/api/events/${eventId}/availability-request`,
      { data: { volunteerIds: [volunteerId] } }
    )
    expect(skipped.status()).toBe(400)
    const body = await skipped.json()
    expect(String(body.error || '')).toMatch(/changeme/i)
    expect(body.skippedPlaceholder).toBeGreaterThan(0)

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE_URL}/events/${eventId}/volunteers`)
    await page.getByPlaceholder('Search by name, email, phone, congregation...').fill('changeme')

    const row = page.locator('table tbody tr').filter({ hasText: /changeme/i }).first()
    await expect(row).toBeVisible({ timeout: 15000 })

    let posted = false
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/availability-request')) {
        posted = true
      }
    })

    await row.locator('input[type="checkbox"]').check()
    await page.getByRole('button', { name: 'Request Availability' }).click()
    await page.getByRole('button', { name: /Send Requests/ }).click()
    await expect(page.getByText(/Addresses containing “changeme” are skipped/)).toBeVisible()
    expect(posted).toBe(false)
  })
})

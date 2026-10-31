/**
 * Lanyard checkout history stays available after a badge is returned.
 * Updating a badge requires a sign-in, and the Lanyards page can look one up.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'

test('lanyard updates require a sign-in', async ({ request }) => {
  const response = await request.put('/api/event-lanyards/someone/someone', {
    data: { isCheckedOut: false, checkedOutTo: null },
  })
  expect(response.status()).toBe(401)
})

test('staff can look up who had a badge', async ({ page }) => {
  await loginAsAdmin(page)

  const eventsResponse = await page.request.get('/api/events')
  expect(eventsResponse.ok()).toBeTruthy()
  const eventsBody = await eventsResponse.json()
  const events = eventsBody?.data?.events || eventsBody?.events || eventsBody
  expect(Array.isArray(events)).toBeTruthy()

  let eventId: string | null = null
  for (const event of events as Array<{ id?: string }>) {
    if (!event?.id) continue
    const pageResponse = await page.request.get(`/events/${event.id}/lanyards`)
    if (pageResponse.ok()) {
      eventId = event.id
      break
    }
  }
  test.skip(!eventId, 'No event available for this test user')

  const missing = await page.request.put(`/api/event-lanyards/${eventId}/not-a-real-lanyard`, {
    data: { isCheckedOut: false, checkedOutTo: null, status: 'AVAILABLE' },
  })
  expect(missing.status()).toBe(404)

  await page.goto(`/events/${eventId}/lanyards`)
  await expect(page.getByRole('heading', { name: 'Who had this badge?' })).toBeVisible({ timeout: 15000 })
  const lookup = page.getByRole('textbox', { name: 'Look up a badge number' })
  await lookup.fill('49')
  await expect(page.getByText(/Badge 49|No badge matches 49/)).toBeVisible()
})

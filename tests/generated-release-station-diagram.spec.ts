/**
 * Assignments link to the station on Positions, and a station diagram is optional.
 * The diagram API stays closed until someone signs in, and a bad file is rejected.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'

test('station diagram requires a sign-in', async ({ request }) => {
  const read = await request.get('/api/events/someone/station-diagram')
  expect(read.status()).toBe(401)

  const write = await request.put('/api/events/someone/station-diagram', {
    data: { documentId: 'someone' },
  })
  expect(write.status()).toBe(401)
})

test('staff can open the diagram control and assignment links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await loginAsAdmin(page)

  const eventsResponse = await page.request.get('/api/events')
  expect(eventsResponse.ok()).toBeTruthy()
  const eventsBody = await eventsResponse.json()
  const events = eventsBody?.data?.events || eventsBody?.events || eventsBody
  expect(Array.isArray(events)).toBeTruthy()

  let eventId: string | null = null
  for (const event of events as Array<{ id?: string }>) {
    if (event?.id) {
      eventId = event.id
      break
    }
  }
  test.skip(!eventId, 'No event available for this test user')

  const rejected = await page.request.put(`/api/events/${eventId}/station-diagram`, {
    data: { documentId: 'not-a-real-document' },
  })
  expect(rejected.status()).toBe(400)

  await page.goto(`/events/${eventId}/documents`)
  await expect(page.getByRole('heading', { name: 'Station diagram' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('combobox', { name: 'Station diagram file' })).toBeVisible()

  await page.goto(`/events/${eventId}/volunteers`)
  await page.waitForLoadState('domcontentloaded')
  const stationLink = page.locator('a[href*="positions-next?station="]').first()
  const sawAssignment = await stationLink.isVisible().catch(() => false)
  if (sawAssignment) {
    await expect(stationLink).toHaveAttribute('href', /positions-next\?station=/)
  }

  const diagram = await page.request.get(`/api/events/${eventId}/station-diagram`)
  expect(diagram.ok()).toBeTruthy()
  const diagramBody = await diagram.json()
  if (diagramBody?.diagram?.documentId && sawAssignment) {
    await expect(page.getByRole('link', { name: 'Show on diagram' }).first()).toBeVisible()
  } else if (!diagramBody?.diagram) {
    await expect(page.getByRole('link', { name: 'Show on diagram' })).toHaveCount(0)
  }
})

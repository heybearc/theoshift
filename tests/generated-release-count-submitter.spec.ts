/**
 * Group counts record who submitted them, and staff open one keyman or overseer's people from Volunteers.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'

test('a group count cannot be submitted without a sign-in', async ({ request }) => {
  const response = await request.post('/api/events/someone/count-sessions/session/counts', {
    data: { groupId: '00000000-0000-4000-8000-000000000001', attendeeCount: 1 },
  })
  expect(response.status()).toBe(401)
})

test('staff can open the roster view that lists one keyman or overseer', async ({ page }) => {
  await loginAsAdmin(page)

  const eventsResponse = await page.request.get('/api/events')
  expect(eventsResponse.ok()).toBeTruthy()
  const eventsBody = await eventsResponse.json()
  const events = eventsBody?.data?.events || eventsBody?.events || eventsBody
  expect(Array.isArray(events)).toBeTruthy()
  const eventId = (events as Array<{ id?: string }>).find((event) => event?.id)?.id
  test.skip(!eventId, 'No event available for this test user')

  await page.goto(`/events/${eventId}/volunteers`)
  await page.waitForLoadState('domcontentloaded')

  const rosterView = page.getByLabel("View one keyman or overseer's people")
  await expect(rosterView).toBeVisible({ timeout: 15000 })
  await expect(rosterView.locator('option', { hasText: 'Full roster' })).toHaveCount(1)
})

test('a count session reports who submitted each group', async ({ page }) => {
  await loginAsAdmin(page)

  const eventsResponse = await page.request.get('/api/events')
  expect(eventsResponse.ok()).toBeTruthy()
  const eventsBody = await eventsResponse.json()
  const events = eventsBody?.data?.events || eventsBody?.events || eventsBody
  expect(Array.isArray(events)).toBeTruthy()

  let sessionUrl: string | null = null
  for (const event of events as Array<{ id?: string }>) {
    if (!event?.id) continue
    const sessionsResponse = await page.request.get(`/api/events/${event.id}/count-sessions`)
    if (!sessionsResponse.ok()) continue
    const sessionsBody = await sessionsResponse.json()
    const sessions = sessionsBody?.data || sessionsBody?.sessions || sessionsBody
    const sessionId = Array.isArray(sessions) ? sessions.find((session) => session?.id)?.id : null
    if (sessionId) {
      sessionUrl = `/api/events/${event.id}/count-sessions/${sessionId}`
      break
    }
  }
  test.skip(!sessionUrl, 'No count session available for this test user')

  const sessionResponse = await page.request.get(sessionUrl!)
  expect(sessionResponse.ok()).toBeTruthy()
  const sessionBody = await sessionResponse.json()
  const groups = sessionBody?.data?.groupSubmissionSummaries
  expect(Array.isArray(groups)).toBeTruthy()
  for (const group of groups as Array<{ submittedBy?: string | null; attendeeCount?: number | null; groupName?: string }>) {
    expect(group).toHaveProperty('submittedBy')
    if (group.submittedBy != null) {
      expect(group.submittedBy.trim().length).toBeGreaterThan(0)
    }
  }
})

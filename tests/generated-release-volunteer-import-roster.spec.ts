/**
 * Generated release test for bulk volunteer import.
 * An imported person must show up on the event roster, not only in the import result.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'

test.describe('Generated release — bulk import lands on the volunteer roster', () => {
  test('imported volunteer is returned by the roster API', async ({ page }) => {
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

    const email = `release-gate-roster-${Date.now()}@example.com`
    const importResponse = await page.request.put(`/api/events/${eventId}/volunteers`, {
      data: {
        attendants: [
          {
            firstName: 'Release',
            lastName: 'Gate',
            email,
            phone: '2165550199',
            congregation: 'Release Gate',
            formsOfService: 'Elder',
            isActive: true,
          },
        ],
      },
    })
    expect(importResponse.ok()).toBeTruthy()
    const importBody = await importResponse.json()
    expect(importBody.success).toBeTruthy()
    expect(importBody.data?.errors || []).toEqual([])
    expect((importBody.data?.created || 0) + (importBody.data?.updated || 0)).toBeGreaterThan(0)

    const listResponse = await page.request.get(`/api/events/${eventId}/volunteers`)
    expect(listResponse.ok()).toBeTruthy()
    const listBody = await listResponse.json()
    const emails = (listBody.volunteers || []).map((volunteer: { email?: string }) => volunteer.email)
    expect(emails).toContain(email)
  })
})

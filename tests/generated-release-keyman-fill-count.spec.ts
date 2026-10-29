/**
 * Generated release test: a position keyman shows on the station card,
 * and an overseer does not count toward the shift fill.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

type Volunteer = { id: string; firstName: string; lastName: string; isKeyman?: boolean; isOverseer?: boolean }
type EventRow = { id?: string; startDate?: string | null }

function eventList(body: unknown): EventRow[] {
  if (Array.isArray(body)) return body as EventRow[]
  const record = body as { data?: { events?: EventRow[] }; events?: EventRow[] }
  return record?.data?.events || record?.events || []
}

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

async function findEvent(request: APIRequestContext): Promise<{
  eventId: string
  day: string
  keyman: Volunteer
  overseers: Volunteer[]
}> {
  const eventsResponse = await request.get(`${BASE_URL}/api/events`)
  expect(eventsResponse.ok()).toBeTruthy()
  const events = eventList(await eventsResponse.json()).filter((event) => event.id)

  for (const event of events) {
    const day = dateKey(event.startDate)
    if (!day) continue
    const volunteersResponse = await request.get(`${BASE_URL}/api/events/${event.id}/volunteers`)
    if (!volunteersResponse.ok()) continue
    const volunteers = ((await volunteersResponse.json())?.volunteers || []) as Volunteer[]
    const keyman = volunteers.find((person) => person.isKeyman)
    const overseers = volunteers.filter((person) => person.isOverseer)
    if (!keyman || overseers.length === 0) continue
    return { eventId: event.id as string, day, keyman, overseers }
  }

  throw new Error('No event with a keyman and an overseer')
}

test.describe('Generated release — keyman on the card and shift fill', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('the station shows its keyman and an overseer leaves the shift open', async ({ page }) => {
    test.setTimeout(90_000)
    const fixture = await findEvent(page.request)
    const positionNumber = 10000 + (Date.now() % 50000)
    const positionName = `Gate keyman fill ${positionNumber}`
    let positionId: string | null = null
    let createdAssignmentId: string | null = null

    try {
      const created = await page.request.post(`${BASE_URL}/api/events/${fixture.eventId}/positions`, {
        data: {
          positionNumber,
          name: positionName,
        },
      })
      expect(created.ok()).toBeTruthy()
      positionId = (await created.json())?.position?.id || null
      expect(positionId).toBeTruthy()

      const shift = await page.request.post(
        `${BASE_URL}/api/events/${fixture.eventId}/positions/${positionId}/shifts`,
        {
          data: {
            name: 'Gate shift',
            startTime: '03:15',
            endTime: '03:45',
            isAllDay: false,
            volunteersNeeded: 1,
            shiftDate: fixture.day,
          },
        }
      )
      expect(shift.ok()).toBeTruthy()
      const shiftId = (await shift.json())?.data?.id as string
      expect(shiftId).toBeTruthy()

      const oversight = await page.request.post(
        `${BASE_URL}/api/events/${fixture.eventId}/positions/${positionId}/position-oversight`,
        { data: { keymanId: fixture.keyman.id } }
      )
      expect(oversight.ok()).toBeTruthy()

      for (const overseer of fixture.overseers) {
        const assignment = await page.request.post(
          `${BASE_URL}/api/events/${fixture.eventId}/assignments`,
          {
            data: {
              positionId,
              volunteerId: overseer.id,
              shiftId,
              role: 'OVERSEER',
            },
          }
        )
        if (!assignment.ok()) continue
        createdAssignmentId = (await assignment.json())?.data?.id || null
        break
      }
      expect(createdAssignmentId).toBeTruthy()

      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${BASE_URL}/events/${fixture.eventId}/positions-next`)
      await expect(page.getByText(/Stations by day/i).first()).toBeVisible({ timeout: 15000 })

      const header = page.getByRole('button', { name: new RegExp(`#${positionNumber}\\s+${positionName}`) }).first()
      await expect(header).toBeVisible({ timeout: 15000 })
      await expect(header).toContainText(
        `Keyman ${fixture.keyman.firstName} ${fixture.keyman.lastName}`
      )
      await expect(header).toContainText('0/1 filled')

      if ((await header.getAttribute('aria-expanded')) !== 'true') {
        await header.click()
      }
      const section = page.locator('section').filter({ has: header })
      await expect(section.getByText('Overseer ·').first()).toBeVisible()
      await expect(section.getByText(/^0\/1/).first()).toBeVisible()
    } finally {
      if (positionId) {
        await page.request.delete(
          `${BASE_URL}/api/events/${fixture.eventId}/positions/${positionId}`
        )
      }
    }
  })
})

/**
 * Generated release test: a position keyman shows on the station card,
 * and an overseer does not count toward the shift fill.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

type Person = { id: string; firstName: string; lastName: string }
type Shift = {
  id: string
  name?: string
  volunteersNeeded?: number | null
  shiftDate?: string | null
}
type Assignment = {
  id: string
  role?: string | null
  shift?: { id?: string } | null
  volunteer?: { id?: string } | null
}
type Position = {
  id: string
  name: string
  positionNumber: number
  isActive: boolean
  shifts?: Shift[]
  assignments?: Assignment[]
  oversight?: Array<{ overseer?: Person | null; keyman?: Person | null }>
}
type Volunteer = Person & { isKeyman?: boolean; isOverseer?: boolean }
type EventRow = { id?: string; startDate?: string | null }

function eventList(body: unknown): EventRow[] {
  if (Array.isArray(body)) return body as EventRow[]
  const record = body as { data?: { events?: EventRow[] }; events?: EventRow[] }
  return record?.data?.events || record?.events || []
}

function dateKey(value: string | null | undefined): string {
  if (!value) return 'undated'
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : 'undated'
}

function needed(shift: Shift): number {
  const n = shift.volunteersNeeded
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function isShiftVolunteer(assignment: Assignment): boolean {
  const role = (assignment.role || '').toUpperCase()
  return role !== 'OVERSEER' && role !== 'KEYMAN'
}

async function findFixture(request: APIRequestContext): Promise<{
  eventId: string
  day: string
  position: Position
  shift: Shift
  keyman: Volunteer
  overseers: Volunteer[]
  previousOverseerId: string | null
  previousKeymanId: string | null
}> {
  const eventsResponse = await request.get(`${BASE_URL}/api/events`)
  expect(eventsResponse.ok()).toBeTruthy()
  const events = eventList(await eventsResponse.json()).filter((event) => event.id).slice(0, 12)

  for (const event of events) {
    const eventId = event.id as string
    const volunteersResponse = await request.get(`${BASE_URL}/api/events/${eventId}/volunteers`)
    if (!volunteersResponse.ok()) continue
    const volunteers = ((await volunteersResponse.json())?.volunteers || []) as Volunteer[]
    const keyman = volunteers.find((person) => person.isKeyman)
    const overseers = volunteers.filter((person) => person.isOverseer)
    if (!keyman || overseers.length === 0) continue

    const positionsResponse = await request.get(`${BASE_URL}/api/events/${eventId}/positions`)
    if (!positionsResponse.ok()) continue
    const positions = ((await positionsResponse.json())?.positions || []) as Position[]
    const defaultDay = dateKey(event.startDate)

    for (const position of positions) {
      if (!position.isActive) continue
      const dayShifts = (position.shifts || []).filter(
        (shift) => dateKey(shift.shiftDate) === defaultDay
      )
      if (dayShifts.length !== 1) continue
      const shift = dayShifts[0]
      if (needed(shift) !== 1) continue
      const onShift = (position.assignments || []).filter((a) => a.shift?.id === shift.id)
      if (onShift.some(isShiftVolunteer)) continue
      if (onShift.some((a) => (a.role || '').toUpperCase() === 'OVERSEER')) continue
      const current = position.oversight?.[0]
      return {
        eventId,
        day: defaultDay,
        position,
        shift,
        keyman,
        overseers,
        previousOverseerId: current?.overseer?.id || null,
        previousKeymanId: current?.keyman?.id || null,
      }
    }
  }

  throw new Error('No one-slot shift without a volunteer or shift overseer')
}

test.describe('Generated release — keyman on the card and shift fill', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('the station shows its keyman and an overseer leaves the shift open', async ({ page }) => {
    test.setTimeout(90_000)
    const fixture = await findFixture(page.request)
    let createdAssignmentId: string | null = null

    try {
      const oversight = await page.request.post(
        `${BASE_URL}/api/events/${fixture.eventId}/positions/${fixture.position.id}/position-oversight`,
        {
          data: {
            overseerId: fixture.previousOverseerId || undefined,
            keymanId: fixture.keyman.id,
          },
        }
      )
      expect(oversight.ok()).toBeTruthy()

      for (const overseer of fixture.overseers) {
        const assignment = await page.request.post(
          `${BASE_URL}/api/events/${fixture.eventId}/assignments`,
          {
            data: {
              positionId: fixture.position.id,
              volunteerId: overseer.id,
              shiftId: fixture.shift.id,
              role: 'OVERSEER',
            },
          }
        )
        if (!assignment.ok()) continue
        const body = await assignment.json()
        createdAssignmentId = body?.data?.id || null
        break
      }
      expect(createdAssignmentId).toBeTruthy()

      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${BASE_URL}/events/${fixture.eventId}/positions-next`)
      await expect(page.getByText(/Stations by day/i).first()).toBeVisible({ timeout: 15000 })

      const stationName = fixture.position.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const header = page
        .getByRole('button', {
          name: new RegExp(`#${fixture.position.positionNumber}\\s+${stationName}`),
        })
        .first()
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
      await expect(section.getByText('0/1').first()).toBeVisible()
    } finally {
      if (createdAssignmentId) {
        await page.request.delete(
          `${BASE_URL}/api/events/${fixture.eventId}/assignments/${createdAssignmentId}`
        )
      }
      await page.request.post(
        `${BASE_URL}/api/events/${fixture.eventId}/positions/${fixture.position.id}/position-oversight`,
        {
          data: {
            overseerId: fixture.previousOverseerId || undefined,
            keymanId: fixture.previousKeymanId || undefined,
          },
        }
      )
    }
  })
})

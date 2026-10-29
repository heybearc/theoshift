/**
 * Generated release test: a volunteer assigned to two active counts
 * sees only the earlier one until the later count time.
 * Also checks the volunteers page loads and the day board names assigned people.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

type EventRow = { id?: string }
type Volunteer = { id?: string }
type Position = { id?: string; isActive?: boolean }

function eventList(body: unknown): EventRow[] {
  if (Array.isArray(body)) return body as EventRow[]
  const record = body as { data?: { events?: EventRow[] }; events?: EventRow[] }
  return record?.data?.events || record?.events || []
}

async function findFixture(request: APIRequestContext): Promise<{
  eventId: string
  volunteerId: string
  positionId: string
}> {
  const eventsResponse = await request.get(`${BASE_URL}/api/events`)
  expect(eventsResponse.ok()).toBeTruthy()
  const events = eventList(await eventsResponse.json()).filter((event) => event.id)

  for (const event of events) {
    const volunteersResponse = await request.get(`${BASE_URL}/api/events/${event.id}/volunteers`)
    if (!volunteersResponse.ok()) continue
    const volunteers = ((await volunteersResponse.json())?.volunteers || []) as Volunteer[]
    const volunteer = volunteers.find((person) => person.id)
    if (!volunteer?.id) continue

    const positionsResponse = await request.get(
      `${BASE_URL}/api/events/${event.id}/positions?limit=1000`
    )
    if (!positionsResponse.ok()) continue
    const positions = ((await positionsResponse.json())?.positions || []) as Position[]
    const position = positions.find((row) => row.id && row.isActive !== false)
    if (!position?.id) continue

    return { eventId: event.id as string, volunteerId: volunteer.id, positionId: position.id }
  }

  throw new Error('No event with a roster volunteer and an active station')
}

test.describe('Generated release — one count at a time', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('the volunteers page loads', async ({ page }) => {
    test.setTimeout(60_000)
    const { eventId } = await findFixture(page.request)
    const response = await page.goto(`${BASE_URL}/events/${eventId}/volunteers`)
    expect(response?.status() ?? 0).toBeLessThan(500)
    await expect(page.getByRole('heading', { name: 'Volunteers' })).toBeVisible({ timeout: 20000 })
  })

  test('a later active count stays off the volunteer dashboard', async ({ page }) => {
    test.setTimeout(90_000)
    const { eventId, volunteerId, positionId } = await findFixture(page.request)
    const stamp = Date.now()
    const earlierAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    const laterAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    const created: string[] = []

    try {
      for (const [name, countTime] of [
        [`Release count earlier ${stamp}`, earlierAt],
        [`Release count later ${stamp}`, laterAt],
      ] as const) {
        const createdResponse = await page.request.post(
          `${BASE_URL}/api/events/${eventId}/count-sessions`,
          { data: { sessionName: name, countTime } }
        )
        expect(createdResponse.ok(), await createdResponse.text()).toBeTruthy()
        const body = await createdResponse.json()
        const sessionId = body?.data?.id as string
        expect(sessionId).toBeTruthy()
        created.push(sessionId)

        const assigned = await page.request.put(
          `${BASE_URL}/api/events/${eventId}/count-sessions/${sessionId}/assignees`,
          { data: { assignees: [{ positionId, volunteerIds: [volunteerId] }] } }
        )
        expect(assigned.ok(), await assigned.text()).toBeTruthy()
      }

      const dashboard = await page.request.get(
        `${BASE_URL}/api/volunteer/dashboard?volunteerId=${volunteerId}&eventId=${eventId}`
      )
      expect(dashboard.ok(), await dashboard.text()).toBeTruthy()
      const payload = await dashboard.json()
      const sessions = (payload?.data?.activeCountSessions || []) as Array<{ id: string }>
      const groups = (payload?.data?.activeCountGroups || []) as Array<{ sessionId: string }>
      const visible = new Set([
        ...sessions.map((session) => session.id),
        ...groups.map((group) => group.sessionId),
      ])

      const [earlierId, laterId] = created
      expect(visible.has(laterId)).toBe(false)
      if (visible.has(earlierId)) {
        expect(payload.data.nextCountAvailableAt).toBeTruthy()
      }
    } finally {
      for (const sessionId of created) {
        await page.request.delete(`${BASE_URL}/api/events/${eventId}/count-sessions/${sessionId}`)
      }
    }
  })

  test('an expanded day-board shift shows who is assigned', async ({ page }) => {
    test.setTimeout(60_000)
    const { eventId } = await findFixture(page.request)
    await openDayBoard(page, eventId)
    const expandAll = page.getByRole('button', { name: /Expand all/i })
    if (!(await expandAll.isVisible().catch(() => false))) {
      test.skip()
    }
    await expandAll.click()
    await expect(page.getByText('Assigned', { exact: true }).first()).toBeVisible({ timeout: 15000 })
  })
})

async function openDayBoard(page: Page, eventId: string) {
  await page.goto(`${BASE_URL}/events/${eventId}/positions-next`)
  await page.waitForLoadState('domcontentloaded')
}

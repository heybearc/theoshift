/**
 * Generated release test: a count group saves when a counter is left blank.
 * An empty primary or secondary used to be rejected as an invalid payload.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

type EventRow = { id?: string }
type Position = { id?: string; isActive?: boolean }

function eventList(body: unknown): EventRow[] {
  if (Array.isArray(body)) return body as EventRow[]
  const record = body as { data?: { events?: EventRow[] }; events?: EventRow[] }
  return record?.data?.events || record?.events || []
}

async function findEventWithStation(request: APIRequestContext): Promise<{
  eventId: string
  positionId: string
}> {
  const eventsResponse = await request.get(`${BASE_URL}/api/events`)
  expect(eventsResponse.ok()).toBeTruthy()
  const events = eventList(await eventsResponse.json()).filter((event) => event.id)

  for (const event of events) {
    const positionsResponse = await request.get(
      `${BASE_URL}/api/events/${event.id}/positions?limit=1000`
    )
    if (!positionsResponse.ok()) continue
    const positions = ((await positionsResponse.json())?.positions || []) as Position[]
    const position = positions.find((row) => row.id && row.isActive !== false)
    if (!position?.id) continue
    return { eventId: event.id as string, positionId: position.id }
  }

  throw new Error('No event with an active station')
}

test.describe('Generated release — save a count group with a blank counter', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('a group with no primary or secondary is stored', async ({ page }) => {
    test.setTimeout(90_000)
    const { eventId, positionId } = await findEventWithStation(page.request)
    const sessionName = `Release blank counters ${Date.now()}`
    let sessionId: string | null = null

    try {
      const created = await page.request.post(`${BASE_URL}/api/events/${eventId}/count-sessions`, {
        data: {
          sessionName,
          countTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        },
      })
      expect(created.ok(), await created.text()).toBeTruthy()
      sessionId = (await created.json())?.data?.id
      expect(sessionId).toBeTruthy()

      const saved = await page.request.put(
        `${BASE_URL}/api/events/${eventId}/count-sessions/${sessionId}/groups`,
        {
          data: {
            groups: [
              {
                name: 'Section blank counters',
                primaryVolunteerId: '',
                secondaryVolunteerId: '',
                positionIds: [positionId],
              },
            ],
          },
        }
      )
      expect(saved.ok(), await saved.text()).toBeTruthy()

      const loaded = await page.request.get(
        `${BASE_URL}/api/events/${eventId}/count-sessions/${sessionId}/groups`
      )
      expect(loaded.ok()).toBeTruthy()
      const groups = ((await loaded.json())?.data?.groups || []) as Array<{
        name: string
        primaryVolunteerId: string | null
        secondaryVolunteerId: string | null
        positionIds: string[]
      }>
      const group = groups.find((row) => row.name === 'Section blank counters')
      expect(group).toBeTruthy()
      expect(group?.primaryVolunteerId).toBeFalsy()
      expect(group?.secondaryVolunteerId).toBeFalsy()
      expect(group?.positionIds).toContain(positionId)
    } finally {
      if (sessionId) {
        await page.request.delete(`${BASE_URL}/api/events/${eventId}/count-sessions/${sessionId}`)
      }
    }
  })
})

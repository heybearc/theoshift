/**
 * Generated release test: the phone app reads count, contact, and diagram
 * fields from the volunteer dashboard, and the count API accepts only a real
 * sign-in. A bad phone token cannot submit a count.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { loginAsAdmin } from './login-helper'

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
  const eventsResponse = await request.get('/api/events')
  expect(eventsResponse.ok()).toBeTruthy()
  const events = eventList(await eventsResponse.json()).filter((event) => event.id)

  for (const event of events) {
    const volunteersResponse = await request.get(`/api/events/${event.id}/volunteers`)
    if (!volunteersResponse.ok()) continue
    const volunteers = ((await volunteersResponse.json())?.volunteers || []) as Volunteer[]
    const volunteer = volunteers.find((person) => person.id)
    if (!volunteer?.id) continue

    const positionsResponse = await request.get(`/api/events/${event.id}/positions?limit=1000`)
    if (!positionsResponse.ok()) continue
    const positions = ((await positionsResponse.json())?.positions || []) as Position[]
    const position = positions.find((row) => row.id && row.isActive !== false)
    if (!position?.id) continue

    return { eventId: event.id as string, volunteerId: volunteer.id, positionId: position.id }
  }

  throw new Error('No event with a roster volunteer and an active station')
}

test('a phone count submit rejects anonymous callers and a bad token', async ({ request }) => {
  const path = '/api/events/someone/count-sessions/session/counts'
  const body = { positionId: '00000000-0000-4000-8000-000000000001', attendeeCount: 3 }

  const anonymous = await request.post(path, { data: body })
  expect(anonymous.status()).toBe(401)

  const badToken = await request.post(path, {
    data: body,
    headers: { Authorization: 'Bearer not-a-real-token' },
  })
  expect(badToken.status()).toBe(401)

  const pinned = await request.get('/api/events/someone/chat/pinned-announcement', {
    headers: { Authorization: 'Bearer not-a-real-token' },
  })
  expect(pinned.status()).toBe(401)
})

test('a submitted station count is on the volunteer dashboard the phone reads', async ({ page }) => {
  test.setTimeout(90_000)
  await loginAsAdmin(page)
  const { eventId, volunteerId, positionId } = await findFixture(page.request)
  const sessionName = `Phone count ${Date.now()}`
  let sessionId = ''

  try {
    const created = await page.request.post(`/api/events/${eventId}/count-sessions`, {
      data: { sessionName, countTime: new Date().toISOString() },
    })
    expect(created.ok(), await created.text()).toBeTruthy()
    sessionId = (await created.json())?.data?.id
    expect(sessionId).toBeTruthy()

    const assigned = await page.request.put(
      `/api/events/${eventId}/count-sessions/${sessionId}/assignees`,
      { data: { assignees: [{ positionId, volunteerIds: [volunteerId] }] } }
    )
    expect(assigned.ok(), await assigned.text()).toBeTruthy()

    const submitted = await page.request.post(`/api/events/${eventId}/count-sessions/${sessionId}/counts`, {
      data: { positionId, attendeeCount: 12, notes: 'release gate' },
    })
    expect(submitted.ok(), await submitted.text()).toBeTruthy()

    const stored = await page.request.get(`/api/events/${eventId}/count-sessions/${sessionId}/counts`)
    expect(stored.ok()).toBeTruthy()
    const rows = ((await stored.json())?.data || []) as Array<{ positionId?: string; attendeeCount?: number }>
    expect(rows.some((row) => row.positionId === positionId && row.attendeeCount === 12)).toBe(true)

    const dashboard = await page.request.get(
      `/api/volunteer/dashboard?volunteerId=${volunteerId}&eventId=${eventId}`
    )
    expect(dashboard.ok(), await dashboard.text()).toBeTruthy()
    const payload = (await dashboard.json())?.data
    expect(Array.isArray(payload.oversightContacts)).toBe(true)
    expect(payload).toHaveProperty('stationDiagram')
    expect(typeof payload.canReviseSubmittedCounts).toBe('boolean')

    const session = (payload.activeCountSessions || []).find(
      (item: { id?: string }) => item.id === sessionId
    ) as { stations?: Array<{ positionId?: string; hasSubmitted?: boolean; existingCount?: number | null }> } | undefined
    if (session) {
      const station = session.stations?.find((item) => item.positionId === positionId)
      expect(station?.hasSubmitted).toBe(true)
      expect(station?.existingCount).toBe(12)
    }
  } finally {
    if (sessionId) {
      await page.request.delete(`/api/events/${eventId}/count-sessions/${sessionId}`)
    }
  }
})

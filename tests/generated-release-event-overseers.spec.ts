/**
 * Generated release test: Positions oversight lists only this event's overseers and keymen.
 */
import { test, expect, type Page } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl } from './helpers/test-config'

const BASE_URL = getBaseUrl()

type EventRow = { id?: string }
type RosterVolunteer = {
  firstName?: string
  lastName?: string
  isOverseer?: boolean
  isKeyman?: boolean
}

function eventList(body: unknown): EventRow[] {
  if (Array.isArray(body)) return body as EventRow[]
  const record = body as { data?: { events?: EventRow[] }; events?: EventRow[] }
  return record?.data?.events || record?.events || []
}

function fullName(person: RosterVolunteer): string {
  return `${person.firstName || ''} ${person.lastName || ''}`.trim()
}

async function findEvent(page: Page): Promise<{
  eventId: string
  overseerName: string
  otherName: string
}> {
  const eventsResponse = await page.request.get(`${BASE_URL}/api/events`)
  expect(eventsResponse.ok()).toBeTruthy()
  const events = eventList(await eventsResponse.json())

  for (const event of events) {
    if (!event?.id) continue
    const rosterResponse = await page.request.get(`${BASE_URL}/api/events/${event.id}/volunteers`)
    if (!rosterResponse.ok()) continue
    const rosterBody = await rosterResponse.json()
    const volunteers: RosterVolunteer[] = rosterBody?.volunteers || []
    const overseers = volunteers.filter((person) => person.isOverseer)
    const overseerNames = new Set(overseers.map(fullName))
    const overseer = overseers.find((person) => fullName(person))
    const other = volunteers.find((person) => {
      const name = fullName(person)
      return name && !person.isOverseer && !person.isKeyman && !overseerNames.has(name)
    })
    if (!overseer || !other) continue

    const positionsResponse = await page.request.get(`${BASE_URL}/api/events/${event.id}/positions`)
    if (!positionsResponse.ok()) continue
    const positionsBody = await positionsResponse.json()
    const positions = positionsBody?.positions
    if (!Array.isArray(positions) || positions.length === 0) continue

    return {
      eventId: event.id,
      overseerName: fullName(overseer),
      otherName: fullName(other),
    }
  }

  throw new Error('No event with a station, an overseer, and another volunteer')
}

test.describe('Generated release — event overseers on Positions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('station oversight lists only this event’s overseers', async ({ page }) => {
    test.setTimeout(60_000)
    const { eventId, overseerName, otherName } = await findEvent(page)

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE_URL}/events/${eventId}/positions-next`)
    await expect(page.getByText(/Stations by day/i).first()).toBeVisible({ timeout: 15000 })

    const station = page.locator('button[aria-expanded]').first()
    await expect(station).toBeVisible()
    if ((await station.getAttribute('aria-expanded')) !== 'true') {
      await station.click()
    }

    await page.getByRole('button', { name: 'Oversight', exact: true }).first().click()
    await expect(page.getByRole('heading', { name: 'Position oversight' })).toBeVisible()

    const overseerOptions = (
      await page.locator('form select').nth(0).locator('option').allTextContents()
    ).map((text) => text.trim())
    const keymanOptions = (
      await page.locator('form select').nth(1).locator('option').allTextContents()
    ).map((text) => text.trim())

    expect(overseerOptions).toContain(overseerName)
    expect(overseerOptions).not.toContain(otherName)
    expect(keymanOptions).not.toContain(otherName)
  })
})

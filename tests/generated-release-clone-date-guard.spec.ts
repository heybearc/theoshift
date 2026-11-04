/**
 * Generated release tests for clone date fixes:
 * - inverted end date is rejected and creates nothing
 * - a later start date moves shift days by the same delta
 * - a failed clone keeps the dialog open with the entered dates
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl, getValidEventId } from './helpers/test-config'

const BASE_URL = getBaseUrl()

function dateKey(value: unknown): string | null {
  if (!value) return null
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

function addDays(key: string, days: number): string {
  const next = new Date(`${key}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

test.describe('Generated release — clone date guards', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('clone API rejects an end date before the start date', async ({ page }) => {
    const sourceId = await getValidEventId(page)
    const cloneName = `Clone Inverted ${Date.now()}`
    const cloneRes = await page.request.post(`${BASE_URL}/api/events/${sourceId}/clone`, {
      data: {
        name: cloneName,
        clonePositions: false,
        cloneVolunteers: false,
        startDate: '2027-06-10',
        endDate: '2027-06-01',
      },
    })
    expect(cloneRes.status()).toBe(400)
    const body = await cloneRes.json()
    expect(body.success).toBe(false)
    expect(String(body.error || '')).toMatch(/end date/i)

    const listRes = await page.request.get(`${BASE_URL}/api/events`)
    expect(listRes.ok()).toBeTruthy()
    const listBody = await listRes.json()
    const events = listBody?.data?.events || listBody?.events || []
    const created = (Array.isArray(events) ? events : []).find((event: { name?: string }) => event.name === cloneName)
    expect(created).toBeFalsy()
  })

  test('clone with a later start date moves shift days by the same amount', async ({ page }) => {
    const sourceId = await getValidEventId(page)
    const sourceRes = await page.request.get(`${BASE_URL}/api/events/${sourceId}`)
    expect(sourceRes.ok()).toBeTruthy()
    const sourceJson = await sourceRes.json()
    const source = sourceJson?.data || sourceJson
    const sourceStart = dateKey(source?.startDate)
    test.skip(!sourceStart, 'Source event has no start date')

    const sourcePosRes = await page.request.get(`${BASE_URL}/api/events/${sourceId}/positions`)
    expect(sourcePosRes.ok()).toBeTruthy()
    const sourcePosJson = await sourcePosRes.json()
    const sourcePositions =
      sourcePosJson?.data?.positions || sourcePosJson?.data || sourcePosJson?.positions || []
    const datedShift = (Array.isArray(sourcePositions) ? sourcePositions : [])
      .flatMap((position: { shifts?: Array<Record<string, unknown>>; positionNumber?: unknown }) =>
        (position.shifts || []).map((shift) => ({ ...shift, positionNumber: position.positionNumber }))
      )
      .find((shift: { shiftDate?: unknown }) => dateKey(shift.shiftDate))
    test.skip(!datedShift, 'Source event has no dated shifts')

    const nextStart = addDays(sourceStart as string, 7)
    const sourceEnd = dateKey(source?.endDate) || (sourceStart as string)
    const nextEnd = addDays(sourceEnd, 7)
    const cloneRes = await page.request.post(`${BASE_URL}/api/events/${sourceId}/clone`, {
      data: {
        name: `Clone Shifted ${Date.now()}`,
        clonePositions: true,
        cloneVolunteers: false,
        cloneAssignments: false,
        startDate: nextStart,
        endDate: nextEnd,
      },
    })
    expect(cloneRes.ok()).toBeTruthy()
    const newId = (await cloneRes.json())?.data?.id as string
    expect(newId).toBeTruthy()

    try {
      const clonedPosRes = await page.request.get(`${BASE_URL}/api/events/${newId}/positions`)
      expect(clonedPosRes.ok()).toBeTruthy()
      const clonedPosJson = await clonedPosRes.json()
      const clonedPositions =
        clonedPosJson?.data?.positions || clonedPosJson?.data || clonedPosJson?.positions || []
      const match = (Array.isArray(clonedPositions) ? clonedPositions : [])
        .flatMap((position: { shifts?: Array<Record<string, unknown>>; positionNumber?: unknown }) =>
          (position.shifts || []).map((shift) => ({ ...shift, positionNumber: position.positionNumber }))
        )
        .find(
          (shift: { positionNumber?: unknown; name?: unknown; sequence?: unknown }) =>
            shift.positionNumber === datedShift.positionNumber &&
            shift.name === datedShift.name &&
            shift.sequence === datedShift.sequence
        )
      expect(match).toBeTruthy()
      expect(dateKey(match.shiftDate)).toBe(addDays(dateKey(datedShift.shiftDate) as string, 7))
    } finally {
      await page.request.delete(`${BASE_URL}/api/events/${newId}`)
    }
  })

  test('failed clone keeps the dialog and the dates the user entered', async ({ page }) => {
    const eventId = await getValidEventId(page)
    await page.route('**/api/events/*/clone', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Failed to clone event' }),
      })
    )

    await page.goto(`${BASE_URL}/events/${eventId}/edit`)
    await page.getByRole('button', { name: /Clone Event/i }).click()
    await expect(page.getByRole('heading', { name: /Clone Event/i })).toBeVisible()

    const start = page.locator('#cloneStartDate')
    const end = page.locator('#cloneEndDate')
    await start.fill('2027-08-01')
    await end.fill('2027-08-03')
    await page.locator('form').getByRole('button', { name: 'Clone Event' }).click()

    await expect(page.getByText('Failed to clone event')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Clone Event/i })).toBeVisible()
    await expect(start).toHaveValue('2027-08-01')
    await expect(end).toHaveValue('2027-08-03')
  })
})

/**
 * Generated release tests for event clone parity (v4.32.1 candidate).
 * Covers BASE_REV v4.32.0..HEAD: roster flag, oversight columns, shiftDate,
 * volunteersNeeded, fresh lanyards, assignment overseer/keyman, scope remap.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl, getValidEventId } from './helpers/test-config'

const BASE_URL = getBaseUrl()

test.describe('Generated release — Event clone parity', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('clone modal shows oversight and volunteer link options', async ({ page }) => {
    const eventId = await getValidEventId(page)
    await page.goto(`${BASE_URL}/events/${eventId}/edit`)
    await page.waitForLoadState('domcontentloaded')

    const cloneTrigger = page.getByRole('button', { name: /Clone Event/i })
    await expect(cloneTrigger).toBeVisible({ timeout: 15000 })
    await cloneTrigger.click()

    await expect(page.getByRole('heading', { name: /Clone Event/i })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('Volunteer Links', { exact: true })).toBeVisible()
    await expect(
      page.getByText(/Department overseer contacts, keymen, and position oversight/i)
    ).toBeVisible()
  })

  test('clone with volunteers puts people on Volunteers roster API', async ({ page }) => {
    test.setTimeout(120000)
    const sourceId = await getValidEventId(page)

    const sourceVolRes = await page.request.get(`${BASE_URL}/api/events/${sourceId}/volunteers`)
    expect(sourceVolRes.ok()).toBeTruthy()
    const sourceVolBody = await sourceVolRes.json()
    const sourceVolunteers =
      sourceVolBody?.data?.volunteers ||
      sourceVolBody?.data ||
      sourceVolBody?.volunteers ||
      []
    test.skip(
      !Array.isArray(sourceVolunteers) || sourceVolunteers.length === 0,
      'Source event has no roster volunteers to clone'
    )

    const cloneName = `Clone Gate ${Date.now()}`
    const cloneRes = await page.request.post(`${BASE_URL}/api/events/${sourceId}/clone`, {
      timeout: 90000,
      data: {
        name: cloneName,
        clonePositions: true,
        cloneVolunteers: true,
        cloneAssignments: true,
        cloneLanyards: true,
        clonePermissions: true,
        cloneSettings: true,
        cloneOversight: true,
      },
    })
    expect(cloneRes.ok()).toBeTruthy()
    const cloneBody = await cloneRes.json()
    expect(cloneBody.success).toBeTruthy()
    const newId = cloneBody?.data?.id as string
    expect(newId).toBeTruthy()

    try {
      const clonedVolRes = await page.request.get(`${BASE_URL}/api/events/${newId}/volunteers`)
      expect(clonedVolRes.ok()).toBeTruthy()
      const clonedVolBody = await clonedVolRes.json()
      const clonedVolunteers =
        clonedVolBody?.data?.volunteers ||
        clonedVolBody?.data ||
        clonedVolBody?.volunteers ||
        []
      expect(Array.isArray(clonedVolunteers)).toBeTruthy()
      expect(clonedVolunteers.length).toBeGreaterThan(0)
      expect(clonedVolunteers.length).toBe(sourceVolunteers.length)

      const sourceEventRes = await page.request.get(`${BASE_URL}/api/events/${sourceId}`)
      const clonedEventRes = await page.request.get(`${BASE_URL}/api/events/${newId}`)
      expect(sourceEventRes.ok()).toBeTruthy()
      expect(clonedEventRes.ok()).toBeTruthy()
      const sourceEventJson = await sourceEventRes.json()
      const clonedEventJson = await clonedEventRes.json()
      const sourceEvent = sourceEventJson?.data || sourceEventJson
      const clonedEvent = clonedEventJson?.data || clonedEventJson

      // Oversight columns copy when present on source
      if (sourceEvent?.departmentOverseerName) {
        expect(clonedEvent.departmentOverseerName).toBe(sourceEvent.departmentOverseerName)
      }
      if (sourceEvent?.departmentOverseerEmail) {
        expect(clonedEvent.departmentOverseerEmail).toBe(sourceEvent.departmentOverseerEmail)
      }

      // Shift day + capacity preserved when source has dated/multi-slot shifts
      const sourcePosRes = await page.request.get(`${BASE_URL}/api/events/${sourceId}/positions`)
      const clonedPosRes = await page.request.get(`${BASE_URL}/api/events/${newId}/positions`)
      expect(sourcePosRes.ok()).toBeTruthy()
      expect(clonedPosRes.ok()).toBeTruthy()
      const sourcePosJson = await sourcePosRes.json()
      const clonedPosJson = await clonedPosRes.json()
      const sourcePositions =
        sourcePosJson?.data?.positions || sourcePosJson?.data || sourcePosJson?.positions || []
      const clonedPositions =
        clonedPosJson?.data?.positions || clonedPosJson?.data || clonedPosJson?.positions || []

      const sourceShifts = (Array.isArray(sourcePositions) ? sourcePositions : []).flatMap(
        (p: any) => (p.shifts || []).map((s: any) => ({ ...s, positionNumber: p.positionNumber }))
      )
      const clonedShifts = (Array.isArray(clonedPositions) ? clonedPositions : []).flatMap(
        (p: any) => (p.shifts || []).map((s: any) => ({ ...s, positionNumber: p.positionNumber }))
      )

      expect(clonedShifts.length).toBe(sourceShifts.length)

      const datedSource = sourceShifts.filter((s: any) => s.shiftDate)
      for (const src of datedSource) {
        const match = clonedShifts.find(
          (c: any) =>
            c.positionNumber === src.positionNumber &&
            c.name === src.name &&
            c.sequence === src.sequence
        )
        expect(match, `missing cloned shift ${src.name}`).toBeTruthy()
        const srcDay = String(src.shiftDate).slice(0, 10)
        const clonedDay = String(match.shiftDate).slice(0, 10)
        expect(clonedDay).toBe(srcDay)
        expect(match.volunteersNeeded ?? 1).toBe(src.volunteersNeeded ?? 1)
      }

      const multiNeed = sourceShifts.filter((s: any) => (s.volunteersNeeded ?? 1) > 1)
      for (const src of multiNeed) {
        const match = clonedShifts.find(
          (c: any) =>
            c.positionNumber === src.positionNumber &&
            c.name === src.name &&
            c.sequence === src.sequence
        )
        expect(match?.volunteersNeeded).toBe(src.volunteersNeeded)
      }
    } finally {
      await page.request.delete(`${BASE_URL}/api/events/${newId}`)
    }
  })

  test('clone without volunteers leaves roster empty', async ({ page }) => {
    test.setTimeout(120000)
    const sourceId = await getValidEventId(page)
    const cloneName = `Clone Structure ${Date.now()}`
    const cloneRes = await page.request.post(`${BASE_URL}/api/events/${sourceId}/clone`, {
      timeout: 90000,
      data: {
        name: cloneName,
        clonePositions: true,
        cloneVolunteers: false,
        cloneAssignments: false,
        cloneLanyards: false,
        clonePermissions: true,
        cloneSettings: true,
        cloneOversight: true,
      },
    })
    expect(cloneRes.ok()).toBeTruthy()
    const newId = (await cloneRes.json())?.data?.id as string
    expect(newId).toBeTruthy()

    try {
      const clonedVolRes = await page.request.get(`${BASE_URL}/api/events/${newId}/volunteers`)
      expect(clonedVolRes.ok()).toBeTruthy()
      const clonedVolBody = await clonedVolRes.json()
      const clonedVolunteers =
        clonedVolBody?.data?.volunteers ||
        clonedVolBody?.data ||
        clonedVolBody?.volunteers ||
        []
      expect(Array.isArray(clonedVolunteers) ? clonedVolunteers.length : 0).toBe(0)
    } finally {
      await page.request.delete(`${BASE_URL}/api/events/${newId}`)
    }
  })
})

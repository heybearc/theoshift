/**
 * Bulk edit lists event overseers and keymen, and admin lists stack on a phone.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'
import { getBaseUrl, getValidEventId } from './helpers/test-config'

const BASE_URL = getBaseUrl()

test.describe('Generated release — bulk oversight and admin phone lists', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('bulk edit lists overseers and keymen who are not labeled that way in forms of service', async ({ page }) => {
    test.setTimeout(90_000)
    const eventId = await getValidEventId(page)
    const stamp = Date.now()
    const overseer = {
      firstName: 'Bulk',
      lastName: `Overseer${stamp}`,
      email: `bulk.overseer.${stamp}@example.com`,
      phone: '555-0191',
      congregation: 'Test Congregation',
      formsOfService: ['Elder'],
      isOverseer: true,
    }
    const keyman = {
      firstName: 'Bulk',
      lastName: `Keyman${stamp}`,
      email: `bulk.keyman.${stamp}@example.com`,
      phone: '555-0192',
      congregation: 'Test Congregation',
      formsOfService: ['Ministerial servant'],
      isKeyman: true,
    }
    const assignee = {
      firstName: 'Bulk',
      lastName: `Assignee${stamp}`,
      email: `bulk.assignee.${stamp}@example.com`,
      phone: '555-0193',
      congregation: 'Test Congregation',
      formsOfService: ['Publisher'],
    }

    const created: string[] = []
    try {
      for (const person of [overseer, keyman, assignee]) {
        const response = await page.request.post(`${BASE_URL}/api/events/${eventId}/volunteers`, {
          data: person,
        })
        expect(response.ok()).toBeTruthy()
        const body = await response.json()
        const id = body?.data?.id as string
        expect(typeof id).toBe('string')
        created.push(id)
      }

      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${BASE_URL}/events/${eventId}/volunteers`)
      await page.getByPlaceholder(/Search by name, email/i).first().fill(assignee.email)
      await page.getByRole('checkbox', { name: `Select ${assignee.firstName} ${assignee.lastName}` }).check()
      await page.getByRole('button', { name: 'Bulk Edit' }).click()

      const overseerSelect = page.locator('label', { hasText: 'Assign Overseer' }).locator('..').locator('select')
      const keymanSelect = page.locator('label', { hasText: 'Assign Keyman' }).locator('..').locator('select')
      await expect(overseerSelect.locator('option', { hasText: 'Remove overseer' })).toHaveCount(1)
      await expect(overseerSelect.locator('option', { hasText: `${overseer.firstName} ${overseer.lastName}` })).toHaveCount(1)
      await expect(keymanSelect.locator('option', { hasText: 'Remove keyman' })).toHaveCount(1)
      await expect(keymanSelect.locator('option', { hasText: `${keyman.firstName} ${keyman.lastName}` })).toHaveCount(1)
    } finally {
      for (const id of created) {
        await page.request.put(`${BASE_URL}/api/events/${eventId}/volunteers/${id}`, {
          data: { isActive: false },
          timeout: 15_000,
        })
      }
    }
  })

  test('users, locations, and feedback stay on screen on a phone', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto(`${BASE_URL}/admin/users`)
    await expect(page.locator('table')).toBeHidden()
    await expect(page.getByRole('link', { name: 'Edit User' }).first()).toBeVisible()

    await page.goto(`${BASE_URL}/admin/locations`)
    await expect(page.locator('main').getByRole('heading', { name: 'Location Library' })).toBeVisible()
    await expect(page.locator('table')).toBeHidden()

    await page.goto(`${BASE_URL}/admin/feedback`)
    const closed = page.getByRole('button', { name: 'Closed' })
    await expect(closed).toBeVisible()
    const box = await closed.boundingBox()
    expect(box).not.toBeNull()
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
  })
})

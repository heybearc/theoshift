/**
 * Generated release test: Support is a user role and an event permission.
 * Covers v4.34.0..HEAD.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'

type PermissionRow = {
  userId?: string
  role?: string
  users?: { email?: string }
}

test.describe('Generated release — Support role', () => {
  test('Support can be granted on an event and chosen as a user role', async ({ page }) => {
    test.setTimeout(60_000)
    await loginAsAdmin(page)

    await page.goto('/admin/users')
    await expect(page.locator('select option[value="SUPPORT"]')).toHaveText('Support')

    const eventsRes = await page.request.get('/api/events?limit=50')
    expect(eventsRes.ok()).toBeTruthy()
    const eventsBody: any = await eventsRes.json()
    const events = eventsBody?.data?.events || eventsBody?.events || []
    expect(Array.isArray(events)).toBeTruthy()

    let eventId = ''
    let target: PermissionRow | null = null
    for (const event of events) {
      if (!event?.id) continue
      const permissionsRes = await page.request.get(`/api/events/${event.id}/permissions`)
      if (!permissionsRes.ok()) continue
      const permissionsBody: any = await permissionsRes.json()
      if (!permissionsBody?.data?.canManage) continue
      const permissions: PermissionRow[] = permissionsBody?.data?.permissions || []
      const candidate = permissions.find((row) => row.userId && row.role && row.role !== 'ADMIN')
      if (!candidate) continue
      eventId = event.id
      target = candidate
      break
    }

    expect(target?.userId, 'Need a non-admin event permission to grant Support').toBeTruthy()
    const originalRole = target!.role as string
    const userId = target!.userId as string

    try {
      const grant = await page.request.put(`/api/events/${eventId}/permissions/${userId}`, {
        data: { role: 'SUPPORT' },
      })
      expect(grant.ok(), await grant.text()).toBeTruthy()
      const granted: any = await grant.json()
      expect(granted?.data?.role).toBe('SUPPORT')

      const check = await page.request.get(`/api/events/${eventId}/permissions`)
      expect(check.ok()).toBeTruthy()
      const checkBody: any = await check.json()
      const updated = (checkBody?.data?.permissions || []).find(
        (row: PermissionRow) => row.userId === userId
      )
      expect(updated?.role).toBe('SUPPORT')
    } finally {
      const restore = await page.request.put(`/api/events/${eventId}/permissions/${userId}`, {
        data: { role: originalRole },
      })
      expect(restore.ok(), await restore.text()).toBeTruthy()
    }
  })
})

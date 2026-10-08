import { test, expect } from '@playwright/test'
import { getTestCredentials, getValidEventId } from '../helpers/test-config'

test.describe('Chat pinning (release gate)', () => {
  test('staff can pin and volunteer can see pinned message', async ({ page }) => {
    test.setTimeout(60_000)
    const creds = getTestCredentials()

    await page.goto('/auth/signin')
    await page.click('button:has-text("Oversight")')
    await page.fill('input[type="email"]', creds.email)
    await page.fill('input[type="password"]', creds.password)
    await page.click('button[type="submit"]:has-text("Sign In")')
    await page.waitForURL(/\/events/, { timeout: 15000 })

    const eventId = await getValidEventId(page)

    // Staff chat: send message, pin it, and verify pinned panel
    await page.goto(`/events/${eventId}/chat`)
    await expect(page.locator('text=Staff Chat')).toBeVisible({ timeout: 15000 })

    const msg = `Pin test ${Date.now()}`
    await page.getByPlaceholder(/Send a message/i).fill(msg)
    await page.click('button:has-text("Send")')
    await expect(page.locator(`text=${msg}`)).toBeVisible({ timeout: 15000 })

    // Pin the message we just sent (inline confirm dialog, not window.confirm)
    const messageCard = page.locator('div.bg-white.border.border-gray-200.rounded-md.p-2', { hasText: msg }).first()
    await messageCard.locator('button:has-text("Pin")').click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()

    await expect(page.getByText('Pinned message', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('div.bg-amber-50').locator(`text=${msg}`)).toBeVisible({ timeout: 15000 })

    // Find a volunteer to view-as
    const volsRes = await page.request.get(`/api/events/${eventId}/volunteers`)
    expect(volsRes.ok()).toBeTruthy()
    const volsJson: any = await volsRes.json()
    let volunteerId = volsJson?.volunteers?.[0]?.id

    // Ensure we have at least one volunteer to view-as (release gate must be deterministic)
    if (!volunteerId) {
      const createRes = await page.request.post(`/api/events/${eventId}/volunteers`, {
        data: {
          firstName: 'Test',
          lastName: 'Volunteer',
          email: `test.volunteer.${Date.now()}@example.com`,
          phone: '555-0100',
          congregation: 'Test Congregation',
          formsOfService: ['Elder'],
        },
      })
      expect(createRes.ok()).toBeTruthy()
      const created: any = await createRes.json()
      volunteerId = created?.data?.id || created?.volunteer?.id || created?.id
    }

    expect(typeof volunteerId).toBe('string')

    // Volunteer visibility check (admin view-as via header): should see pinned message via API
    const viewAsHeaders = { 'x-view-as-volunteer-id': volunteerId as string }

    const channelsAsVolunteerRes = await page.request.get(`/api/events/${eventId}/chat/channels`, {
      headers: viewAsHeaders,
    })
    expect(channelsAsVolunteerRes.ok()).toBeTruthy()
    const channelsAsVolunteerJson: any = await channelsAsVolunteerRes.json()
    const channelId = channelsAsVolunteerJson?.data?.channels?.[0]?.id
    expect(typeof channelId).toBe('string')

    const messagesAsVolunteerRes = await page.request.get(
      `/api/events/${eventId}/chat/channels/${channelId}/messages?limit=50`,
      { headers: viewAsHeaders }
    )
    expect(messagesAsVolunteerRes.ok()).toBeTruthy()
    const messagesAsVolunteerJson: any = await messagesAsVolunteerRes.json()
    const pinned = messagesAsVolunteerJson?.data?.pinnedMessage
    expect(typeof pinned?.body).toBe('string')
    expect(pinned.body).toContain(msg)
  })
})


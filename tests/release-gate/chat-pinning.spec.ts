import { test, expect } from '@playwright/test'
import { getTestCredentials } from '../helpers/test-config'

test.describe('Chat pinning (release gate)', () => {
  test('staff can pin a direct message and the volunteer can see it', async ({ page }) => {
    test.setTimeout(60_000)
    const creds = getTestCredentials()
    let eventId = ''
    let channelId = ''
    let messageId = ''

    try {
      await page.goto('/auth/signin')
      await page.click('button:has-text("Oversight")')
      await page.fill('input[type="email"]', creds.email)
      await page.fill('input[type="password"]', creds.password)
      await page.click('button[type="submit"]:has-text("Sign In")')
      await page.waitForURL(/\/events/, { timeout: 15000 })

      const eventsRes = await page.request.get('/api/events')
      expect(eventsRes.ok()).toBeTruthy()
      const eventsBody: any = await eventsRes.json()
      const events = eventsBody?.data?.events || eventsBody?.events || eventsBody
      expect(Array.isArray(events)).toBeTruthy()

      let selfVolunteerId = ''
      for (const event of events) {
        if (!event?.id) continue
        const channelsRes = await page.request.get(`/api/events/${event.id}/chat/channels`)
        if (!channelsRes.ok()) continue
        const channelsJson: any = await channelsRes.json()
        const linked = channelsJson?.data?.linkedVolunteerId
        if (typeof linked === 'string' && linked) {
          eventId = event.id
          selfVolunteerId = linked
          break
        }
      }
      expect(
        selfVolunteerId,
        'The release check only messages the signed-in account. That account needs to be a volunteer on an event.'
      ).not.toBe('')

      const stamp = Date.now()
      const createRes = await page.request.post(`/api/events/${eventId}/volunteers`, {
        data: {
          firstName: 'Pin',
          lastName: 'Probe',
          email: 'pin.probe.release@example.com',
          phone: '555-0100',
          congregation: 'Test Congregation',
          formsOfService: ['Elder'],
        },
      })
      expect(createRes.ok()).toBeTruthy()
      const created: any = await createRes.json()
      const probeVolunteerId = created?.data?.id || created?.volunteer?.id || created?.id
      expect(typeof probeVolunteerId).toBe('string')

      const dmRes = await page.request.post(`/api/events/${eventId}/chat/direct-message`, {
        data: { peerVolunteerId: probeVolunteerId },
      })
      expect(dmRes.ok()).toBeTruthy()
      const dmJson: any = await dmRes.json()
      channelId = dmJson?.data?.channel?.id
      expect(typeof channelId).toBe('string')
      expect(dmJson?.data?.channel?.type).toBe('VOLUNTEER_DM')

      const msg = `Pin test ${stamp}`
      const sendRes = await page.request.post(
        `/api/events/${eventId}/chat/channels/${channelId}/messages`,
        {
          headers: { 'x-view-as-volunteer-id': probeVolunteerId as string },
          data: { body: msg },
        }
      )
      expect(sendRes.ok()).toBeTruthy()
      const sendJson: any = await sendRes.json()
      messageId = sendJson?.data?.id
      expect(typeof messageId).toBe('string')

      await page.goto(`/events/${eventId}/chat`)
      await expect(page.locator('text=Staff Chat')).toBeVisible({ timeout: 15000 })
      await page.getByRole('button', { name: /Pin Probe/ }).click()
      await expect(page.locator(`text=${msg}`)).toBeVisible({ timeout: 15000 })

      const messageCard = page.locator('div.bg-white.border.border-gray-200.rounded-md.p-2', { hasText: msg }).first()
      await messageCard.locator('button:has-text("Pin")').click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()

      await expect(page.getByText('Pinned message', { exact: true })).toBeVisible({ timeout: 15000 })
      await expect(page.locator('div.bg-amber-50').locator(`text=${msg}`)).toBeVisible({ timeout: 15000 })

      const messagesAsSelf = await page.request.get(
        `/api/events/${eventId}/chat/channels/${channelId}/messages?limit=50`,
        { headers: { 'x-view-as-volunteer-id': selfVolunteerId as string } }
      )
      expect(messagesAsSelf.ok()).toBeTruthy()
      const messagesJson: any = await messagesAsSelf.json()
      expect(messagesJson?.data?.pinnedMessage?.body).toContain(msg)
    } finally {
      if (eventId && channelId && messageId) {
        await page.request.delete(
          `/api/events/${eventId}/chat/channels/${channelId}/messages?messageId=${encodeURIComponent(messageId)}`
        )
      }
    }
  })
})

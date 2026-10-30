/**
 * Generated release test for pinned Announcements that volunteers must acknowledge.
 * Covers v4.33.14..HEAD.
 */
import { test, expect } from '@playwright/test'
import { getTestCredentials } from './helpers/test-config'

test.describe('Generated release — pinned announcement acknowledgment', () => {
  test('a pinned announcement is shown until acknowledged, and volunteers cannot post', async ({ page }) => {
    test.setTimeout(90_000)
    const creds = getTestCredentials()
    const recipientEmail = (process.env.RELEASE_CHAT_EMAIL || '').trim().toLowerCase()
    expect(
      recipientEmail,
      'Set RELEASE_CHAT_EMAIL to the volunteer account used for the release chat check.'
    ).not.toBe('')

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

    let eventId = ''
    let volunteerId = ''
    for (const event of events) {
      if (!event?.id) continue
      const rosterRes = await page.request.get(`/api/events/${event.id}/volunteers`)
      if (!rosterRes.ok()) continue
      const roster: any = await rosterRes.json()
      const volunteers = roster?.volunteers || roster?.data || []
      const match = Array.isArray(volunteers)
        ? volunteers.find((v: { email?: string; id?: string }) => (v?.email || '').trim().toLowerCase() === recipientEmail)
        : null
      if (match?.id) {
        eventId = event.id
        volunteerId = match.id
        break
      }
    }
    expect(volunteerId, 'The release chat recipient must be a volunteer on an event.').not.toBe('')

    const channelsRes = await page.request.get(`/api/events/${eventId}/chat/channels`)
    expect(channelsRes.ok()).toBeTruthy()
    const channelsJson: any = await channelsRes.json()
    const channels = channelsJson?.data?.channels || []
    const announcements = channels.find((c: { type?: string }) => c.type === 'EVENT_ANNOUNCEMENTS')
    expect(announcements?.id, 'Announcements channel should be available').toBeTruthy()
    const channelId = announcements.id as string
    const previousPin = typeof announcements.pinnedMessageId === 'string' ? announcements.pinnedMessageId : null

    const body = `Announcement ack test ${Date.now()}`
    let messageId = ''
    try {
      const volunteerPost = await page.request.post(`/api/events/${eventId}/chat/channels/${channelId}/messages`, {
        headers: { 'x-view-as-volunteer-id': volunteerId },
        data: { body }
      })
      expect(volunteerPost.status()).toBe(403)

      const sendRes = await page.request.post(`/api/events/${eventId}/chat/channels/${channelId}/messages`, {
        data: { body }
      })
      expect(sendRes.ok()).toBeTruthy()
      const sendJson: any = await sendRes.json()
      messageId = sendJson?.data?.id
      expect(typeof messageId).toBe('string')

      const pinRes = await page.request.post(`/api/events/${eventId}/chat/channels/${channelId}/pin`, {
        data: { messageId }
      })
      expect(pinRes.ok()).toBeTruthy()

      const bannerRes = await page.request.get(`/api/events/${eventId}/chat/pinned-announcement`, {
        headers: { 'x-view-as-volunteer-id': volunteerId }
      })
      expect(bannerRes.ok()).toBeTruthy()
      const bannerJson: any = await bannerRes.json()
      expect(bannerJson?.data?.messageId).toBe(messageId)
      expect(bannerJson?.data?.body).toContain(body)
      expect(bannerJson?.data?.simulated).toBe(true)

      const ackRes = await page.request.post(`/api/events/${eventId}/chat/pinned-announcement`, {
        headers: { 'x-view-as-volunteer-id': volunteerId },
        data: { messageId }
      })
      expect(ackRes.status()).toBe(403)
    } finally {
      await page.request.post(`/api/events/${eventId}/chat/channels/${channelId}/pin`, {
        data: { messageId: previousPin || '' }
      })
      if (messageId) {
        await page.request.delete(
          `/api/events/${eventId}/chat/channels/${channelId}/messages?messageId=${encodeURIComponent(messageId)}`
        )
      }
    }
  })
})

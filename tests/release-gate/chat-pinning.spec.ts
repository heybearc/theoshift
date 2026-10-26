import { test, expect } from '@playwright/test'
import { getTestCredentials } from '../helpers/test-config'

test.describe('Chat pinning (release gate)', () => {
  test('a direct message to the release recipient can be pinned', async ({ page }) => {
    test.setTimeout(90_000)
    const creds = getTestCredentials()
    const recipientEmail = (process.env.RELEASE_CHAT_EMAIL || '').trim().toLowerCase()
    let eventId = ''
    let channelId = ''
    let messageId = ''

    expect(
      recipientEmail,
      'Set RELEASE_CHAT_EMAIL to the one account that should receive the release chat check.'
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

    let recipientVolunteerId = ''
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
        recipientVolunteerId = match.id
        break
      }
    }
    expect(
      recipientVolunteerId,
      'The release chat recipient must be a volunteer on an event. The check does not post to the event chat.'
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
      headers: { 'x-view-as-volunteer-id': recipientVolunteerId },
      data: { peerVolunteerId: probeVolunteerId },
    })
    expect(dmRes.ok()).toBeTruthy()
    const dmJson: any = await dmRes.json()
    channelId = dmJson?.data?.channel?.id
    expect(typeof channelId).toBe('string')
    expect(dmJson?.data?.channel?.type).toBe('VOLUNTEER_DM')

    const priorRes = await page.request.get(
      `/api/events/${eventId}/chat/channels/${channelId}/messages?limit=50`,
      { headers: { 'x-view-as-volunteer-id': recipientVolunteerId } }
    )
    if (priorRes.ok()) {
      const prior: any = await priorRes.json()
      const oldMessages = prior?.data?.messages || prior?.messages || []
      if (Array.isArray(oldMessages)) {
        for (const old of oldMessages) {
          if (typeof old?.body === 'string' && /^Pin test \d+$/.test(old.body.trim()) && old.id) {
            await page.request.delete(
              `/api/events/${eventId}/chat/channels/${channelId}/messages?messageId=${encodeURIComponent(old.id)}`
            )
          }
        }
      }
    }

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

    const pinRes = await page.request.post(`/api/events/${eventId}/chat/channels/${channelId}/pin`, {
      data: { messageId },
    })
    expect(pinRes.ok()).toBeTruthy()

    const messagesAsRecipient = await page.request.get(
      `/api/events/${eventId}/chat/channels/${channelId}/messages?limit=50`,
      { headers: { 'x-view-as-volunteer-id': recipientVolunteerId } }
    )
    expect(messagesAsRecipient.ok()).toBeTruthy()
    const messagesJson: any = await messagesAsRecipient.json()
    expect(messagesJson?.data?.pinnedMessage?.body).toContain(msg)
  })
})

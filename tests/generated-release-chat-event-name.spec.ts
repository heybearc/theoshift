/**
 * Phone chat alerts use the event name as the notification title.
 */
import { test, expect } from '@playwright/test'

test('the chat service worker titles alerts with the event name', async ({ request }) => {
  const response = await request.get('/sw.js')
  expect(response.ok()).toBeTruthy()
  const body = await response.text()
  expect(body).toContain('const eventName = typeof data?.eventName')
  expect(body).toContain('const title = eventName')
  expect(body).toContain("eventName && channelName ? `${channelName}: ${preview}`")
  expect(body).toContain('theoshift-static-v2.0.4')
})

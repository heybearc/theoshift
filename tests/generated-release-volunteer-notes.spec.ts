/**
 * A note saved on a volunteer profile is still visible after leaving the page.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'

test('a saved volunteer note stays on the list', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAsAdmin(page)

  const eventsRes = await page.request.get('/api/events')
  expect(eventsRes.ok()).toBeTruthy()
  const eventsBody = await eventsRes.json()
  const events = eventsBody?.data?.events || eventsBody?.events || eventsBody
  expect(Array.isArray(events) && events.length > 0).toBeTruthy()
  const eventId = events[0].id as string

  const createRes = await page.request.post(`/api/events/${eventId}/volunteers`, {
    data: {
      firstName: 'Note',
      lastName: 'Probe',
      email: 'note.probe.release@example.com',
      phone: '555-0101',
      congregation: 'Test Congregation',
      formsOfService: ['Elder'],
    },
  })
  expect(createRes.ok()).toBeTruthy()
  const created = await createRes.json()
  const volunteerId = created?.data?.id || created?.volunteer?.id || created?.id
  expect(typeof volunteerId).toBe('string')

  const note = `Note probe ${Date.now()}`
  try {
    const saveRes = await page.request.put(`/api/events/${eventId}/volunteers/${volunteerId}`, {
      data: { notes: note },
    })
    expect(saveRes.ok()).toBeTruthy()
    const saved = await saveRes.json()
    expect(saved?.data?.notes).toBe(note)

    await page.goto(`/events/${eventId}/volunteers`)
    await page.getByPlaceholder(/Search by name, email/i).first().fill('note.probe.release@example.com')
    await expect(page.getByText(note)).toBeVisible({ timeout: 15000 })

    await page.reload()
    await page.getByPlaceholder(/Search by name, email/i).first().fill('note.probe.release@example.com')
    await expect(page.getByText(note)).toBeVisible({ timeout: 15000 })
  } finally {
    await page.request.put(`/api/events/${eventId}/volunteers/${volunteerId}`, {
      data: { notes: '' },
    })
  }
})

/**
 * The phone app opens profile, early check-in, and published documents
 * with the same sign-in token. Those routes reject anonymous callers.
 */
import { test, expect } from '@playwright/test'

test('profile, early check-in, and documents reject anonymous callers', async ({ request }) => {
  const profile = await request.put('/api/volunteer/profile', {
    data: { volunteerId: 'someone', email: 'ada@example.com', phone: '5551234567' },
  })
  expect(profile.status()).toBe(401)

  const list = await request.get('/api/volunteer/early-checkin?eventId=someone')
  expect(list.status()).toBe(401)

  const checkIn = await request.post('/api/volunteer/early-checkin/check-in', {
    data: { eventId: 'someone', volunteerId: 'someone', conventionDay: 'FRIDAY' },
  })
  expect(checkIn.status()).toBe(401)

  const undo = await request.post('/api/volunteer/early-checkin/undo', {
    data: { eventId: 'someone', volunteerId: 'someone', conventionDay: 'FRIDAY' },
  })
  expect(undo.status()).toBe(401)

  const file = await request.get('/api/events/someone/documents/someone/file')
  expect(file.status()).toBe(401)
})

test('a bad phone sign-in token cannot open early check-in', async ({ request }) => {
  const response = await request.get('/api/volunteer/early-checkin?eventId=someone', {
    headers: { Authorization: 'Bearer not-a-real-token' },
  })
  expect(response.status()).toBe(401)
  const body = await response.json()
  expect(body.success).toBe(false)
})

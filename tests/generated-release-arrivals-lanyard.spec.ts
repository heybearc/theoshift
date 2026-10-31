/**
 * Keymen and overseers open volunteer arrivals from the phone app.
 * Anonymous callers cannot read that list or assign someone to a position.
 */
import { test, expect } from '@playwright/test'

test('arrivals require a volunteer sign-in', async ({ request }) => {
  const response = await request.get('/api/volunteer/arrivals?eventId=someone')
  expect(response.status()).toBe(401)

  const bearer = await request.get('/api/volunteer/arrivals?eventId=someone', {
    headers: { Authorization: 'Bearer not-a-real-token' },
  })
  expect(bearer.status()).toBe(401)
})

test('a new position assignment requires a sign-in before documents can be granted', async ({ request }) => {
  const response = await request.post('/api/events/someone/assignments', {
    data: { volunteerId: 'someone', positionId: 'position', shiftId: 'shift' },
  })
  expect(response.status()).toBe(401)
})

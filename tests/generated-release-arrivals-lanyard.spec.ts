/**
 * Keymen and overseers open check-in and lanyard status from the phone app.
 * Anonymous callers cannot read that list.
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

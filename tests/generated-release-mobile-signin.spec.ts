/**
 * Phone app sign-in uses the same email link, then exchanges it for an app session.
 * The volunteer event list is no longer public.
 */
import { test, expect } from '@playwright/test'

test('the open-app page points the sign-in link at the phone app', async ({ page }) => {
  await page.goto('/auth/open-app?token=abc&email=ada%40example.com')
  await expect(page.getByRole('heading', { name: 'Open TheoShift' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Open the/ })).toHaveAttribute(
    'href',
    'theoshift://auth?token=abc&email=ada%40example.com'
  )
})

test('the open-app page asks for a new link when the token is missing', async ({ page }) => {
  await page.goto('/auth/open-app')
  await expect(page.getByText('This sign-in link is missing its token.')).toBeVisible()
})

test('mobile sign-in rejects a missing or unknown link', async ({ request }) => {
  const missing = await request.post('/api/auth/mobile/exchange', { data: {} })
  expect(missing.status()).toBe(400)

  const unknown = await request.post('/api/auth/mobile/exchange', {
    data: { token: 'not-a-real-token', email: 'nobody@example.com' },
  })
  expect(unknown.status()).toBe(401)
  const body = await unknown.json()
  expect(body.success).toBe(false)
})

test('the volunteer event list requires a sign-in', async ({ request }) => {
  const response = await request.get('/api/volunteer/events?volunteerId=someone')
  expect(response.status()).toBe(401)
})

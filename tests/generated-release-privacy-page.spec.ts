/**
 * Store listings need a public privacy page on the live site.
 */
import { test, expect } from '@playwright/test'

test('the privacy page is public and describes the phone app', async ({ page }) => {
  const response = await page.goto('/privacy')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What the phone app stores' })).toBeVisible()
  await expect(page.getByText('This page applies to the TheoShift website and the TheoShift phone app.')).toBeVisible()
})

/**
 * Generated release tests for case-insensitive overseer login.
 * Covers BASE_REV v4.32.2..HEAD.
 */
import { test, expect } from '@playwright/test'
import { getBaseUrl, getTestCredentials } from './helpers/test-config'

const BASE_URL = getBaseUrl()

function flipLocalPartCase(email: string): string {
  const at = email.indexOf('@')
  if (at < 1) return email.toUpperCase()
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const flipped = local.replace(/[a-zA-Z]/g, (ch) =>
    ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase()
  )
  return `${flipped}${domain}`
}

test.describe('Generated release — overseer login email case', () => {
  test('oversight sign-in works when email capitalization differs', async ({ page }) => {
    const { email, password } = getTestCredentials()
    const mixedCaseEmail = flipLocalPartCase(email)
    expect(mixedCaseEmail).not.toBe(email)

    await page.goto(`${BASE_URL}/auth/signin`)
    await page.waitForLoadState('domcontentloaded')

    const oversight = page.getByRole('button', { name: /Oversight/i })
    if (await oversight.isVisible().catch(() => false)) {
      await oversight.click()
    }

    await page.locator('#oversight-email').fill(mixedCaseEmail)
    await page.locator('#oversight-password').fill(password)
    await page.locator('form').getByRole('button', { name: /sign in|log in/i }).click()

    await expect(page).toHaveURL(/\/(events|dashboard)/, { timeout: 20000 })
    await expect(page.getByText(/Invalid credentials/i)).toHaveCount(0)
  })

  test('oversight sign-in still rejects a wrong password', async ({ page }) => {
    const { email } = getTestCredentials()

    await page.goto(`${BASE_URL}/auth/signin`)
    await page.waitForLoadState('domcontentloaded')

    const oversight = page.getByRole('button', { name: /Oversight/i })
    if (await oversight.isVisible().catch(() => false)) {
      await oversight.click()
    }

    await page.locator('#oversight-email').fill(flipLocalPartCase(email))
    await page.locator('#oversight-password').fill('definitely-not-the-password')
    await page.locator('form').getByRole('button', { name: /sign in|log in/i }).click()

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/auth\/signin/)
  })
})

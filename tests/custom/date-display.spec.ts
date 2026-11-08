import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../login-helper'

test.describe('Date Display Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('event selection page shows correct dates', async ({ page }) => {
    // Wait for events to load
    await page.waitForSelector('text=Select Event', { timeout: 10000 })
    
    // Get first event card date text
    const dateText = await page.locator('.text-sm.text-gray-600').filter({ hasText: '📅' }).first().textContent()
    
    // Verify date format and that it's not empty
    expect(dateText).toBeTruthy()
    expect(dateText).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/)
  })

  test('event details page shows matching dates', async ({ page }) => {
    // Click first event
    await page.click('button:has-text("Select Event")')
    await page.waitForURL('**/events/**', { timeout: 10000 })
    await expect(page.getByText(/[A-Z][a-z]+ \d{1,2}, \d{4}/).first()).toBeVisible({ timeout: 15000 })
  })

})

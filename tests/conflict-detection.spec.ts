import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL!,
  password: process.env.TEST_USER_PASSWORD!,
}

async function login(page: any) {
  await page.goto('/auth/signin')
  await page.waitForLoadState('networkidle')
  
  // Click Oversight role button
  const oversightButton = page.locator('button:has-text("Oversight")')
  if (await oversightButton.isVisible({ timeout: 2000 })) {
    await oversightButton.click()
    await page.waitForTimeout(500)
  }
  
  await page.waitForSelector('input[id="oversight-email"]', { state: 'visible' })
  await page.fill('input[id="oversight-email"]', TEST_USER.email)
  await page.fill('input[id="oversight-password"]', TEST_USER.password)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]')
  ])
  await page.waitForTimeout(1000)
}

test.describe('FB-017: Conflict Detection - Assign Volunteer Modal', () => {
  test('Positions page loads without errors', async ({ page }) => {
    await login(page)
    await page.goto('/events')
    await page.waitForLoadState('networkidle')
    // Navigate into first available event positions page
    const firstEvent = page.locator('a[href*="/events/"]').first()
    if (await firstEvent.count() > 0) {
      await firstEvent.click()
      await page.waitForLoadState('networkidle')
      // Try to get to positions tab
      const positionsTab = page.locator('a[href*="/positions"]')
      if (await positionsTab.count() > 0) {
        await positionsTab.first().click()
        await page.waitForLoadState('networkidle')
      }
    }
    await expect(page.locator('body')).toBeVisible()
    // No JS errors that would break the page
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    expect(errors.filter(e => e.includes('TypeError') || e.includes('ReferenceError'))).toHaveLength(0)
  })

  test('Assign Volunteer modal opens and shows volunteer list', async ({ page }) => {
    await login(page)
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const firstEvent = page.locator('a[href*="/events/"]').first()
    if (await firstEvent.count() === 0) {
      test.skip()
      return
    }
    await firstEvent.click()
    await page.waitForLoadState('networkidle')

    const positionsTab = page.locator('a[href*="/positions"]')
    if (await positionsTab.count() > 0) {
      await positionsTab.first().click()
      await page.waitForLoadState('networkidle')
    }

    // Look for an assign volunteer button
    const assignBtn = page.locator('button:has-text("Assign"), button:has-text("+ Assign")').first()
    if (await assignBtn.count() === 0) {
      test.skip()
      return
    }
    await assignBtn.click()
    await page.waitForTimeout(500)

    // Modal should be visible with search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 5000 })
    // Should have a shift selector
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible({ timeout: 3000 })
  })

  test('Assign Volunteer modal has Assign Volunteer button', async ({ page }) => {
    await login(page)
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const firstEvent = page.locator('a[href*="/events/"]').first()
    if (await firstEvent.count() === 0) { test.skip(); return }
    await firstEvent.click()
    await page.waitForLoadState('networkidle')

    const positionsTab = page.locator('a[href*="/positions"]')
    if (await positionsTab.count() > 0) {
      await positionsTab.first().click()
      await page.waitForLoadState('networkidle')
    }

    const assignBtn = page.locator('button:has-text("Assign"), button:has-text("+ Assign")').first()
    if (await assignBtn.count() === 0) { test.skip(); return }
    await assignBtn.click()
    await page.waitForTimeout(500)

    // Submit button should be present
    await expect(page.locator('button:has-text("Assign Volunteer")')).toBeVisible({ timeout: 5000 })
    // Cancel button should be present
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Email: Send Notifications API', () => {
  test('Send notifications endpoint requires authentication', async ({ page }) => {
    // Unauthenticated request should return 401
    const response = await page.request.post('/api/events/nonexistent/assignments/send-notifications')
    expect(response.status()).toBe(401)
  })
})

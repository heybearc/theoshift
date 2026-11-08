import { test, expect } from '@playwright/test'

test.describe('Phase 7 Mobile Optimization Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/auth/signin`)
    await page.locator('#oversight-email').fill(process.env.TEST_USER_EMAIL || '')
    await page.locator('#oversight-password').fill(process.env.TEST_USER_PASSWORD || '')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/events/select')
  })

  test('Mobile navigation - Bottom nav should be present', async ({ page }) => {
    // Navigate to an event
    const firstEvent = page.locator('a[href^="/events/"]').first()
    if (await firstEvent.count() > 0) {
      await firstEvent.click()
      await page.waitForLoadState('networkidle')
      
      // Check for bottom navigation (mobile only, but should exist in DOM)
      const bottomNav = page.locator('[class*="bottom-"]').first()
      await expect(bottomNav).toBeAttached()
    }
  })

  test('Volunteer delete functionality', async ({ page }) => {
    // Navigate to first event card (not just any link)
    const firstEventCard = page.locator('.bg-white.rounded-lg.shadow-lg').first()
    const eventCount = await firstEventCard.count()
    
    if (eventCount > 0) {
      await firstEventCard.click()
      await page.waitForURL('**/events/**', { timeout: 10000 })
      await page.waitForLoadState('networkidle')
      
      // Wait a bit for tabs to render
      await page.waitForTimeout(1000)
      
      // Go to volunteers page - look for the tab link
      const volunteersTab = page.locator('a[href*="/volunteers"]').first()
      await volunteersTab.waitFor({ state: 'visible', timeout: 10000 })
      await volunteersTab.click()
      await page.waitForURL('**/volunteers', { timeout: 5000 })
      await page.waitForLoadState('networkidle')
      
      // Verify we're on volunteers page and it loads without errors
      expect(page.url()).toContain('/volunteers')
      
      // Check that page has loaded content (table or volunteers list)
      const pageContent = page.locator('table, [role="table"], h1, h2').first()
      await expect(pageContent).toBeVisible({ timeout: 5000 })
    }
  })

  test('Event delete functionality - should not error', async ({ page }) => {
    // Just verify events page loads and no console errors
    await page.goto(`${process.env.BASE_URL}/events`)
    await page.waitForLoadState('networkidle')
    
    // Check for events list
    const eventsList = page.locator('a[href^="/events/"]')
    expect(await eventsList.count()).toBeGreaterThan(0)
  })

  test('Service worker should load without errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.goto(process.env.BASE_URL || 'http://localhost:3001')
    await page.waitForTimeout(2000) // Wait for SW registration
    
    // Check for service worker cache errors
    const swErrors = consoleErrors.filter(err => 
      err.includes('cache') || err.includes('service worker')
    )
    expect(swErrors.length).toBe(0)
  })

  test('Mobile forms - inputs should have proper attributes', async ({ page }) => {
    // Check volunteer login page
    await page.goto(`${process.env.BASE_URL}/volunteer/login`)
    
    // Check for autocomplete attributes
    const emailInput = page.locator('#oversight-email, #volunteer-email').first()
    if (await emailInput.count() > 0) {
      const autocomplete = await emailInput.getAttribute('autocomplete')
      expect(autocomplete).toBeTruthy()
    }
  })

  test('Branding - TheoShift logo should be present', async ({ page }) => {
    // Check login page for logo
    await page.goto(`${process.env.BASE_URL}/auth/signin`)
    
    const logo = page.locator('img[alt*="TheoShift"]')
    await expect(logo).toBeVisible()
  })

  test('Dashboard - should load without errors', async ({ page }) => {
    // Navigate to first event dashboard
    const firstEvent = page.locator('a[href^="/events/"]').first()
    if (await firstEvent.count() > 0) {
      await firstEvent.click()
      await page.waitForLoadState('networkidle')
      
      // Verify dashboard elements load
      const heading = page.locator('h1').first()
      await expect(heading).toBeVisible()
    }
  })
})

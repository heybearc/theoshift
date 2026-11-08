/**
 * Test if other event pages work to isolate the issue
 */

import { test, expect } from '@playwright/test'
import { getBaseUrl, getTestCredentials, getValidEventId } from './helpers/test-config'

const BASE_URL = getBaseUrl()
const credentials = getTestCredentials()


test.describe('Test Other Event Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/auth/signin`)
    await page.locator('#oversight-email').fill(credentials.email)
    await page.locator('#oversight-password').fill(credentials.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/events|\/admin/, { timeout: 10000 })
  })

  test('check if /events/[id]/positions works', async ({ page }) => {
    const eventId = await getValidEventId(page)
    const response = await page.goto(`${BASE_URL}/events/${eventId}/positions`)
    
    console.log('Positions page status:', response?.status())
    console.log('Final URL:', page.url())
    
    // Positions page should load successfully
    expect(response?.status()).toBe(200)
    
    // Should have positions in the title or content
    const title = await page.title()
    const bodyText = await page.textContent('body')
    const hasPositions = title.toLowerCase().includes('position') || bodyText?.toLowerCase().includes('position')
    
    expect(hasPositions).toBeTruthy()
    console.log('✅ /events/[id]/positions works')
  })

  test('check if /events/[id]/volunteers works (renamed from attendants)', async ({ page }) => {
    const eventId = await getValidEventId(page)
    const response = await page.goto(`${BASE_URL}/events/${eventId}/volunteers`)
    
    console.log('Volunteers page status:', response?.status())
    console.log('Final URL:', page.url())
    
    // Volunteers page should load successfully (was renamed from attendants)
    expect(response?.status()).toBe(200)
    
    // Should have volunteers in the title or content
    const title = await page.title()
    const bodyText = await page.textContent('body')
    const hasVolunteers = title.toLowerCase().includes('volunteer') || bodyText?.toLowerCase().includes('volunteer')
    
    expect(hasVolunteers).toBeTruthy()
    console.log('✅ /events/[id]/volunteers works (renamed from attendants)')
  })
})

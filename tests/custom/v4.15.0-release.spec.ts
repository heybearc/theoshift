import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL!,
  password: process.env.TEST_USER_PASSWORD!,
}

async function loginAdmin(page: any) {
  await page.goto('/auth/signin')
  await page.waitForSelector('input[id="email"]', { state: 'visible', timeout: 15000 })
  await page.fill('input[id="email"]', TEST_USER.email)
  await page.fill('input[id="password"]', TEST_USER.password)
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button[type="submit"]')
  ])
  await page.waitForTimeout(1000)
}

// --- Global Announcements Banner ---

test.describe('v4.15.0: Global Announcements Banner', () => {
  test('Public global-announcements API returns 200 when authenticated', async ({ page }) => {
    await loginAdmin(page)
    const response = await page.request.get('/api/global-announcements')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('Public global-announcements API returns 401 when unauthenticated', async ({ page }) => {
    const response = await page.request.get('/api/global-announcements')
    expect(response.status()).toBe(401)
  })

  test('Admin layout loads without JS errors (banner present)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await loginAdmin(page)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0)
  })

  test('Announcements tab visible in admin nav', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    const announcementsTab = page.locator('a[href*="global-announcements"]').first()
    await expect(announcementsTab).toBeVisible({ timeout: 10000 })
  })

  test('Announcements tab navigates to global-announcements page', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/global-announcements')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/admin/global-announcements')
    await expect(page.locator('h1, h2').filter({ hasText: /announcement/i }).first()).toBeVisible({ timeout: 10000 })
  })
})

// --- Service Worker (version bumps with public/sw.js) ---

test.describe('v4.15.0: Service Worker', () => {
  test('sw.js is served and contains current cache version', async ({ page }) => {
    const response = await page.request.get('/sw.js')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('Version 2.0.4')
    expect(body).toContain('theoshift-static-v2.0.4')
    expect(body).toContain('theoshift-data-v2.0.4')
  })

  test('sw.js contains stale-while-revalidate for volunteer API routes', async ({ page }) => {
    const response = await page.request.get('/sw.js')
    const body = await response.text()
    expect(body).toContain('/api/volunteer/dashboard')
    expect(body).toContain('/api/global-announcements')
    expect(body).toContain('DATA_CACHE')
  })

  test('sw.js contains volunteer page cache entries', async ({ page }) => {
    const response = await page.request.get('/sw.js')
    const body = await response.text()
    expect(body).toContain('/volunteer/dashboard')
    expect(body).toContain('/volunteer/select-event')
    expect(body).toContain('/volunteer/early-checkin')
  })

  test('Service worker registers without errors on admin page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await loginAdmin(page)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    const swErrors = errors.filter(e =>
      e.toLowerCase().includes('service worker') ||
      e.toLowerCase().includes('serviceworker')
    )
    expect(swErrors).toHaveLength(0)
  })
})

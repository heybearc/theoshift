import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL!,
  password: process.env.TEST_USER_PASSWORD!,
}

async function loginAdmin(page: any) {
  await page.goto('/auth/signin')
  await page.waitForSelector('input[id="oversight-email"]', { state: 'visible', timeout: 15000 })
  await page.fill('input[id="oversight-email"]', TEST_USER.email)
  await page.fill('input[id="oversight-password"]', TEST_USER.password)
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button[type="submit"]')
  ])
  await page.waitForTimeout(1000)
}

async function getFirstRealEventId(page: any): Promise<string | null> {
  await page.goto('/events')
  await page.waitForLoadState('networkidle')
  // Get all event links, filter out /events/create and non-ID paths
  const links = await page.locator('a[href*="/events/"]').all()
  for (const link of links) {
    const href = await link.getAttribute('href')
    if (!href) continue
    const match = href.match(/\/events\/([a-zA-Z0-9_-]{5,})/)
    if (match && match[1] !== 'create' && match[1] !== 'select') {
      return match[1]
    }
  }
  return null
}

// --- PWA Bottom Navigation ---

test.describe('v4.14.0: PWA Bottom Navigation', () => {
  test('Volunteer dashboard page loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await loginAdmin(page)
    await page.goto('/volunteer/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0)
  })

  test('Volunteer select-event page loads without errors', async ({ page }) => {
    // Requires VOLUNTEER role session - skipped on STANDBY (no volunteer test account)
    test.skip(true, 'Requires VOLUNTEER role session - tested via phase7-mobile-features')
  })

  test('Volunteer early-checkin page loads without errors', async ({ page }) => {
    // Requires VOLUNTEER role session - skipped on STANDBY (no volunteer test account)
    test.skip(true, 'Requires VOLUNTEER role session - tested via phase7-mobile-features')
  })

  test('Volunteer pages load cleanly - no 500 errors', async ({ page }) => {
    // Requires VOLUNTEER role session - skipped on STANDBY (no volunteer test account)
    test.skip(true, 'Requires VOLUNTEER role session - tested via phase7-mobile-features')
  })
})

// --- Global Announcements Admin Page ---

test.describe('v4.14.0: Global Announcements Admin Page', () => {
  test('Admin can access global announcements page', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/global-announcements')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2').filter({ hasText: /announcement/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('Global announcements page has no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await loginAdmin(page)
    await page.goto('/admin/global-announcements')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0)
  })

  test('Create announcement button opens modal', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/global-announcements')
    await page.waitForLoadState('networkidle')
    const createBtn = page.locator('button').filter({ hasText: /new|create|add/i }).first()
    if (await createBtn.count() > 0) {
      await createBtn.click()
      await page.waitForTimeout(500)
      const modal = page.locator('[role="dialog"], .modal, form').filter({ hasText: /title|message/i }).first()
      await expect(modal).toBeVisible({ timeout: 5000 })
    }
  })

  test('Global announcements API returns 200', async ({ page }) => {
    await loginAdmin(page)
    const response = await page.request.get('/api/admin/global-announcements')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('Global announcements page linked from admin index', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    const link = page.locator('a[href*="global-announcements"]').first()
    await expect(link).toBeVisible({ timeout: 10000 })
  })
})

// --- PWA Document Modal ---

test.describe('v4.14.0: PWA Document Modal', () => {
  test('Documents page loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await loginAdmin(page)
    const eventId = await getFirstRealEventId(page)
    if (eventId) {
      await page.goto('/events/' + eventId + '/documents')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
    }
    await expect(page.locator('body')).toBeVisible()
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0)
  })

  test('No target=_blank on document links (iPhone trap fix)', async ({ page }) => {
    await loginAdmin(page)
    const eventId = await getFirstRealEventId(page)
    if (eventId) {
      await page.goto('/events/' + eventId + '/documents')
      await page.waitForLoadState('networkidle')
      const blankLinks = page.locator('a[target="_blank"][href*=".pdf"], a[target="_blank"][href*="document"]')
      expect(await blankLinks.count()).toBe(0)
    }
  })
})

// --- Regression: Event Sub-Page Tabs ---

test.describe('v4.14.0 Regression: Event Sub-Page Tabs', () => {
  test('Event positions page has positions tab in nav', async ({ page }) => {
    await loginAdmin(page)
    const eventId = await getFirstRealEventId(page)
    if (!eventId) { test.skip(); return }
    await page.goto('/events/' + eventId + '/positions')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const positionsTab = page.locator('a[href="/events/' + eventId + '/positions"]')
    await expect(positionsTab).toBeVisible({ timeout: 10000 })
  })

  test('Event volunteers page has volunteers tab in nav', async ({ page }) => {
    await loginAdmin(page)
    const eventId = await getFirstRealEventId(page)
    if (!eventId) { test.skip(); return }
    await page.goto('/events/' + eventId + '/volunteers')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const volunteersTab = page.locator('a[href="/events/' + eventId + '/volunteers"]')
    await expect(volunteersTab).toBeVisible({ timeout: 10000 })
  })

  test('Legacy event announcements URL redirects to staff chat', async ({ page }) => {
    await loginAdmin(page)
    const eventId = await getFirstRealEventId(page)
    if (!eventId) { test.skip(); return }
    await page.goto('/events/' + eventId + '/announcements')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/events/' + eventId + '/chat')
    const chatTab = page.locator('a[href="/events/' + eventId + '/chat"]')
    await expect(chatTab).toBeVisible({ timeout: 10000 })
  })

  test('ASSISTANT_OVERSEER API fix - events API returns 200', async ({ page }) => {
    await loginAdmin(page)
    const response = await page.request.get('/api/events')
    expect(response.status()).toBe(200)
    expect(response.status()).not.toBe(500)
  })
})

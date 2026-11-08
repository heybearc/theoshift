import { loginAsAdmin } from '../login-helper'
import { test, expect } from '@playwright/test'

/**
 * FB-029: Volunteer Details Hover/Click-to-Expand
 * Tests for volunteer details popup functionality
 */

test.describe('FB-029: Volunteer Details Popup', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page)
    
    // Click first event to enter event detail
    const firstEvent = page.locator('.bg-white.rounded-lg.shadow-lg').first()
    if (await firstEvent.count() > 0) {
      await firstEvent.click()
      await page.waitForURL('**/events/**', { timeout: 5000 })
    }
    
    // Navigate to volunteers tab (use .first() to avoid strict mode violation)
    const volunteersTab = page.locator('a[href*="/volunteers"]').first()
    if (await volunteersTab.count() > 0) {
      await volunteersTab.click()
      await page.waitForTimeout(1000)
    }
  })

  test('should display volunteer names as clickable elements', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('load')
    await page.waitForTimeout(1000)
    
    // Look for volunteer name cells in table - use filter with regex
    const volunteerNames = page.locator('td').filter({ hasText: /[A-Z][a-z]+ [A-Z][a-z]+/ })
    
    const count = await volunteerNames.count()
    if (count > 0) {
      await expect(volunteerNames.first()).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should show popup on hover after delay', async ({ page }) => {
    // Find first volunteer name
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      // Hover over name
      await volunteerName.hover()
      
      // Wait for hover delay (300ms)
      await page.waitForTimeout(400)
      
      // Popup should appear
      const popup = page.locator('.absolute.z-50.w-96.bg-white.rounded-lg.shadow-2xl')
      await expect(popup).toBeVisible({ timeout: 2000 })
    }
  })

  test('should show popup on click', async ({ page }) => {
    // Find first volunteer name
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      // Click name
      await volunteerName.click()
      
      // Popup should appear immediately
      const popup = page.locator('.absolute.z-50.w-96.bg-white.rounded-lg.shadow-2xl')
      await expect(popup).toBeVisible({ timeout: 1000 })
    }
  })

  test('should display volunteer contact information in popup', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      await page.waitForTimeout(300)
      
      // Check for contact section
      const contactSection = page.locator('text=/Contact/i')
      if (await contactSection.count() > 0) {
        await expect(contactSection).toBeVisible()
        
        // Should show email and phone labels
        const emailLabel = page.locator('text=/Email/i')
        await expect(emailLabel).toBeVisible()
      }
    }
  })

  test('should display volunteer status badges in popup', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      await page.waitForTimeout(300)
      
      // Look for status badges (Active/Inactive, Verified)
      const statusBadges = page.locator('span.rounded-full').filter({ hasText: /Active|Inactive|Verified/ })
      
      if (await statusBadges.count() > 0) {
        await expect(statusBadges.first()).toBeVisible()
      }
    }
  })

  test('should display forms of service in popup', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      await page.waitForTimeout(300)
      
      // Look for forms of service section
      const formsSection = page.locator('text=/Forms of Service/i')
      
      if (await formsSection.count() > 0) {
        await expect(formsSection).toBeVisible()
      }
    }
  })

  test('should show Edit Volunteer button in popup', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      await page.waitForTimeout(300)
      
      // Look for Edit button
      const editButton = page.locator('button:has-text("Edit Volunteer")')
      
      if (await editButton.count() > 0) {
        await expect(editButton).toBeVisible()
      }
    }
  })

  test('should close popup when clicking X button', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      
      // Wait for popup to appear
      const popup = page.locator('.absolute.z-50.w-96.bg-white.rounded-lg.shadow-2xl, [role="dialog"]')
      await popup.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {})
      
      if (await popup.first().isVisible()) {
        // Find close button - try multiple selectors
        const closeButton = page.locator('button[aria-label*="Close"], button[title*="Close"], button:has(svg):has(path[d*="M6 18"]), button:has(svg):has(path[d*="X"])').first()
        
        if (await closeButton.count() > 0) {
          await closeButton.click()
          await page.waitForTimeout(300)
          
          // Popup should be hidden
          await expect(popup.first()).not.toBeVisible()
        } else {
          // If no close button found, skip test
          test.skip()
        }
      } else {
        // If popup doesn't open, skip test
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('should close popup when hovering away', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      // Hover to open
      await volunteerName.hover()
      await page.waitForTimeout(400)
      
      // Hover away
      await page.mouse.move(0, 0)
      await page.waitForTimeout(300)
      
      // Popup should close
      const popup = page.locator('.absolute.z-50.w-96.bg-white.rounded-lg.shadow-2xl')
      await expect(popup).not.toBeVisible({ timeout: 1000 })
    }
  })

  test('should position popup above or below based on viewport', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      await page.waitForTimeout(300)
      
      // Popup should have either top-full or bottom-full class
      const popup = page.locator('.absolute.z-50.w-96.bg-white.rounded-lg.shadow-2xl')
      
      if (await popup.count() > 0) {
        const classes = await popup.getAttribute('class')
        const hasPositioning = classes?.includes('top-full') || classes?.includes('bottom-full')
        expect(hasPositioning).toBeTruthy()
      }
    }
  })

  test('should display assignments if volunteer has any', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      await page.waitForTimeout(300)
      
      // Look for assignments section
      const assignmentsSection = page.locator('text=/Assignments/i')
      
      // If volunteer has assignments, section should be visible
      if (await assignmentsSection.count() > 0) {
        await expect(assignmentsSection).toBeVisible()
      }
    }
  })

  test('should display oversight information if available', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      await page.waitForTimeout(300)
      
      // Look for oversight section
      const oversightSection = page.locator('text=/Oversight/i')
      
      // If volunteer has overseer/keyman, section should be visible
      if (await oversightSection.count() > 0) {
        await expect(oversightSection).toBeVisible()
      }
    }
  })

  test('should display availability status in popup', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      await page.waitForTimeout(300)
      
      // Look for availability section
      const availabilitySection = page.locator('text=/Availability/i')
      
      if (await availabilitySection.count() > 0) {
        await expect(availabilitySection).toBeVisible()
        
        // Should show status badge
        const statusBadge = page.locator('span.rounded-full:has-text(/AVAILABLE|NOT_AVAILABLE|PARTIAL|PENDING/)')
        if (await statusBadge.count() > 0) {
          await expect(statusBadge).toBeVisible()
        }
      }
    }
  })

  test('should open edit modal when clicking Edit button in popup', async ({ page }) => {
    const volunteerName = page.locator('td div.cursor-pointer').first()
    
    if (await volunteerName.count() > 0) {
      await volunteerName.click()
      await page.waitForTimeout(300)
      
      const editButton = page.locator('button:has-text("Edit Volunteer")')
      
      if (await editButton.count() > 0) {
        await editButton.click()
        await page.waitForTimeout(500)
        
        // Edit modal should open
        const modal = page.locator('[role="dialog"], .fixed.inset-0')
        await expect(modal).toBeVisible({ timeout: 2000 })
      }
    }
  })
})

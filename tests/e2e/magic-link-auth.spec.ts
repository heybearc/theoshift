import { test, expect } from '@playwright/test'

/**
 * Custom E2E Tests for Magic Link Authentication
 * Generated for test-release on 2026-04-19
 * 
 * Tests the new unified login page with:
 * - Role toggle (Oversight/Volunteer)
 * - Volunteer Email Link authentication
 * - Oversight email/password authentication
 */

test.describe('Unified Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin')
  })

  test('should display unified login page with role toggle', async ({ page }) => {
    // Verify page loads
    await expect(page).toHaveTitle(/TheoShift/)
    
    // Verify logo
    await expect(page.locator('img[alt="TheoShift Logo"]')).toBeVisible()
    
    // Verify role toggle buttons
    await expect(page.locator('button:has-text("Oversight")')).toBeVisible()
    await expect(page.locator('button:has-text("Volunteer")')).toBeVisible()
    
    // Verify "Oversight" is selected by default
    const oversightButton = page.locator('button:has-text("Oversight")')
    await expect(oversightButton).toHaveClass(/bg-white/)
  })

  test('should toggle between Oversight and Volunteer roles', async ({ page }) => {
    // Click Volunteer toggle
    await page.click('button:has-text("Volunteer")')
    
    // Verify Volunteer is now active
    const volunteerButton = page.locator('button:has-text("Volunteer")')
    await expect(volunteerButton).toHaveClass(/bg-white/)
    
    // Verify role indicator shows "Signing in as Volunteer"
    await expect(page.locator('text=Signing in as Volunteer')).toBeVisible()
    
    // Click Oversight toggle
    await page.click('button:has-text("Oversight")')
    
    // Verify Oversight is now active
    const oversightButton = page.locator('button:has-text("Oversight")')
    await expect(oversightButton).toHaveClass(/bg-white/)
    
    // Verify role indicator shows "Signing in as Oversight"
    await expect(page.locator('text=Signing in as Oversight')).toBeVisible()
  })

  test('should persist role selection in localStorage', async ({ page }) => {
    // Select Volunteer role
    await page.click('button:has-text("Volunteer")')
    
    // Reload page
    await page.reload()
    
    // Verify Volunteer is still selected
    const volunteerButton = page.locator('button:has-text("Volunteer")')
    await expect(volunteerButton).toHaveClass(/bg-white/)
  })
})

test.describe('Oversight Login (Email + Password)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin')
  })

  test('should show email and password fields for Oversight', async ({ page }) => {
    // Ensure Oversight is selected
    await page.click('button:has-text("Oversight")')
    
    // Verify email field
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('label:has-text("Email Address")')).toBeVisible()
    
    // Verify password field
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('label:has-text("Password")')).toBeVisible()
    
    // Verify sign in button
    await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible()
  })

  test('should successfully login as Oversight user', async ({ page }) => {
    // Select Oversight role
    await page.click('button:has-text("Oversight")')
    
    // Fill in credentials
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!)
    
    // Click sign in
    await page.click('button[type="submit"]:has-text("Sign In")')
    
    // Wait for redirect
    await page.waitForURL(/\/events/, { timeout: 10000 })
    
    // Verify successful login (should be on events page)
    await expect(page).toHaveURL(/\/events/)
  })

  test('should show error for invalid Oversight credentials', async ({ page }) => {
    // Select Oversight role
    await page.click('button:has-text("Oversight")')
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    // Click sign in
    await page.click('button[type="submit"]:has-text("Sign In")')
    
    // Wait for error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Volunteer Login - Email Link Method', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin')
    // Select Volunteer role
    await page.click('button:has-text("Volunteer")')
  })

  test('should show volunteer magic link form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button:has-text("Send Sign-In Link")')).toBeVisible()
    await expect(page.locator('button:has-text("PIN Login")')).toHaveCount(0)
  })

  test('should show email input for volunteer magic link', async ({ page }) => {
    // Verify email field
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('label:has-text("Email Address")')).toBeVisible()
    
    // Verify info message
    await expect(page.getByText('Invited volunteers only')).toBeVisible()
    
    // Verify send button
    await expect(page.locator('button:has-text("Send Sign-In Link")')).toBeVisible()
  })

  test('should show error for unregistered email', async ({ page }) => {
    // Fill in unregistered email
    await page.fill('input[type="email"]', 'unregistered@example.com')
    
    // Click send button
    await page.click('button:has-text("Send Sign-In Link")')
    
    // Wait for error message
    await expect(page.locator('text=Email not registered')).toBeVisible({ timeout: 5000 })
  })

  test('should show success message for registered volunteer email', async ({ page }) => {
    // Fill in registered volunteer email (from .env.test)
    await page.fill('input[type="email"]', 'corylallen@gmail.com')
    
    // Click send button
    await page.click('button:has-text("Send Sign-In Link")')
    
    // Wait for success screen
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=corylallen@gmail.com')).toBeVisible()
    
    // Verify back button
    await expect(page.locator('text=Back to login')).toBeVisible()
  })
})

test.describe('Old Volunteer Login URL Redirect', () => {
  test('should redirect from /volunteer/login to unified page', async ({ page }) => {
    // Go to old volunteer login URL
    await page.goto('/volunteer/login')
    
    // Should redirect to unified login with volunteer role
    await page.waitForURL(/\/auth\/signin\?role=volunteer/, { timeout: 5000 })
    
    // Verify Volunteer role is selected
    const volunteerButton = page.locator('button:has-text("Volunteer")')
    await expect(volunteerButton).toHaveClass(/bg-white/)
  })

  test('should preserve callbackUrl when redirecting', async ({ page }) => {
    // Go to old volunteer login URL with callbackUrl
    await page.goto('/volunteer/login?callbackUrl=/volunteer/dashboard')
    
    // Should redirect with both role and callbackUrl preserved
    await page.waitForURL(/\/auth\/signin\?role=volunteer&callbackUrl=/, { timeout: 5000 })
    
    // Verify URL contains both parameters
    expect(page.url()).toContain('role=volunteer')
    expect(page.url()).toContain('callbackUrl')
  })
})

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

  test('should be mobile-friendly', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Verify logo is visible
    await expect(page.locator('img[alt="TheoShift Logo"]')).toBeVisible()
    
    // Verify role toggle is visible and usable
    await expect(page.locator('button:has-text("Oversight")')).toBeVisible()
    await expect(page.locator('button:has-text("Volunteer")')).toBeVisible()
    
    // Test toggle on mobile
    await page.click('button:has-text("Volunteer")')
    const volunteerButton = page.locator('button:has-text("Volunteer")')
    await expect(volunteerButton).toHaveClass(/bg-white/)
  })
})

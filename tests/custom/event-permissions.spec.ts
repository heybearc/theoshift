import { loginAsAdmin } from '../login-helper'
import { test, expect } from '@playwright/test'

test.describe('Event Permissions UX', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to first event
    await page.click('button:has-text("Select Event")')
    await page.waitForURL('**/events/**')
  })

  test('permissions page shows Add User button', async ({ page }) => {
    // Navigate to permissions page - it's a tab in EventPageLayout
    await page.click('a[href$="/permissions"]')
    await page.waitForURL('**/permissions')
    
    // Verify "Add User" button exists (not "Invite User")
    const addUserButton = page.locator('button:has-text("Add User")')
    await expect(addUserButton).toBeVisible()
    
    // Verify old "Invite User" text is not present
    const inviteUserButton = page.locator('button:has-text("Invite User")')
    await expect(inviteUserButton).not.toBeVisible()
  })

  test('Add User form shows dropdown instead of email input', async ({ page }) => {
    await page.click('a[href$="/permissions"]')
    await page.waitForURL('**/permissions')
    
    // Click Add User button
    await page.click('button:has-text("+ Add User")')
    
    // Verify dropdown exists
    const userDropdown = page.locator('select').first()
    await expect(userDropdown).toBeVisible()
    
    // Verify it has options
    const options = await userDropdown.locator('option').count()
    expect(options).toBeGreaterThan(1) // At least placeholder + 1 user
    
    // Verify no email input field
    const emailInput = page.locator('#email')
    await expect(emailInput).not.toBeVisible()
  })

  test('Add User form has role selection', async ({ page }) => {
    await page.click('a[href$="/permissions"]')
    await page.waitForURL('**/permissions')
    
    await page.click('button:has-text("+ Add User")')
    
    // Verify role dropdown exists
    const roleDropdown = page.locator('select').filter({ has: page.locator('option[value="VIEWER"]') })
    await expect(roleDropdown).toBeVisible()
    
    // Verify it has the three roles
    const roleOptions = await roleDropdown.locator('option').allTextContents()
    expect(roleOptions.some(opt => opt.includes('Viewer'))).toBeTruthy()
    expect(roleOptions.some(opt => opt.includes('Coordinator'))).toBeTruthy()
    expect(roleOptions.some(opt => opt.includes('Admin'))).toBeTruthy()
  })
})

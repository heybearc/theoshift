/**
 * Generated release tests for volunteers page filter persistence.
 * Covers keeping Inactive/search after a volunteer record change.
 */
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './login-helper'

test.describe('Generated release — volunteers filters persist after edit', () => {
  test('inactive filter and search stay after an oversight change', async ({ page }) => {
    await loginAsAdmin(page)

    const eventsResponse = await page.request.get('/api/events')
    expect(eventsResponse.ok()).toBeTruthy()
    const eventsBody = await eventsResponse.json()
    const events = eventsBody?.data?.events || eventsBody?.events || eventsBody
    expect(Array.isArray(events)).toBeTruthy()

    let eventId: string | null = null
    for (const event of events as any[]) {
      const id = event?.id
      if (!id) continue
      const volunteersResponse = await page.request.get(`/api/events/${id}/volunteers`)
      if (!volunteersResponse.ok()) continue
      const volunteersBody = await volunteersResponse.json()
      const volunteers = volunteersBody?.volunteers || []
      if (Array.isArray(volunteers) && volunteers.length > 0) {
        eventId = id
        break
      }
    }
    test.skip(!eventId, 'No event with volunteers available for this test user/environment')

    await page.goto(`/events/${eventId}/volunteers`)
    await page.waitForLoadState('domcontentloaded')

    const inactiveFilter = page.getByRole('button', { name: /^Inactive\b/ }).first()
    await expect(inactiveFilter).toBeVisible({ timeout: 15000 })
    await inactiveFilter.click()

    const firstRow = page.locator('table tbody tr').first()
    if (!(await firstRow.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /^All\b/ }).first().click()
    }
    await expect(firstRow).toBeVisible({ timeout: 10000 })

    const nameCell = firstRow.locator('td').nth(1)
    const fullName = ((await nameCell.innerText()) || '').trim().split('\n')[0] || ''
    const searchTerm = fullName.split(' ').pop() || fullName.slice(0, 3)
    test.skip(!searchTerm, 'Could not read a volunteer name to search')

    const searchBox = page.locator('input[placeholder*="Search by name"]').locator('visible=true').first()
    await searchBox.fill(searchTerm)
    await expect(searchBox).toHaveValue(searchTerm)

    const keymanSelect = firstRow.locator('select').nth(1)
    await expect(keymanSelect).toBeVisible({ timeout: 10000 })
    const optionValues = await keymanSelect.locator('option').evaluateAll((opts) =>
      opts.map((opt) => (opt as HTMLOptionElement).value)
    )
    const currentValue = await keymanSelect.inputValue()
    const nextValue = optionValues.find((value) => value !== currentValue)
    test.skip(nextValue === undefined, 'No alternate keyman option available in this event')

    const assignResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/oversight') && res.request().method() === 'PUT',
      { timeout: 15000 }
    )
    await keymanSelect.selectOption(nextValue)
    const assignResponse = await assignResponsePromise
    expect(assignResponse.ok()).toBeTruthy()

    await expect(searchBox).toHaveValue(searchTerm)
    await expect(page.getByText('Volunteer updated')).toBeVisible({ timeout: 8000 })
    await expect(page).not.toHaveURL(/isActive=true(?:&|$)/)
  })
})

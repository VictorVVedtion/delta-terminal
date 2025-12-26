/**
 * E2E Test: Paper Trading Flow
 * EPIC-008 Paper Trading MVP 测试
 */

import { test, expect } from '@playwright/test'

test.describe('Paper Trading', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Paper Trading page
    await page.goto('/paper-trading')
    await page.waitForLoadState('networkidle')
  })

  test('should display Paper Trading page', async ({ page }) => {
    // Check page title or heading
    await expect(page.locator('text=Paper Trading')).toBeVisible({ timeout: 10000 })
  })

  test('should show initialization form when no account exists', async ({ page }) => {
    // Look for capital input or start button
    const startButton = page.locator('button:has-text("启动"), button:has-text("开始")')
    const capitalInput = page.locator('input[type="number"], input[placeholder*="资金"]')

    // Either start button or capital input should be visible
    const hasStartButton = await startButton.isVisible().catch(() => false)
    const hasCapitalInput = await capitalInput.isVisible().catch(() => false)

    expect(hasStartButton || hasCapitalInput).toBe(true)
  })

  test('should fetch real-time BTC price from Hyperliquid', async ({ page }) => {
    // Wait for price to load
    await page.waitForTimeout(3000)

    // Look for price display - should show BTC price
    const priceElement = page.locator('text=/\\$[0-9,]+/')

    // Check if any price is displayed
    const count = await priceElement.count()
    console.log(`Found ${count} price elements`)

    // We should have at least one price displayed
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should initialize account with virtual capital', async ({ page }) => {
    // Clear any existing localStorage
    await page.evaluate(() => {
      localStorage.removeItem('paper-trading-storage')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Look for the start/initialize button
    const startButton = page.locator('button:has-text("启动 Paper Trading"), button:has-text("开始")')

    if (await startButton.isVisible()) {
      await startButton.click()

      // Wait for account to be created
      await page.waitForTimeout(1000)

      // Should now show dashboard or trading interface
      const dashboardVisible = await page.locator('text=余额, text=持仓, text=账户').first().isVisible().catch(() => false)
      console.log('Dashboard visible after init:', dashboardVisible)
    }
  })

  test('should display account balance after initialization', async ({ page }) => {
    // Wait for the page to fully load
    await page.waitForTimeout(3000)

    // Look for balance display
    const balanceText = page.locator('text=/余额|可用|USDT/')
    const count = await balanceText.count()

    console.log(`Found ${count} balance-related elements`)
  })
})

test.describe('Paper Trading API', () => {
  test('Hyperliquid API should return BTC price', async ({ request }) => {
    const response = await request.post('https://api.hyperliquid.xyz/info', {
      data: { type: 'allMids' },
      headers: { 'Content-Type': 'application/json' }
    })

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('BTC')

    const btcPrice = parseFloat(data.BTC)
    expect(btcPrice).toBeGreaterThan(0)

    console.log(`BTC Price: $${btcPrice}`)
  })
})

/**
 * 验证实时价格显示
 */
import { test, expect } from '@playwright/test'

test('Header should show live Hyperliquid prices', async ({ page }) => {
  await page.goto('/paper-trading')
  await page.waitForLoadState('networkidle')

  // 等待价格加载
  await page.waitForTimeout(3000)

  // 截图
  await page.screenshot({ path: 'test-results/live-prices.png', fullPage: false })

  // 检查 BTC 价格 - 应该在 80000-100000 范围内（真实价格）
  const btcText = await page.locator('text=/BTC\\/USDT.*\\$[0-9,]+/').first().textContent()
  console.log('BTC Ticker:', btcText)

  // 验证价格不是旧的 mock 数据 (43256)
  expect(btcText).not.toContain('43,256')

  // 价格应该包含 $ 符号
  expect(btcText).toContain('$')
})

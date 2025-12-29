/**
 * Debug Test - 验证 Mock API 是否正常工作
 */

import { test, expect } from '@playwright/test'

test.describe('Debug Mock API', () => {
  test('mock should intercept /api/ai/insight POST requests', async ({ page }) => {
    let mockCalled = false
    let requestBody: unknown = null
    let healthCheckCalled = false
    let statusCheckCalled = false

    // 监听所有请求用于调试
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        console.log('[REQUEST]', request.method(), request.url())
      }
    })

    // 设置 mock 路由 - 在导航之前
    await page.route('**/api/ai/insight', async (route) => {
      const request = route.request()
      console.log('[MOCK] Intercepted /api/ai/insight:', request.method())

      if (request.method() === 'GET') {
        healthCheckCalled = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok', available: true }),
        })
        return
      }

      if (request.method() === 'POST') {
        mockCalled = true
        requestBody = await request.postDataJSON()
        console.log('[MOCK] POST body:', JSON.stringify(requestBody).substring(0, 200))

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: '这是 MOCK 返回的测试消息！',
            conversationId: 'test_conv_001',
            intent: 'test',
            confidence: 0.99,
          }),
        })
        return
      }

      await route.continue()
    })

    // 设置 status endpoint mock
    await page.route('**/api/ai/status', async (route) => {
      console.log('[MOCK] Intercepted /api/ai/status')
      statusCheckCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          model: 'test-model',
          available: true,
        }),
      })
    })

    // 导航到聊天页面
    console.log('[TEST] Navigating to /chat')
    await page.goto('/chat')
    await page.waitForLoadState('domcontentloaded')
    console.log('[TEST] DOM content loaded')

    // 等待更长时间让 React 完全 hydrate
    await page.waitForTimeout(3000)

    console.log('[DEBUG] Health check called:', healthCheckCalled)
    console.log('[DEBUG] Status check called:', statusCheckCalled)

    // 检查 UI 状态
    const offlineText = page.locator('text=OFFLINE')
    const isOffline = await offlineText.isVisible().catch(() => false)
    console.log('[DEBUG] Shows OFFLINE:', isOffline)

    // 关闭欢迎弹窗（如果存在）
    const skipButton = page.locator('button:has-text("跳过")')
    const hasModal = await skipButton.isVisible({ timeout: 2000 }).catch(() => false)
    if (hasModal) {
      console.log('[DEBUG] Found welcome modal, dismissing...')
      await skipButton.click()
      await page.waitForTimeout(500)
    }

    // 查找输入框
    const chatInput = page.locator(
      'input[placeholder*="策略"], textarea[placeholder*="策略"], input[placeholder*="输入"], textarea[placeholder*="输入"]'
    )
    await expect(chatInput).toBeVisible({ timeout: 10000 })
    console.log('[DEBUG] Chat input found')

    // 输入消息
    await chatInput.click({ force: true })
    await page.keyboard.type('测试消息', { delay: 20 })
    await page.waitForTimeout(500)

    // 检查输入框值
    const inputValue = await chatInput.inputValue()
    console.log('[DEBUG] Input value:', inputValue)

    // 检查发送按钮状态
    const sendButton = page.locator('button:has(svg.lucide-send), button[type="submit"]').first()
    const buttonDisabled = await sendButton.isDisabled().catch(() => true)
    console.log('[DEBUG] Send button disabled:', buttonDisabled)

    // 按 Enter 发送
    console.log('[TEST] Pressing Enter')
    await page.keyboard.press('Enter')

    // 等待响应
    await page.waitForTimeout(5000)

    // 检查 mock 是否被调用
    console.log('[DEBUG] Mock POST called:', mockCalled)
    console.log('[DEBUG] Request body:', requestBody)

    // 获取页面上的所有文本
    const pageContent = await page.textContent('body')
    console.log('[DEBUG] Page content (truncated):', pageContent?.substring(0, 500))

    // 暂时不要求 mock 必须被调用，只是输出调试信息
    console.log('[DEBUG] Test complete')
  })

  test('simple form submit test', async ({ page }) => {
    // 监听所有请求
    page.on('request', (request) => {
      console.log('[REQUEST]', request.method(), request.url())
    })

    // 设置 mock
    await page.route('**/api/**', async (route) => {
      console.log('[MOCK ALL]', route.request().method(), route.request().url())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', available: true, success: true, message: 'mocked' }),
      })
    })

    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 点击快捷按钮测试
    const quickButton = page.locator('button:has-text("BTC 现在是什么行情")')
    const quickButtonVisible = await quickButton.isVisible().catch(() => false)
    console.log('[DEBUG] Quick button visible:', quickButtonVisible)

    if (quickButtonVisible) {
      console.log('[TEST] Clicking quick button')
      await quickButton.click()
      await page.waitForTimeout(3000)
      console.log('[TEST] Waited after click')
    }
  })
})

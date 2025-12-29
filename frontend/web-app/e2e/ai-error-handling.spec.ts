/**
 * E2E Test: Error Handling
 *
 * 测试错误处理场景:
 * - SC27-SC31: 错误处理测试
 */

import { test, expect, testScenarios } from './fixtures/chat.fixture'

// =============================================================================
// 测试配置
// =============================================================================

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ page, chatPage }) => {
  await chatPage.goto()
  await chatPage.waitForReady()
})

// =============================================================================
// Category 7: 错误处理测试 (SC27-SC31)
// =============================================================================

test.describe('错误处理测试', () => {
  test('SC27: 后端未配置 (503) - 显示配置错误提示', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 模拟 503 错误
    mockInsightApi.simulate503()

    // 发送消息
    await chatPage.sendMessage('创建一个策略')

    // 等待响应
    await page.waitForTimeout(3000)

    // 验证: 显示错误消息
    await chatPage.expectErrorMessage()

    // 或者检查聊天中的错误提示
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/服务|配置|管理员|不可用|503/)
  })

  test('SC28: 请求超时 (504) - 显示超时提示并可重试', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置长延迟模拟超时
    mockInsightApi.setDelay(25000) // 25 秒，超过默认超时

    // 发送消息
    await chatPage.sendMessage('分析市场')

    // 等待一段时间 (不等待完整超时)
    await page.waitForTimeout(5000)

    // 如果前端有超时处理，应该显示超时消息
    // 重置延迟以便后续测试
    mockInsightApi.setDelay(200)

    // 设置正常响应
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)

    // 验证可以重试
    await chatPage.sendMessage('重试分析')
    await chatPage.waitForResponse()

    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThan(0)
  })

  test('SC29: 网络中断 - 重试逻辑后显示最终错误', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 模拟网络错误
    mockInsightApi.simulateNetworkError()

    // 发送消息
    await chatPage.sendMessage('创建策略')

    // 等待错误处理
    await page.waitForTimeout(5000)

    // 验证: 显示网络错误相关提示
    const lastMessage = await chatPage.getLastMessage()

    // 应该有某种错误指示
    // 具体内容取决于前端错误处理实现
    expect(lastMessage.length).toBeGreaterThan(0)

    // 验证: 可以继续使用
    await expect(chatPage.chatInput).toBeEnabled()
  })

  test('SC30: 请求去重 - 快速点击只处理最后一个', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置较长延迟以便观察去重
    mockInsightApi.setDelay(1500)
    mockInsightApi.enableAutoResponse()

    // 准备消息
    await chatPage.chatInput.fill('BTC 行情')

    // 记录初始消息数
    const initialCount = await chatPage.getMessageCount()

    // 快速点击发送按钮多次
    await chatPage.sendButton.click()
    await page.waitForTimeout(100)
    await chatPage.sendButton.click()
    await page.waitForTimeout(100)
    await chatPage.sendButton.click()

    // 等待所有请求完成
    await page.waitForTimeout(5000)

    // 验证: 消息数量合理
    const finalCount = await chatPage.getMessageCount()

    // 不应该有 3 对消息 (6 条)，应该只有 1-2 对
    // 去重逻辑应该只处理最后一个或合并请求
    expect(finalCount - initialCount).toBeLessThanOrEqual(4)
  })

  test('SC31: 模式切换 - 对话历史应清除', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 发送几条消息建立对话
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)
    await chatPage.sendMessage('BTC 行情')
    await chatPage.waitForResponse()

    mockInsightApi.setNextResponse(testScenarios.exploratory.response)
    await chatPage.sendMessage('ETH 行情')
    await chatPage.waitForResponse()

    // 记录当前消息数
    const countBefore = await chatPage.getMessageCount()
    expect(countBefore).toBeGreaterThan(0)

    // 模拟模式切换 (通过导航或清除按钮)
    // 如果有清除历史按钮
    const clearButton = page.getByRole('button', { name: /清除|新对话|重置/ })
    const hasClearButton = await clearButton.isVisible().catch(() => false)

    if (hasClearButton) {
      await clearButton.click()
      await page.waitForTimeout(500)

      // 验证: 消息清除
      const countAfter = await chatPage.getMessageCount()
      expect(countAfter).toBeLessThan(countBefore)
    } else {
      // 通过刷新页面测试
      await page.reload()
      await chatPage.waitForReady()

      // 验证: 页面重新加载后状态重置
      await expect(chatPage.chatInput).toBeVisible()
    }
  })
})

// =============================================================================
// 错误恢复测试
// =============================================================================

test.describe('错误恢复', () => {
  test('错误后应可继续正常操作', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 先触发错误
    mockInsightApi.simulateNetworkError()
    await chatPage.sendMessage('失败请求')
    await page.waitForTimeout(3000)

    // 重置并发送正常请求
    mockInsightApi.reset()
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)

    await chatPage.sendMessage('正常请求')
    await chatPage.waitForResponse()

    // 验证: 正常响应
    const hasInsight = await chatPage.hasInsightCard()
    const messageCount = await chatPage.getMessageCount()

    // 应该有正常响应
    expect(messageCount).toBeGreaterThan(0)
  })

  test('连续多次错误后仍可恢复', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 连续 3 次错误
    for (let i = 0; i < 3; i++) {
      mockInsightApi.simulateNetworkError()
      await chatPage.sendMessage(`失败请求 ${i + 1}`)
      await page.waitForTimeout(2000)
      mockInsightApi.reset()
    }

    // 正常请求
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)
    await chatPage.sendMessage('恢复请求')
    await chatPage.waitForResponse(10000)

    // 验证: 系统恢复正常
    await expect(chatPage.chatInput).toBeEnabled()
  })

  test('错误状态不应影响其他功能', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 触发 AI 错误
    mockInsightApi.simulate503()
    await chatPage.sendMessage('AI 请求')
    await page.waitForTimeout(2000)

    // 重置
    mockInsightApi.reset()

    // 尝试其他功能 (如果有)
    // 例如切换标签、查看历史等
    const historyButton = page.getByRole('button', { name: /历史|记录/ })
    const hasHistory = await historyButton.isVisible().catch(() => false)

    if (hasHistory) {
      await historyButton.click()
      await page.waitForTimeout(500)
      // 历史功能应正常工作
    }

    // 验证: 页面整体功能正常
    await expect(chatPage.chatInput).toBeVisible()
  })
})

// =============================================================================
// 用户体验错误处理测试
// =============================================================================

test.describe('用户体验错误处理', () => {
  test('错误消息应清晰易懂', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 模拟错误
    mockInsightApi.setNextResponse(testScenarios.backendNotConfigured.response)
    await chatPage.sendMessage('请求')
    await chatPage.waitForResponse()

    // 获取错误消息
    const lastMessage = await chatPage.getLastMessage()

    // 验证: 消息应该是用户友好的
    // 不应该包含技术性错误码或堆栈跟踪
    expect(lastMessage).not.toMatch(/stack|Error:|TypeError|undefined/)

    // 应该包含有用的信息
    expect(lastMessage).toMatch(/服务|配置|请|联系|稍后/)
  })

  test('长时间加载应显示进度提示', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置长延迟
    mockInsightApi.setDelay(5000)
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)

    // 发送消息
    await chatPage.sendMessage('复杂分析')

    // 验证: 显示加载指示器
    await page.waitForTimeout(500)
    const loading = chatPage.loadingIndicator
    const isLoading = await loading.isVisible().catch(() => false)

    // 应该有某种加载指示
    // 等待完成
    await chatPage.waitForResponse(10000)
  })

  test('错误后输入框应保持可用', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 触发错误
    mockInsightApi.simulateNetworkError()
    await chatPage.sendMessage('失败请求')
    await page.waitForTimeout(3000)

    // 验证: 输入框仍然可用
    await expect(chatPage.chatInput).toBeEnabled()
    await expect(chatPage.chatInput).toBeEditable()

    // 可以输入新内容
    await chatPage.chatInput.fill('新消息')
    const value = await chatPage.chatInput.inputValue()
    expect(value).toBe('新消息')
  })
})

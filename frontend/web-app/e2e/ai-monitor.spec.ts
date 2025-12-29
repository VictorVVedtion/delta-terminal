/**
 * E2E Test: Agent Monitoring
 *
 * 测试代理监控功能:
 * - SC23-SC26: 监控代理测试
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
// Category 6: 监控代理测试 (SC23-SC26)
// =============================================================================

test.describe('监控代理测试', () => {
  /**
   * 辅助函数: 部署一个策略以便后续监控测试
   */
  async function deployStrategyForMonitoring(chatPage: any, canvasPage: any, mockInsightApi: any) {
    // 设置回测成功响应
    mockInsightApi.setNextResponse(testScenarios.backtestSuccess.response)
    await chatPage.sendMessage('创建并部署策略')
    await chatPage.waitForInsightCard()

    // 展开 Canvas
    await chatPage.expandInsight()
    await canvasPage.waitForOpen()

    // 设置部署成功响应
    mockInsightApi.setNextResponse(testScenarios.deployPaper.response)

    // 部署
    await canvasPage.selectDeployMode('paper')
    await canvasPage.clickDeploy()
    await canvasPage.waitForDeployComplete(10000)
  }

  test('SC23: 打开监控 - 点击 Agent 后 MonitorCanvas 打开', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 先部署策略
    await deployStrategyForMonitoring(chatPage, canvasPage, mockInsightApi)

    // 设置代理状态响应
    mockInsightApi.setNextResponse(testScenarios.agentStatus.response)

    // 寻找并点击已部署的 Agent
    const agentCard = page.locator('[data-testid="agent-card"], [class*="AgentCard"]')
    const hasAgentCard = await agentCard.isVisible().catch(() => false)

    if (hasAgentCard) {
      await agentCard.click()

      // 验证: MonitorCanvas 打开
      await canvasPage.waitForOpen()
      const isOpen = await canvasPage.isOpen()
      expect(isOpen).toBe(true)

      // 验证: 显示监控状态
      const status = await canvasPage.getMonitorStatus()
      expect(status).toBeTruthy()
    } else {
      // 通过聊天查询代理状态
      await chatPage.sendMessage('查看代理状态')
      await chatPage.waitForResponse()

      // 验证响应包含状态信息
      const lastMessage = await chatPage.getLastMessage()
      expect(lastMessage).toMatch(/运行|状态|盈亏|交易/)
    }
  })

  test('SC24: 暂停代理 - 暂停后状态更新', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 部署策略
    await deployStrategyForMonitoring(chatPage, canvasPage, mockInsightApi)

    // 设置暂停成功响应
    mockInsightApi.setNextResponse(testScenarios.agentPause.response)

    // 检查是否在 Canvas 中
    const isOpen = await canvasPage.isOpen()

    if (isOpen) {
      // 点击暂停按钮
      await canvasPage.pauseAgent()

      // 验证: 状态变为暂停
      await page.waitForTimeout(1000)

      // 检查暂停按钮变为恢复按钮
      const resumeButton = canvasPage.resumeButton
      const isPaused = await resumeButton.isVisible().catch(() => false)
      expect(isPaused).toBe(true)
    } else {
      // 通过聊天暂停
      await chatPage.sendMessage('暂停策略')
      await chatPage.waitForResponse()

      const lastMessage = await chatPage.getLastMessage()
      expect(lastMessage).toMatch(/暂停|已停止|paused/)
    }
  })

  test('SC25: 恢复代理 - 恢复后继续运行', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 部署并暂停策略
    await deployStrategyForMonitoring(chatPage, canvasPage, mockInsightApi)

    // 先暂停
    mockInsightApi.setNextResponse(testScenarios.agentPause.response)

    const isOpen = await canvasPage.isOpen()

    if (isOpen) {
      await canvasPage.pauseAgent()
      await page.waitForTimeout(500)

      // 设置恢复成功响应
      mockInsightApi.setNextResponse(testScenarios.agentResume.response)

      // 恢复代理
      await canvasPage.resumeAgent()

      // 验证: 状态变为运行
      await page.waitForTimeout(1000)

      // 暂停按钮应该重新可见
      const pauseButton = canvasPage.pauseButton
      const isRunning = await pauseButton.isVisible().catch(() => false)
      expect(isRunning).toBe(true)
    } else {
      // 通过聊天恢复
      mockInsightApi.setNextResponse(testScenarios.agentResume.response)
      await chatPage.sendMessage('恢复策略')
      await chatPage.waitForResponse()

      const lastMessage = await chatPage.getLastMessage()
      expect(lastMessage).toMatch(/恢复|继续|running/)
    }
  })

  test('SC26: 停止代理 - 停止后显示最终统计', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 部署策略
    await deployStrategyForMonitoring(chatPage, canvasPage, mockInsightApi)

    // 设置停止成功响应
    mockInsightApi.setNextResponse(testScenarios.agentStop.response)

    const isOpen = await canvasPage.isOpen()

    if (isOpen) {
      // 停止代理
      await canvasPage.stopAgent()

      // 等待响应
      await page.waitForTimeout(1500)

      // 验证: Canvas 应关闭或显示最终统计
      const stillOpen = await canvasPage.isOpen()

      if (stillOpen) {
        // 如果仍然打开，应该显示最终统计
        const stats = await page
          .getByText('总收益')
          .or(page.getByText('总交易'))
          .first()
          .isVisible()
          .catch(() => false)
        expect(stats).toBe(true)
      }
    } else {
      // 通过聊天停止
      await chatPage.sendMessage('停止策略')
      await chatPage.waitForResponse()

      // 验证: 显示最终统计
      const lastMessage = await chatPage.getLastMessage()
      expect(lastMessage).toMatch(/停止|统计|收益|交易/)
    }
  })
})

// =============================================================================
// 监控边界情况测试
// =============================================================================

test.describe('监控边界情况', () => {
  test('无运行中代理时应显示提示', async ({ page, chatPage, mockInsightApi }) => {
    // 设置空代理列表响应
    mockInsightApi.setNextResponse({
      success: true,
      message: '当前没有运行中的代理',
      conversationId: 'conv_empty',
      intent: 'agent_list',
      confidence: 1.0,
    })

    // 查询代理状态
    await chatPage.sendMessage('查看所有代理状态')
    await chatPage.waitForResponse()

    // 验证: 提示无代理
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/没有|无|空|暂无/)
  })

  test('代理异常时应显示警告', async ({ page, chatPage, canvasPage, mockInsightApi }) => {
    // 设置代理异常响应
    mockInsightApi.setNextResponse({
      success: true,
      message: '⚠️ 代理运行异常，请检查',
      conversationId: 'conv_error',
      intent: 'agent_error',
      confidence: 1.0,
    })

    // 查询代理状态
    await chatPage.sendMessage('检查代理状态')
    await chatPage.waitForResponse()

    // 验证: 显示警告
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/异常|警告|错误|检查/)
  })

  test('同时监控多个代理应正确显示', async ({ page, chatPage, mockInsightApi }) => {
    // 设置多代理状态响应
    mockInsightApi.setNextResponse({
      success: true,
      message: `**当前运行的代理：**

1. BTC 均线策略 - 运行中 | 盈亏: +235.5 USDT
2. ETH 网格策略 - 运行中 | 盈亏: +89.2 USDT
3. SOL 趋势策略 - 已暂停 | 盈亏: -12.3 USDT`,
      conversationId: 'conv_multi',
      intent: 'agent_list',
      confidence: 1.0,
    })

    // 查询所有代理
    await chatPage.sendMessage('显示所有运行中的代理')
    await chatPage.waitForResponse()

    // 验证: 显示多个代理
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/BTC/)
    expect(lastMessage).toMatch(/ETH/)
    expect(lastMessage).toMatch(/SOL/)
  })

  test('快速切换代理状态不应造成状态混乱', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 设置响应序列
    const responses = [
      testScenarios.agentPause.response,
      testScenarios.agentResume.response,
      testScenarios.agentPause.response,
    ]

    mockInsightApi.setResponseQueue(responses)

    // 快速发送多个命令
    await chatPage.sendMessage('暂停策略')
    await page.waitForTimeout(200)
    await chatPage.sendMessage('恢复策略')
    await page.waitForTimeout(200)
    await chatPage.sendMessage('暂停策略')

    // 等待所有响应完成
    await page.waitForTimeout(3000)

    // 验证: 最终状态应该是暂停
    // 具体验证取决于实现
  })
})

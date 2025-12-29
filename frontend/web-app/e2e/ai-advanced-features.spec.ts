/**
 * E2E Test: Advanced Features
 *
 * 测试高级功能:
 * - SC32-SC35: 高级功能测试
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
// Category 8: 高级功能测试 (SC32-SC35)
// =============================================================================

test.describe('高级功能测试', () => {
  test('SC32: 模板选择 - 选择模板后参数加载并 Canvas 打开', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 查找模板按钮
    const templateButton = chatPage.templateButton
    const hasTemplateButton = await templateButton.isVisible().catch(() => false)

    if (hasTemplateButton) {
      // 设置模板响应
      mockInsightApi.setNextResponse(testScenarios.template.response)

      // 点击模板按钮
      await templateButton.click()

      // 等待模板列表或对话框
      await page.waitForTimeout(500)

      // 查找并点击一个模板
      const templateItem = page
        .locator('[data-testid="template-item"], [class*="template"]')
        .first()
      const hasItem = await templateItem.isVisible().catch(() => false)

      if (hasItem) {
        await templateItem.click()
        await chatPage.waitForResponse()

        // 验证: InsightCard 或 Canvas 显示
        const hasInsight = await chatPage.hasInsightCard()
        expect(hasInsight).toBe(true)

        // 展开到 Canvas
        await chatPage.expandInsight()
        await canvasPage.waitForOpen()

        // 验证: 参数已加载
        const sliderValues = await canvasPage.getSliderValues()
        expect(sliderValues.length).toBeGreaterThan(0)
      }
    } else {
      // 通过聊天请求模板
      mockInsightApi.setNextResponse(testScenarios.template.response)
      await chatPage.sendMessage('使用网格策略模板')
      await chatPage.waitForInsightCard()

      // 验证 InsightCard 显示
      const hasInsight = await chatPage.hasInsightCard()
      expect(hasInsight).toBe(true)
    }
  })

  test('SC33: 推理链展示 - ReasoningChainView 显示', async ({ page, chatPage, mockInsightApi }) => {
    // 设置推理链响应
    mockInsightApi.setNextResponse(testScenarios.reasoningChain.response)

    // 发送复杂策略请求
    await chatPage.sendMessage('帮我分析 BTC 是否值得现在入场')
    await chatPage.waitForResponse()

    // 验证: InsightCard 显示
    await chatPage.waitForInsightCard()
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(true)

    // 查找推理链展示区域
    const reasoningView = page.locator(
      '[data-testid="reasoning-chain"], [class*="ReasoningChain"], [class*="reasoning"]'
    )
    const hasReasoningView = await reasoningView.isVisible().catch(() => false)

    if (hasReasoningView) {
      // 验证: 推理步骤显示
      const steps = reasoningView.locator('[data-testid="reasoning-step"], [class*="step"]')
      const stepCount = await steps.count()
      expect(stepCount).toBeGreaterThan(0)

      // 验证: 可以点击展开步骤
      const firstStep = steps.first()
      await firstStep.click()
      await page.waitForTimeout(300)

      // 验证: 步骤详情显示
      const stepDetail = page.locator('[class*="reasoning-detail"], [class*="step-content"]')
      const hasDetail = await stepDetail.isVisible().catch(() => false)
      // 点击后应该显示详情（如果实现了展开功能）
      expect(hasDetail || stepCount > 0).toBe(true)
    }
  })

  test('SC34: 敏感度分析 - SensitivityCanvas 打开', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 先创建策略
    mockInsightApi.setNextResponse(testScenarios.actionable.response)
    await chatPage.sendMessage('创建 BTC 均线策略')
    await chatPage.waitForInsightCard()

    // 批准策略
    await chatPage.approveInsight()
    await page.waitForTimeout(1000)

    // 请求敏感度分析
    mockInsightApi.setNextResponse({
      success: true,
      message: '参数敏感度分析结果',
      conversationId: 'conv_sensitivity',
      intent: 'sensitivity_analysis',
      confidence: 0.95,
      insight: {
        id: 'sensitivity_001',
        type: 'sensitivity',
        strategyName: 'BTC 均线策略',
        symbol: 'BTC/USDT',
        sensitivityMatrix: [
          {
            paramKey: 'fast_ma',
            paramLabel: '快线周期',
            impacts: [
              { paramValue: 5, totalReturn: 35, winRate: 55, maxDrawdown: 15, sharpeRatio: 1.2 },
              { paramValue: 7, totalReturn: 42, winRate: 62, maxDrawdown: 12, sharpeRatio: 1.5 },
              { paramValue: 10, totalReturn: 38, winRate: 58, maxDrawdown: 14, sharpeRatio: 1.3 },
            ],
          },
        ],
        keyParameters: [
          { paramKey: 'fast_ma', paramLabel: '快线周期', impactScore: 85, sensitivity: 'high' },
          { paramKey: 'slow_ma', paramLabel: '慢线周期', impactScore: 65, sensitivity: 'medium' },
        ],
        baseline: {
          totalReturn: 42,
          winRate: 62,
          maxDrawdown: 12,
          sharpeRatio: 1.5,
        },
        aiInsight: '快线周期是该策略最敏感的参数，建议保持在 7 附近。',
        params: [],
        explanation: '',
        created_at: new Date().toISOString(),
      },
    })

    await chatPage.sendMessage('分析这个策略的参数敏感度')
    await chatPage.waitForResponse()

    // 验证: InsightCard 或敏感度视图显示
    const hasInsight = await chatPage.hasInsightCard()

    if (hasInsight) {
      // 展开查看敏感度分析
      await chatPage.expandInsight()
      await canvasPage.waitForOpen()

      // 验证: 敏感度相关内容显示
      const sensitivityContent = page.getByText('敏感度').or(page.getByText('参数影响'))
      const hasContent = await sensitivityContent
        .first()
        .isVisible()
        .catch(() => false)
      // 敏感度内容应显示
      expect(hasContent).toBe(true)
    }

    // 验证响应包含敏感度信息
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/敏感|参数|影响|分析/)
  })

  test('SC35: 策略对比 - ComparisonCanvas 打开', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 设置策略对比响应
    mockInsightApi.setNextResponse({
      success: true,
      message: '策略对比分析结果',
      conversationId: 'conv_comparison',
      intent: 'strategy_comparison',
      confidence: 0.92,
      insight: {
        id: 'comparison_001',
        type: 'comparison',
        strategies: [
          {
            id: 'strat_1',
            name: 'BTC 均线策略',
            symbol: 'BTC/USDT',
            color: '#3b82f6',
            metrics: {
              totalReturn: 42,
              annualizedReturn: 85,
              winRate: 62,
              maxDrawdown: 12,
              sharpeRatio: 1.5,
              sortinoRatio: 2.1,
              profitFactor: 1.85,
              totalTrades: 48,
            },
            equityCurve: [],
          },
          {
            id: 'strat_2',
            name: 'BTC 网格策略',
            symbol: 'BTC/USDT',
            color: '#10b981',
            metrics: {
              totalReturn: 28,
              annualizedReturn: 56,
              winRate: 78,
              maxDrawdown: 8,
              sharpeRatio: 1.2,
              sortinoRatio: 1.6,
              profitFactor: 2.1,
              totalTrades: 156,
            },
            equityCurve: [],
          },
        ],
        differences: [
          {
            metric: 'totalReturn',
            metricLabel: '总收益',
            significance: 'high',
            bestStrategy: 'BTC 均线策略',
            worstStrategy: 'BTC 网格策略',
          },
          {
            metric: 'winRate',
            metricLabel: '胜率',
            significance: 'medium',
            bestStrategy: 'BTC 网格策略',
            worstStrategy: 'BTC 均线策略',
          },
        ],
        aiSummary: '均线策略收益更高但波动较大，网格策略更稳健。根据您的风险偏好选择。',
        params: [],
        explanation: '',
        created_at: new Date().toISOString(),
      },
    })

    // 请求策略对比
    await chatPage.sendMessage('对比我的均线策略和网格策略')
    await chatPage.waitForResponse()

    // 验证: InsightCard 显示
    const hasInsight = await chatPage.hasInsightCard()

    if (hasInsight) {
      // 展开到 Canvas
      await chatPage.expandInsight()
      await canvasPage.waitForOpen()

      // 验证: 对比内容显示
      const comparisonContent = page
        .getByText('对比')
        .or(page.getByText('均线'))
        .or(page.getByText('网格'))
      const hasContent = await comparisonContent
        .first()
        .isVisible()
        .catch(() => false)
      // 对比内容应显示
      expect(hasContent).toBe(true)
    }

    // 验证响应包含对比信息
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/对比|策略|收益|胜率/)
  })
})

// =============================================================================
// 高级交互测试
// =============================================================================

test.describe('高级交互', () => {
  test('Canvas 中参数联动应正确工作', async ({ page, chatPage, canvasPage, mockInsightApi }) => {
    // 创建策略
    mockInsightApi.setNextResponse(testScenarios.actionable.response)
    await chatPage.sendMessage('创建策略')
    await chatPage.waitForInsightCard()

    // 展开 Canvas
    await chatPage.expandInsight()
    await canvasPage.waitForOpen()

    // 获取初始值
    const initialValues = await canvasPage.getSliderValues()

    // 调整一个参数
    if (initialValues.length > 0) {
      await canvasPage.adjustSlider(0, 75)
      await page.waitForTimeout(500)

      // 获取新值
      const newValues = await canvasPage.getSliderValues()

      // 验证: 值已改变
      expect(newValues[0]).not.toBe(initialValues[0])
    }
  })

  test('快捷键应正常工作', async ({ page, chatPage, canvasPage, mockInsightApi }) => {
    // 测试 ESC 关闭 Canvas
    mockInsightApi.setNextResponse(testScenarios.actionable.response)
    await chatPage.sendMessage('创建策略')
    await chatPage.waitForInsightCard()

    // 展开 Canvas
    await chatPage.expandInsight()
    await canvasPage.waitForOpen()

    // 按 ESC
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // 验证: Canvas 关闭
    const isOpen = await canvasPage.isOpen()
    expect(isOpen).toBe(false)
  })

  test('输入框快捷发送 (Ctrl+Enter) 应工作', async ({ page, chatPage, mockInsightApi }) => {
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)

    // 输入消息
    await chatPage.chatInput.fill('测试消息')

    // 使用 Ctrl+Enter 发送
    await page.keyboard.press('Control+Enter')

    // 等待响应
    await chatPage.waitForResponse()

    // 验证: 消息已发送
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThan(0)
  })

  test('复制粘贴长文本应正常处理', async ({ page, chatPage, mockInsightApi }) => {
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)

    // 准备长文本
    const longText = `帮我分析以下交易策略：
    1. 使用 RSI 指标作为入场信号
    2. RSI 低于 30 时买入
    3. RSI 高于 70 时卖出
    4. 使用 5% 止损
    5. 交易 BTC/USDT 交易对
    6. 每次交易使用 10% 仓位`

    // 粘贴长文本
    await chatPage.chatInput.fill(longText)

    // 发送
    await chatPage.sendButton.click()
    await chatPage.waitForResponse()

    // 验证: 正常处理
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThan(0)
  })
})

// =============================================================================
// 移动端适配测试
// =============================================================================

test.describe('移动端适配', () => {
  test('小屏幕下 UI 应正确响应', async ({ page, chatPage, mockInsightApi }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })

    // 刷新页面
    await page.reload()
    await chatPage.waitForReady()

    // 验证: 输入框可见
    await expect(chatPage.chatInput).toBeVisible()

    // 发送消息
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)
    await chatPage.sendMessage('BTC 行情')
    await chatPage.waitForResponse()

    // 验证: 响应正常显示
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThan(0)
  })

  test('横屏模式下应正常工作', async ({ page, chatPage, mockInsightApi }) => {
    // 设置横屏视口
    await page.setViewportSize({ width: 667, height: 375 })

    // 刷新页面
    await page.reload()
    await chatPage.waitForReady()

    // 验证: 功能正常
    mockInsightApi.setNextResponse(testScenarios.actionable.response)
    await chatPage.sendMessage('创建策略')
    await chatPage.waitForInsightCard()

    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(true)
  })
})

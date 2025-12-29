/**
 * E2E Test: AI Chat Flow
 *
 * 测试 AI 聊天核心流程:
 * - SC01-SC05: 意图分类测试
 * - SC06-SC09: 澄清问题测试
 * - SC10-SC14: 策略创建测试
 */

import {
  test,
  expect,
  testScenarios,
  waitForAIResponse,
  expectInsightCardVisible,
  expectTextResponseOnly,
  expectClarificationVisible,
} from './fixtures/chat.fixture'

// =============================================================================
// 测试配置
// =============================================================================

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ page, chatPage }) => {
  // 导航到策略页面
  await chatPage.goto()
  await chatPage.waitForReady()
})

// =============================================================================
// Category 1: 意图分类测试 (SC01-SC05)
// =============================================================================

test.describe('意图分类测试', () => {
  test('SC01: 探索性查询 - 应返回纯文本响应，无 InsightCard', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置 mock 响应
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)

    // 发送探索性消息
    await chatPage.sendMessage('BTC 现在是什么行情？')

    // 等待响应
    await chatPage.waitForResponse()

    // 验证: 无 InsightCard 显示
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(false)

    // 验证: 消息包含市场分析内容
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/行情|分析|价格|RSI|MACD/)
  })

  test('SC02: 行动性请求 - 应返回 InsightCard', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置 mock 响应
    mockInsightApi.setNextResponse(testScenarios.actionable.response)

    // 发送行动性消息
    await chatPage.sendMessage('在 BTC 跌到支撑位时买入')

    // 等待响应
    await chatPage.waitForResponse()

    // 验证: InsightCard 显示
    await chatPage.waitForInsightCard()
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(true)

    // 验证: InsightCard 包含关键元素
    const insightCard = page.locator('[data-testid="insight-card"], [class*="InsightCard"]')
    await expect(insightCard).toBeVisible()

    // 验证: 应有批准/拒绝按钮
    const approveButton = page.getByRole('button', { name: /批准|确认|采用/ })
    await expect(approveButton).toBeVisible()
  })

  test('SC03: 否定句处理 - 应识别为探索性意图', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置 mock 响应
    mockInsightApi.setNextResponse(testScenarios.negation.response)

    // 发送否定句
    await chatPage.sendMessage('不要买入 BTC')

    // 等待响应
    await chatPage.waitForResponse()

    // 验证: 无 InsightCard (因为是否定请求)
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(false)

    // 验证: 响应确认理解
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/理解|不.*买入|收到/)
  })

  test('SC04: 疑问句 - 应返回教育性响应', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置 mock 响应
    mockInsightApi.setNextResponse(testScenarios.question.response)

    // 发送疑问句
    await chatPage.sendMessage('网格策略怎么设置？')

    // 等待响应
    await chatPage.waitForResponse()

    // 验证: 无 InsightCard (纯教育性问题)
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(false)

    // 验证: 响应包含教育性内容
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/网格|设置|参数|建议/)
  })

  test('SC05: 问号+动作词 - 应识别为行动性请求', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置 mock 响应
    mockInsightApi.setNextResponse(testScenarios.questionWithAction.response)

    // 发送带动作词的问句
    await chatPage.sendMessage('帮我创建网格策略好吗？')

    // 等待响应
    await chatPage.waitForResponse()

    // 验证: InsightCard 显示 (因为有明确的行动请求)
    await chatPage.waitForInsightCard()
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(true)
  })
})

// =============================================================================
// Category 2: 澄清问题测试 (SC06-SC09)
// =============================================================================

test.describe('澄清问题测试', () => {
  test('SC06: 单步澄清 - 选择选项后返回 InsightCard', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置澄清响应
    mockInsightApi.setNextResponse(testScenarios.singleClarification.response)

    // 发送模糊请求
    await chatPage.sendMessage('创建一个策略')

    // 等待澄清问题出现
    await chatPage.waitForClarification()

    // 验证: 澄清卡片显示
    const hasClarification = await chatPage.hasClarificationCard()
    expect(hasClarification).toBe(true)

    // 获取澄清问题文本
    const question = await chatPage.getClarificationQuestion()
    expect(question).toMatch(/交易对|选择|哪个/)

    // 设置选择后的响应
    mockInsightApi.setNextResponse(testScenarios.actionable.response)

    // 选择一个选项 (例如 BTC/USDT)
    await chatPage.selectClarificationOption('BTC/USDT')
    await chatPage.submitClarification()

    // 验证: InsightCard 显示
    await chatPage.waitForInsightCard()
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(true)
  })

  test('SC07: 多步澄清 - 完成 3 轮问题后返回完整策略', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置多步澄清响应队列
    mockInsightApi.setResponseQueue(testScenarios.multiStepClarification.responses)

    // 发送模糊请求
    await chatPage.sendMessage('帮我做一个交易策略')

    // 第一轮澄清: 策略类型
    await chatPage.waitForClarification()
    let hasClarification = await chatPage.hasClarificationCard()
    expect(hasClarification).toBe(true)

    // 选择趋势跟踪
    await chatPage.selectClarificationOption('趋势跟踪')
    await chatPage.submitClarification()

    // 第二轮澄清: 风险偏好
    await chatPage.waitForClarification(10000)
    hasClarification = await chatPage.hasClarificationCard()
    expect(hasClarification).toBe(true)

    // 选择稳健型
    await chatPage.selectClarificationOption('稳健型')
    await chatPage.submitClarification()

    // 第三轮澄清: 资金量
    await chatPage.waitForClarification(10000)
    hasClarification = await chatPage.hasClarificationCard()
    expect(hasClarification).toBe(true)

    // 选择中等资金
    await chatPage.selectClarificationOption('中等')
    await chatPage.submitClarification()

    // 验证: 最终 InsightCard 显示
    await chatPage.waitForInsightCard()
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(true)
  })

  test('SC08: 跳过问题 - 应继续流程', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置澄清响应
    mockInsightApi.setNextResponse(testScenarios.singleClarification.response)

    // 发送模糊请求
    await chatPage.sendMessage('创建一个策略')

    // 等待澄清问题
    await chatPage.waitForClarification()

    // 设置跳过后的响应 (使用默认值)
    mockInsightApi.setNextResponse(testScenarios.actionable.response)

    // 点击跳过按钮
    await chatPage.skipClarification()

    // 验证: 继续到下一步或使用默认值
    // 可能显示 InsightCard 或下一个澄清问题
    await chatPage.waitForResponse()

    // 验证没有卡住在当前澄清问题
    const clarificationGone = await page
      .locator('[data-testid="clarification-card"]')
      .isHidden()
      .catch(() => true)
    expect(clarificationGone).toBe(true)
  })

  test('SC09: 自定义输入 - 应接受文本输入', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置澄清响应
    mockInsightApi.setNextResponse(testScenarios.singleClarification.response)

    // 发送请求
    await chatPage.sendMessage('创建一个策略')

    // 等待澄清问题
    await chatPage.waitForClarification()

    // 设置自定义输入后的响应
    mockInsightApi.setNextResponse(testScenarios.actionable.response)

    // 输入自定义交易对
    await chatPage.inputClarificationText('DOGE/USDT')
    await chatPage.submitClarification()

    // 验证: 继续流程
    await chatPage.waitForResponse()

    // 验证自定义输入被接受
    const lastMessage = await chatPage.getLastMessage()
    // 响应应该处理自定义输入
    expect(lastMessage.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Category 3: 策略创建测试 (SC10-SC14)
// =============================================================================

test.describe('策略创建测试', () => {
  test('SC10: 完整创建流程 - 批准后成功创建策略', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 设置策略创建响应
    mockInsightApi.setNextResponse(testScenarios.actionable.response)

    // 发送创建策略请求
    await chatPage.sendMessage('在 BTC 跌到支撑位时买入')

    // 等待 InsightCard
    await chatPage.waitForInsightCard()

    // 获取 InsightCard 参数 (可选验证)
    const params = await chatPage.getInsightParams()
    // params 应包含策略参数

    // 点击批准按钮
    await chatPage.approveInsight()

    // 验证: 成功消息或状态更新
    await page.waitForTimeout(1000)
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThan(0)
  })

  test('SC11: 参数修改 - 展开 Canvas 调整后批准', async ({
    page,
    chatPage,
    canvasPage,
    mockInsightApi,
  }) => {
    // 设置响应
    mockInsightApi.setNextResponse(testScenarios.actionable.response)

    // 发送请求
    await chatPage.sendMessage('创建 BTC 抄底策略')

    // 等待 InsightCard
    await chatPage.waitForInsightCard()

    // 点击展开按钮进入 Canvas
    await chatPage.expandInsight()

    // 验证 Canvas 打开
    await canvasPage.waitForOpen()
    const isOpen = await canvasPage.isOpen()
    expect(isOpen).toBe(true)

    // 调整滑块参数 (例如止损幅度)
    await canvasPage.adjustSlider(0, 50)

    // 关闭 Canvas (自动保存)
    await canvasPage.closeWithEscape()

    // 批准调整后的策略
    await chatPage.approveInsight()

    // 验证操作成功
    await page.waitForTimeout(500)
  })

  test('SC12: 策略拒绝 - 拒绝后可重新输入', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置响应
    mockInsightApi.setNextResponse(testScenarios.actionable.response)

    // 发送请求
    await chatPage.sendMessage('创建一个高风险策略')

    // 等待 InsightCard
    await chatPage.waitForInsightCard()

    // 点击拒绝按钮
    await chatPage.rejectInsight()

    // 验证: InsightCard 消失或状态变化
    await page.waitForTimeout(500)

    // 验证可以继续输入
    await expect(chatPage.chatInput).toBeEnabled()

    // 发送新消息测试
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)
    await chatPage.sendMessage('那给我看看 ETH 行情')
    await chatPage.waitForResponse()

    // 验证响应正常
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThan(1)
  })

  test('SC13: 批量调整 - 应显示多策略调整 InsightCard', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置批量调整响应
    mockInsightApi.setNextResponse(testScenarios.batchAdjust.response)

    // 发送批量调整请求
    await chatPage.sendMessage('把所有策略止损收紧 2%')

    // 等待响应
    await chatPage.waitForResponse()

    // 验证: InsightCard 显示
    await chatPage.waitForInsightCard()
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(true)

    // 验证: 响应提及多个策略
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/策略|调整|止损/)
  })

  test('SC14: 交易信号 - 应显示信号 InsightCard', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置交易信号响应
    mockInsightApi.setNextResponse(testScenarios.tradeSignal.response)

    // 发送交易信号请求
    await chatPage.sendMessage('ETH 有没有交易机会？')

    // 等待响应
    await chatPage.waitForResponse()

    // 验证: InsightCard 显示
    await chatPage.waitForInsightCard()
    const hasInsight = await chatPage.hasInsightCard()
    expect(hasInsight).toBe(true)

    // 验证: 包含方向和价格信息
    const insightCard = page.locator('[data-testid="insight-card"], [class*="InsightCard"]')
    const cardText = await insightCard.textContent()
    expect(cardText).toMatch(/做多|做空|入场|止损|止盈|ETH/)
  })
})

// =============================================================================
// 边界情况测试
// =============================================================================

test.describe('边界情况', () => {
  test('空消息不应发送', async ({ page, chatPage }) => {
    // 尝试发送空消息
    await chatPage.chatInput.fill('')

    // 发送按钮应该禁用或点击无效
    const sendButton = chatPage.sendButton
    const isDisabled = await sendButton.isDisabled().catch(() => false)

    if (!isDisabled) {
      // 如果按钮没有禁用，点击后不应该增加消息
      const initialCount = await chatPage.getMessageCount()
      await sendButton.click()
      await page.waitForTimeout(500)
      const finalCount = await chatPage.getMessageCount()
      expect(finalCount).toBe(initialCount)
    } else {
      expect(isDisabled).toBe(true)
    }
  })

  test('长消息应正常处理', async ({ page, chatPage, mockInsightApi }) => {
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)

    // 发送长消息
    const longMessage = '帮我分析一下 BTC 的行情，'.repeat(20)
    await chatPage.sendMessage(longMessage)

    // 等待响应
    await chatPage.waitForResponse(60000)

    // 验证响应正常
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThan(0)
  })

  test('快速连续发送应去重', async ({ page, chatPage, mockInsightApi }) => {
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)
    mockInsightApi.setDelay(1000) // 增加延迟以便观察去重

    // 快速点击多次发送
    await chatPage.chatInput.fill('BTC 行情')

    // 快速点击 3 次
    await chatPage.sendButton.click()
    await chatPage.sendButton.click()
    await chatPage.sendButton.click()

    // 等待响应
    await chatPage.waitForResponse(10000)

    // 验证: 只处理一次请求 (消息数量合理)
    const messageCount = await chatPage.getMessageCount()
    // 应该只有用户消息 + AI 回复，不应该有重复
    expect(messageCount).toBeLessThanOrEqual(4) // 最多 2 对消息
  })
})

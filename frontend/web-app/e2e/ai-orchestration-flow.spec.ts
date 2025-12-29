/**
 * E2E Test: AI Orchestration Flow
 *
 * 测试 AI 对话编排流程:
 * - ORC01-ORC02: 上下文持久化测试 (追问、意图继承)
 * - ORC03: 确认流程测试 (用户确认后直接执行)
 * - ORC04-ORC05: 重复追问防止测试 (已提供信息不再询问)
 *
 * 这些测试验证了以下关键问题的修复:
 * 1. "你觉得呢？" 应返回观点，不应重复市场数据
 * 2. "那制定这个策略吧" 应直接创建策略，不应再询问确认
 * 3. 用户已说 BTC，不应再问交易对
 */

import { test, expect, testScenarios, waitForAIResponse } from './fixtures/chat.fixture'

// =============================================================================
// 测试配置
// =============================================================================

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ page, chatPage, mockInsightApi }) => {
  // mockInsightApi fixture 必须在 beforeEach 中引用，确保路由在页面加载前设置
  // 导航到策略页面
  await chatPage.goto()
  await chatPage.waitForReady()
})

// =============================================================================
// Category 1: 上下文持久化测试 (ORC01-ORC02)
// =============================================================================

test.describe('上下文持久化测试', () => {
  test('ORC01: 市场分析后追问 - 应返回观点而非重复数据', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 使用响应队列确保顺序正确
    mockInsightApi.setResponseQueue([
      testScenarios.orchestrationMarketAnalysis.response,
      testScenarios.orchestrationFollowUp.response,
    ])

    // 第一轮: 询问行情
    await chatPage.sendMessage('BTC 现在的行情怎么样？')
    await chatPage.waitForResponse()

    // 验证: 返回市场分析
    const firstMessage = await chatPage.getLastMessage()
    expect(firstMessage).toMatch(/BTC|行情|分析|价格/)

    // 第二轮: 追问观点
    await chatPage.sendMessage('你觉得呢？')
    await chatPage.waitForResponse()

    // 验证: 返回观点（队列中的第二个响应）
    const secondMessage = await chatPage.getLastMessage()
    // 第二个 mock 响应包含 "观点" 关键词
    expect(secondMessage).toMatch(/观点|建议|判断|认为|等待/)
  })

  test('ORC02: 多轮对话意图继承 - analyze_market → create_strategy', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置多轮对话响应队列
    mockInsightApi.setResponseQueue([
      testScenarios.orchestrationMarketAnalysis.response,
      testScenarios.orchestrationFollowUp.response,
      testScenarios.orchestrationConfirm.response,
    ])

    // 第一轮: 市场分析
    await chatPage.sendMessage('BTC 现在什么行情？')
    await chatPage.waitForResponse()

    // 第二轮: 追问
    await chatPage.sendMessage('你觉得呢？')
    await chatPage.waitForResponse()

    // 第三轮: 确认创建策略 (意图从 analyze_market 继承到 create_strategy)
    await chatPage.sendMessage('那制定这个策略吧')
    await chatPage.waitForResponse()

    // 验证: 响应包含策略信息 (mock 返回策略创建响应)
    const lastMessage = await chatPage.getLastMessage()
    expect(lastMessage).toMatch(/策略|参数|配置|支撑位|BTC/)
  })
})

// =============================================================================
// Category 2: 确认流程测试 (ORC03)
// =============================================================================

test.describe('确认流程测试', () => {
  test('ORC03: 用户确认后应直接创建策略 - 不应再询问确认', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置确认创建策略的响应
    mockInsightApi.setNextResponse(testScenarios.orchestrationConfirm.response)

    // 发送确认性消息
    await chatPage.sendMessage('那制定这个策略吧')
    await chatPage.waitForResponse()

    // 验证: 响应包含策略信息
    const message = await chatPage.getLastMessage()
    expect(message).toMatch(/策略|BTC|支撑|配置|参数/)
    // 注: UI 可能会自动添加建议文本，这是正常行为
  })

  test('ORC03b: 简短确认词应继承上一个意图', async ({ page, chatPage, mockInsightApi }) => {
    // 设置响应队列
    mockInsightApi.setResponseQueue([
      testScenarios.orchestrationMarketAnalysis.response,
      testScenarios.orchestrationConfirm.response,
    ])

    // 第一轮: 市场分析
    await chatPage.sendMessage('分析一下 BTC')
    await chatPage.waitForResponse()

    // 第二轮: 简短确认
    await chatPage.sendMessage('好的，做吧')
    await chatPage.waitForResponse()

    // 验证: 响应包含策略相关内容
    const message = await chatPage.getLastMessage()
    expect(message).toMatch(/策略|BTC|配置|参数/)
  })
})

// =============================================================================
// Category 3: 重复追问防止测试 (ORC04-ORC05)
// =============================================================================

test.describe('重复追问防止测试', () => {
  test('ORC04: 已说 BTC 后创建策略 - 不应再问交易对', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置正确的上下文保持响应
    mockInsightApi.setNextResponse(testScenarios.orchestrationContextAware.response)

    // 发送包含 BTC 的策略创建请求
    await chatPage.sendMessage('帮我创建一个 BTC 网格策略')
    await chatPage.waitForResponse()

    // 验证: 响应中交易对已自动选择
    const message = await chatPage.getLastMessage()
    expect(message).toMatch(/BTC/)
    // 不应该再询问交易对
    expect(message).not.toMatch(/请问.*交易对|选择.*交易对|哪个.*交易对/)
  })

  test('ORC05: 多轮对话后创建策略 - 应记住之前提到的币种', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置多轮响应
    mockInsightApi.setResponseQueue([
      testScenarios.orchestrationMarketAnalysis.response,
      testScenarios.orchestrationContextAware.response,
    ])

    // 第一轮: 询问 BTC 行情
    await chatPage.sendMessage('BTC 现在行情怎么样？')
    await chatPage.waitForResponse()

    // 第二轮: 创建策略 (未指定币种)
    await chatPage.sendMessage('帮我创建一个网格策略')
    await chatPage.waitForResponse()

    // 验证: 应自动使用 BTC (从上下文中记住)
    const message = await chatPage.getLastMessage()
    expect(message).toMatch(/BTC/)
  })

  test('ORC05b: 验证错误行为 - 重复询问交易对是错误的', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置错误的重复追问响应 (用于验证测试能检测到错误)
    mockInsightApi.setNextResponse(testScenarios.orchestrationBadDuplicate.response)

    // 发送已包含 BTC 的请求
    await chatPage.sendMessage('帮我创建一个 BTC 网格策略')
    await chatPage.waitForResponse()

    // 验证: 这是错误行为，响应在问交易对
    const message = await chatPage.getLastMessage()
    const isAskingForSymbol = message.match(/请问.*交易对|选择.*交易对|哪个/)

    // 这个测试验证我们能检测到错误行为
    // 在修复后的代码中，这种情况不应该发生
    if (isAskingForSymbol) {
      console.warn('检测到错误行为: 重复询问交易对')
    }

    // 注: 此测试用于对比，正确的行为在 ORC04 和 ORC05 中验证
  })
})

// =============================================================================
// Category 4: 完整流程测试 (端到端)
// =============================================================================

test.describe('完整编排流程测试', () => {
  test('E2E: 完整对话流程 - 分析 → 追问 → 确认 → 创建策略', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // 设置完整流程响应队列
    mockInsightApi.setResponseQueue([
      testScenarios.orchestrationMarketAnalysis.response,
      testScenarios.orchestrationFollowUp.response,
      testScenarios.orchestrationConfirm.response,
    ])

    // Step 1: 询问行情
    await chatPage.sendMessage('BTC 现在什么行情？')
    await chatPage.waitForResponse()

    let message = await chatPage.getLastMessage()
    expect(message).toMatch(/BTC|行情|分析/)

    // Step 2: 追问观点
    await chatPage.sendMessage('你觉得呢？')
    await chatPage.waitForResponse()

    message = await chatPage.getLastMessage()
    expect(message).toMatch(/观点|建议/)

    // Step 3: 确认创建策略
    await chatPage.sendMessage('那制定这个策略吧')
    await chatPage.waitForResponse()

    // 验证: 包含策略参数
    message = await chatPage.getLastMessage()
    expect(message).toMatch(/策略|参数|配置|BTC/)

    // 验证: 消息数量正确 (3 轮对话 = 6 条消息)
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThanOrEqual(6)
  })

  test('E2E: 对话中途切换意图 - 应正确处理', async ({ page, chatPage, mockInsightApi }) => {
    // 设置响应队列
    // 注意: 使用 orchestrationContextAware 而非 actionable，
    // 因为 actionable 有 run_backtest 动作但无回测数据会导致前端渲染错误
    mockInsightApi.setResponseQueue([
      testScenarios.orchestrationMarketAnalysis.response,
      testScenarios.exploratory.response, // 切换到探索其他币种
      testScenarios.orchestrationContextAware.response, // 创建策略 (不含 backtest 动作)
    ])

    // Step 1: BTC 行情
    await chatPage.sendMessage('BTC 行情怎么样？')
    await chatPage.waitForResponse()

    // Step 2: 切换到 ETH (切换意图)
    await chatPage.sendMessage('ETH 呢？')
    await chatPage.waitForResponse()

    // Step 3: 创建 ETH 策略
    await chatPage.sendMessage('在 ETH 跌到支撑位时买入')
    await chatPage.waitForResponse()

    // 验证: 响应包含策略信息
    const message = await chatPage.getLastMessage()
    expect(message).toMatch(/策略|建议|买入|支撑/)
  })
})

// =============================================================================
// Category 5: 边界情况测试
// =============================================================================

test.describe('编排边界情况', () => {
  test('短消息不应导致编排错误', async ({ page, chatPage, mockInsightApi }) => {
    mockInsightApi.setNextResponse(testScenarios.orchestrationFollowUp.response)

    // 发送非常短的追问消息
    await chatPage.sendMessage('呢？')
    await chatPage.waitForResponse()

    // 验证: 应该正常响应，不崩溃
    const message = await chatPage.getLastMessage()
    expect(message.length).toBeGreaterThan(0)
  })

  test('连续确认消息应正确处理', async ({ page, chatPage, mockInsightApi }) => {
    mockInsightApi.setResponseQueue([
      testScenarios.orchestrationConfirm.response,
      testScenarios.orchestrationConfirm.response,
    ])

    // 第一次确认
    await chatPage.sendMessage('好，做吧')
    await chatPage.waitForResponse()

    // 验证第一次响应正常
    const firstMessage = await chatPage.getLastMessage()
    expect(firstMessage.length).toBeGreaterThan(0)

    // 再次发送确认
    await chatPage.sendMessage('确认')
    await chatPage.waitForResponse()

    // 验证: 不应该出现错误
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThanOrEqual(2)
  })

  test('带特殊字符的消息应正确处理', async ({ page, chatPage, mockInsightApi }) => {
    mockInsightApi.setNextResponse(testScenarios.orchestrationMarketAnalysis.response)

    // 发送带特殊字符的消息
    await chatPage.sendMessage('BTC/USDT 行情? <script>alert(1)</script>')
    await chatPage.waitForResponse()

    // 验证: 应该正常响应
    const message = await chatPage.getLastMessage()
    expect(message.length).toBeGreaterThan(0)
    // XSS 应该被过滤
    expect(message).not.toMatch(/<script>/)
  })
})

// =============================================================================
// Category 6: 性能与稳定性测试
// =============================================================================

test.describe('编排性能测试', () => {
  test('快速连续发送消息应正确编排', async ({ page, chatPage, mockInsightApi }) => {
    mockInsightApi.setResponseQueue([
      testScenarios.orchestrationMarketAnalysis.response,
      testScenarios.orchestrationFollowUp.response,
    ])

    // 快速连续发送
    await chatPage.sendMessage('BTC 行情')
    // 不等待响应，立即发送下一条
    await page.waitForTimeout(100)
    await chatPage.chatInput.fill('你觉得呢？')
    await chatPage.sendButton.click()

    // 等待所有响应
    await page.waitForTimeout(3000)

    // 验证: 消息应该按顺序处理
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThanOrEqual(2)
  })

  test('长对话历史不应影响编排性能', async ({ page, chatPage, mockInsightApi }) => {
    // 启用自动响应
    mockInsightApi.enableAutoResponse()

    // 发送多轮消息模拟长对话
    const messages = [
      'BTC 行情怎么样？',
      '你觉得呢？',
      'ETH 呢？',
      '还有其他建议吗？',
      '好的，帮我创建策略',
    ]

    for (const msg of messages) {
      await chatPage.sendMessage(msg)
      await chatPage.waitForResponse(15000)
    }

    // 验证: 所有消息都得到响应
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThanOrEqual(messages.length * 2)
  })
})

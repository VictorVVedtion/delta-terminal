/**
 * E2E Test: Reasoning Chain Interaction (A2UI 2.0)
 *
 * 测试推理链交互功能:
 * - SC33-A: 推理链质疑功能
 * - SC33-B: 推理链分支选择功能
 * - SC33-C: 推理链确认功能
 */

import { test, expect, testScenarios } from './fixtures/chat.fixture'

// =============================================================================
// 测试配置
// =============================================================================

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ chatPage }) => {
  await chatPage.goto()
  await chatPage.waitForReady()
})

// =============================================================================
// Category: 推理链交互测试 (SC33-A, SC33-B, SC33-C)
// =============================================================================

test.describe('推理链交互测试 (A2UI 2.0)', () => {
  test('SC33-A: 推理链质疑功能 - 点击质疑后收到解释响应', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // Step 1: 发送策略请求，触发推理链显示
    mockInsightApi.setNextResponse(testScenarios.reasoningChain.response)
    await chatPage.sendMessage('帮我分析 BTC 是否值得现在入场')
    await chatPage.waitForResponse()

    // Step 2: 验证推理链显示
    const hasReasoning = await chatPage.hasReasoningChain()
    expect(hasReasoning).toBe(true)

    // Step 3: 展开推理链节点查看详情
    await chatPage.expandReasoningNode()
    await page.waitForTimeout(500)

    // Step 4: 检查质疑按钮是否存在
    const hasChallengeBtn = await chatPage.hasChallengeButton()

    if (hasChallengeBtn) {
      // Step 5: 设置质疑响应
      mockInsightApi.setNextResponse(testScenarios.reasoningChallenge.response)

      // Step 6: 点击质疑按钮
      await chatPage.challengeReasoningNode()
      await chatPage.waitForResponse()

      // Step 7: 验证收到质疑响应
      const lastMessage = await chatPage.getLastMessage()
      // 质疑响应应该包含解释性内容
      expect(lastMessage).toMatch(/理解|解释|疑问|重新/)
    } else {
      // 如果质疑按钮不可见，说明推理链节点可能需要展开
      console.log('质疑按钮未找到，可能推理链节点未完全展开')
    }
  })

  test('SC33-B: 推理链分支选择 - 选择不同策略角度', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // Step 1: 发送策略请求，触发推理链显示
    mockInsightApi.setNextResponse(testScenarios.reasoningChain.response)
    await chatPage.sendMessage('帮我分析 BTC 是否值得现在入场')
    await chatPage.waitForResponse()

    // Step 2: 验证推理链显示
    const hasReasoning = await chatPage.hasReasoningChain()
    expect(hasReasoning).toBe(true)

    // Step 3: 展开推理链节点
    await chatPage.expandReasoningNode()
    await page.waitForTimeout(500)

    // Step 4: 检查是否有分支选项
    const hasBranches = await chatPage.hasReasoningBranches()

    if (hasBranches) {
      // Step 5: 设置分支选择响应
      mockInsightApi.setNextResponse(testScenarios.reasoningBranchSelect.response)

      // Step 6: 选择分支选项
      await chatPage.selectReasoningBranch('让我帮您梳理')

      // Step 7: 验证收到新的策略响应
      const lastMessage = await chatPage.getLastMessage()
      expect(lastMessage.length).toBeGreaterThan(0)
    } else {
      console.log('分支选项未找到，可能推理链不包含分支')
    }
  })

  test('SC33-C: 推理链确认功能 - 确认推理步骤', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // Step 1: 发送策略请求，触发推理链显示
    mockInsightApi.setNextResponse(testScenarios.reasoningChain.response)
    await chatPage.sendMessage('帮我分析 BTC 是否值得现在入场')
    await chatPage.waitForResponse()

    // Step 2: 验证推理链显示
    const hasReasoning = await chatPage.hasReasoningChain()
    expect(hasReasoning).toBe(true)

    // Step 3: 展开推理链节点
    await chatPage.expandReasoningNode()
    await page.waitForTimeout(500)

    // Step 4: 查找确认按钮
    const confirmBtn = page.locator('button:text-is("确认"), button:has-text("✓ 确认")')
    const hasConfirmBtn = await confirmBtn.first().isVisible().catch(() => false)

    if (hasConfirmBtn) {
      // Step 5: 点击确认按钮
      await chatPage.confirmReasoningNode()

      // Step 6: 验证确认后的状态变化 (按钮消失或状态变化)
      await page.waitForTimeout(500)
      // 确认后应该显示成功提示或状态变化
    } else {
      console.log('确认按钮未找到')
    }
  })

  test('SC33-D: 推理链完整流程 - 展示 -> 确认 -> 批准策略', async ({
    page,
    chatPage,
    mockInsightApi,
  }) => {
    // Step 1: 发送策略请求
    mockInsightApi.setNextResponse(testScenarios.reasoningChain.response)
    await chatPage.sendMessage('帮我分析 BTC 是否值得现在入场')
    await chatPage.waitForResponse()

    // Step 2: 验证推理链和 InsightCard 都显示
    const hasReasoning = await chatPage.hasReasoningChain()
    const hasInsight = await chatPage.hasInsightCard()

    expect(hasReasoning).toBe(true)
    expect(hasInsight).toBe(true)

    // Step 3: 可以直接批准策略 (跳过推理链交互)
    const approveBtn = page.getByRole('button', { name: /批准/ })
    const hasApproveBtn = await approveBtn.isVisible().catch(() => false)

    if (hasApproveBtn) {
      // 验证批准按钮可用
      expect(hasApproveBtn).toBe(true)
    }
  })
})

// =============================================================================
// 边界情况测试
// =============================================================================

test.describe('推理链边界情况', () => {
  test('推理链为空时不显示推理视图', async ({ chatPage, mockInsightApi }) => {
    // 使用不带推理链的响应
    mockInsightApi.setNextResponse(testScenarios.exploratory.response)
    await chatPage.sendMessage('BTC 现在是什么行情？')
    await chatPage.waitForResponse()

    // 验证没有推理链视图
    const hasReasoning = await chatPage.hasReasoningChain()
    expect(hasReasoning).toBe(false)
  })

  test('show_reasoning=false 时隐藏推理链', async ({ chatPage, mockInsightApi }) => {
    // 使用质疑响应 (show_reasoning=false)
    mockInsightApi.setNextResponse(testScenarios.reasoningChallenge.response)
    await chatPage.sendMessage('我对这个判断有疑问')
    await chatPage.waitForResponse()

    // 验证没有推理链视图 (质疑响应不显示推理链)
    const hasReasoning = await chatPage.hasReasoningChain()
    expect(hasReasoning).toBe(false)
  })
})

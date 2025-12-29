/**
 * ChatPage - 策略页面 Page Object
 *
 * 封装 /strategies 页面的所有交互操作
 */

import { expect, type Locator, type Page } from '@playwright/test'

export class ChatPage {
  readonly page: Page

  // 核心元素定位器
  readonly chatInput: Locator
  readonly sendButton: Locator
  readonly messageList: Locator
  readonly quickPrompts: Locator
  readonly templateButton: Locator

  // InsightCard 相关
  readonly insightCard: Locator
  readonly approveButton: Locator
  readonly rejectButton: Locator
  readonly expandButton: Locator

  // ClarificationCard 相关
  readonly clarificationCard: Locator
  readonly clarificationOptions: Locator
  readonly clarificationSubmit: Locator
  readonly clarificationSkip: Locator
  readonly clarificationInput: Locator

  // ReasoningChain 相关 (A2UI 2.0)
  readonly reasoningChainView: Locator
  readonly reasoningNode: Locator
  readonly reasoningConfirmButton: Locator
  readonly reasoningChallengeButton: Locator
  readonly reasoningBranchOption: Locator

  // Canvas 相关
  readonly canvas: Locator
  readonly canvasPanel: Locator

  // 加载状态
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    this.page = page

    // 聊天输入区域 (可以是 input 或 textarea)
    this.chatInput = page.locator(
      'input[placeholder*="策略"], textarea[placeholder*="策略"], input[placeholder*="输入"], textarea[placeholder*="输入"]'
    )
    // 发送按钮 (可能是图标按钮)
    this.sendButton = page
      .locator('button[type="submit"], button:has(svg.lucide-send), form button')
      .first()
    this.messageList = page.locator('[class*="message"], [data-testid="message-list"]')
    this.quickPrompts = page.locator('[data-testid="quick-prompts"], button:has-text("从模板")')
    this.templateButton = page.getByRole('button', { name: /从模板开始/ })

    // InsightCard
    this.insightCard = page.locator('[data-testid="insight-card"], [class*="InsightCard"]')
    this.approveButton = page.getByRole('button', { name: /批准|确认|采用/ })
    this.rejectButton = page.getByRole('button', { name: /拒绝|取消|放弃/ })
    this.expandButton = page.getByRole('button', { name: /展开|详情|调整/ })

    // ClarificationCard
    this.clarificationCard = page.locator(
      '[data-testid="clarification-card"], [class*="Clarification"]'
    )
    this.clarificationOptions = page.locator(
      '[data-testid="clarification-option"], [class*="option"]'
    )
    this.clarificationSubmit = page.getByRole('button', { name: /提交|确定|下一步/ })
    this.clarificationSkip = page.getByRole('button', { name: /跳过/ })
    this.clarificationInput = page.locator(
      '[data-testid="clarification-input"], input[type="text"], textarea'
    )

    // ReasoningChain (A2UI 2.0)
    this.reasoningChainView = page.locator(
      '[data-testid="reasoning-chain"], [class*="ReasoningChain"], [class*="AI 推理过程"], :text("AI 推理过程")'
    )
    this.reasoningNode = page.locator(
      '[data-testid="reasoning-node"], [class*="reasoning-node"], [class*="ReasoningNode"]'
    )
    this.reasoningConfirmButton = page.getByRole('button', { name: /确认/ }).first()
    this.reasoningChallengeButton = page.getByRole('button', { name: /质疑/ })
    this.reasoningBranchOption = page.locator(
      '[data-testid="reasoning-branch"], [class*="branch-option"], [class*="其他可能"]'
    )

    // Canvas
    this.canvas = page.locator('[data-testid="canvas"], [class*="Canvas"], [aria-label*="Canvas"]')
    this.canvasPanel = page.locator('[data-testid="canvas-panel"], [class*="CanvasPanel"]')

    // 加载状态
    this.loadingIndicator = page.locator(
      '[data-testid="loading"], [class*="loading"], [class*="spinner"]'
    )
  }

  // ==========================================================================
  // 导航方法
  // ==========================================================================

  /**
   * 导航到聊天页面
   */
  async goto() {
    await this.page.goto('/chat')
    await this.page.waitForLoadState('domcontentloaded')
    // 等待 React 完全 hydrate
    await this.page.waitForTimeout(2000)
  }

  /**
   * 关闭欢迎引导弹窗（如果存在）
   */
  async dismissWelcomeModal() {
    try {
      // 查找"跳过"按钮（欢迎弹窗中的）
      const skipButton = this.page.locator('button:has-text("跳过")')
      const isVisible = await skipButton.isVisible({ timeout: 2000 }).catch(() => false)
      if (isVisible) {
        await skipButton.click()
        // 等待弹窗消失
        await this.page.waitForTimeout(500)
      }
    } catch {
      // 没有欢迎弹窗，继续
    }
  }

  /**
   * 等待页面完全加载
   */
  async waitForReady() {
    // 先关闭可能出现的欢迎引导弹窗
    await this.dismissWelcomeModal()

    // 等待输入框可见
    await expect(this.chatInput).toBeVisible({ timeout: 10000 })

    // 等待发送按钮启用（表示可以发送消息）
    // 注意：即使后端离线，输入框也可以使用，只是会显示错误消息
    await this.page.waitForTimeout(500)
  }

  // ==========================================================================
  // 聊天交互方法
  // ==========================================================================

  /**
   * 发送消息
   */
  async sendMessage(message: string) {
    // 聚焦输入框 - 使用 force: true 避免覆盖层问题
    await this.chatInput.click({ force: true })

    // 清空输入框 - 使用 triple click 选中所有文本然后删除
    await this.chatInput.click({ clickCount: 3, force: true })
    await this.page.keyboard.press('Backspace')

    // 使用键盘真实输入触发 React onChange
    await this.page.keyboard.type(message, { delay: 5 })

    // 等待 React 状态更新
    await this.page.waitForTimeout(200)

    // 发送 - 直接按 Enter 键提交表单
    await this.page.keyboard.press('Enter')

    // 等待表单提交处理
    await this.page.waitForTimeout(100)
  }

  /**
   * 等待 AI 响应完成
   */
  async waitForResponse(timeout = 30000) {
    // 等待加载指示器消失
    try {
      await expect(this.loadingIndicator).toBeVisible({ timeout: 5000 })
      await expect(this.loadingIndicator).not.toBeVisible({ timeout: timeout })
    } catch {
      // 加载指示器可能很快消失，忽略
    }
    // 额外等待确保响应渲染
    await this.page.waitForTimeout(500)
  }

  /**
   * 获取最后一条 AI 消息内容
   * 只匹配 AI 响应（bg-card），排除用户消息（bg-primary）
   */
  async getLastMessage(): Promise<string> {
    // AI 消息有 bg-card 类，用户消息有 bg-primary 类
    const aiMessages = await this.page.locator('.rounded-2xl.bg-card').all()
    if (aiMessages.length > 0) {
      const lastAiMessage = aiMessages[aiMessages.length - 1]
      return (await lastAiMessage.textContent()) || ''
    }

    // 回退：尝试获取最后一条消息
    const messages = await this.page.locator('.rounded-2xl').all()
    if (messages.length === 0) return ''
    const lastMessage = messages[messages.length - 1]
    return (await lastMessage.textContent()) || ''
  }

  /**
   * 获取所有消息数量 (包括用户和 AI 消息)
   */
  async getMessageCount(): Promise<number> {
    return await this.page.locator('.rounded-2xl').count()
  }

  // ==========================================================================
  // InsightCard 交互方法
  // ==========================================================================

  /**
   * 检查是否显示 InsightCard
   */
  async hasInsightCard(): Promise<boolean> {
    try {
      await expect(this.insightCard).toBeVisible({ timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 等待 InsightCard 出现
   */
  async waitForInsightCard(timeout = 20000) {
    await expect(this.insightCard).toBeVisible({ timeout })
  }

  /**
   * 批准 InsightCard
   */
  async approveInsight() {
    await this.approveButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * 拒绝 InsightCard
   */
  async rejectInsight() {
    await this.rejectButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * 展开 InsightCard 到 Canvas
   */
  async expandInsight() {
    await this.expandButton.click()
    await expect(this.canvas).toBeVisible({ timeout: 5000 })
  }

  /**
   * 获取 InsightCard 的参数
   */
  async getInsightParams(): Promise<Record<string, string>> {
    const params: Record<string, string> = {}
    const paramElements = await this.insightCard.locator('[data-param-key]').all()
    for (const el of paramElements) {
      const key = await el.getAttribute('data-param-key')
      const value = await el.textContent()
      if (key && value) {
        params[key] = value.trim()
      }
    }
    return params
  }

  // ==========================================================================
  // ClarificationCard 交互方法
  // ==========================================================================

  /**
   * 检查是否显示澄清问题
   */
  async hasClarificationCard(): Promise<boolean> {
    try {
      await expect(this.clarificationCard).toBeVisible({ timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 等待澄清问题出现
   */
  async waitForClarification(timeout = 20000) {
    await expect(this.clarificationCard).toBeVisible({ timeout })
  }

  /**
   * 选择澄清问题选项
   */
  async selectClarificationOption(optionText: string) {
    const option = this.clarificationCard.locator(`button:has-text("${optionText}")`)
    await option.click()
  }

  /**
   * 输入自定义澄清回答
   */
  async inputClarificationText(text: string) {
    await this.clarificationInput.fill(text)
  }

  /**
   * 提交澄清回答
   */
  async submitClarification() {
    await this.clarificationSubmit.click()
    await this.waitForResponse()
  }

  /**
   * 跳过澄清问题
   */
  async skipClarification() {
    await this.clarificationSkip.click()
    await this.waitForResponse()
  }

  /**
   * 获取澄清问题文本
   */
  async getClarificationQuestion(): Promise<string> {
    const questionEl = this.clarificationCard.locator('h3, [class*="question"]')
    return (await questionEl.textContent()) || ''
  }

  // ==========================================================================
  // Canvas 交互方法
  // ==========================================================================

  /**
   * 检查 Canvas 是否打开
   */
  async isCanvasOpen(): Promise<boolean> {
    try {
      await expect(this.canvas).toBeVisible({ timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 关闭 Canvas
   */
  async closeCanvas() {
    const closeButton = this.canvas.locator('button:has(svg)').first()
    await closeButton.click()
    await expect(this.canvas).not.toBeVisible({ timeout: 5000 })
  }

  /**
   * 在 Canvas 中调整滑块参数
   */
  async adjustSlider(paramKey: string, value: number) {
    const slider = this.canvasPanel.locator(`[data-param="${paramKey}"] input[type="range"]`)
    await slider.fill(String(value))
  }

  // ==========================================================================
  // 验证方法
  // ==========================================================================

  /**
   * 验证消息是纯文本响应（无 InsightCard）
   */
  async expectTextResponse() {
    const hasInsight = await this.hasInsightCard()
    expect(hasInsight).toBe(false)
  }

  /**
   * 验证消息包含 InsightCard
   */
  async expectInsightResponse() {
    await this.waitForInsightCard()
    const hasInsight = await this.hasInsightCard()
    expect(hasInsight).toBe(true)
  }

  /**
   * 验证消息包含特定文本
   */
  async expectMessageContains(text: string) {
    const lastMessage = await this.getLastMessage()
    expect(lastMessage).toContain(text)
  }

  /**
   * 验证显示错误消息
   */
  async expectErrorMessage() {
    const lastMessage = await this.getLastMessage()
    expect(lastMessage).toMatch(/错误|失败|超时|异常|无法/)
  }

  // ==========================================================================
  // ReasoningChain 交互方法 (A2UI 2.0)
  // ==========================================================================

  /**
   * 检查是否显示推理链视图
   */
  async hasReasoningChain(): Promise<boolean> {
    try {
      // 查找包含 "AI 推理过程" 文本的元素
      const reasoningText = this.page.locator(':text("AI 推理过程")')
      await expect(reasoningText).toBeVisible({ timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 等待推理链显示
   */
  async waitForReasoningChain(timeout = 20000) {
    const reasoningText = this.page.locator(':text("AI 推理过程")')
    await expect(reasoningText).toBeVisible({ timeout })
  }

  /**
   * 展开推理链节点
   */
  async expandReasoningNode(nodeIndex = 0) {
    const nodes = await this.page.locator('[class*="reasoning"], [class*="Reasoning"]').all()
    if (nodes.length > nodeIndex) {
      await nodes[nodeIndex].click()
      await this.page.waitForTimeout(300)
    }
  }

  /**
   * 点击推理链确认按钮
   */
  async confirmReasoningNode() {
    // 查找包含 "确认" 文本的按钮，但排除 "快速批准" 和 "调参后批准"
    const confirmBtn = this.page.locator('button:text-is("确认"), button:has-text("✓ 确认")')
    await confirmBtn.first().click()
    await this.page.waitForTimeout(500)
  }

  /**
   * 点击推理链质疑按钮
   */
  async challengeReasoningNode() {
    const challengeBtn = this.page.locator(
      'button:text-is("质疑"), button:has-text("⚠ 质疑"), button:has-text("质疑")'
    )
    await challengeBtn.first().click()
    await this.page.waitForTimeout(500)
  }

  /**
   * 检查是否有质疑按钮
   */
  async hasChallengeButton(): Promise<boolean> {
    try {
      const challengeBtn = this.page.locator('button:text-is("质疑"), button:has-text("质疑")')
      await expect(challengeBtn.first()).toBeVisible({ timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 选择推理链分支选项
   */
  async selectReasoningBranch(branchText: string) {
    const branchOption = this.page.locator(
      `[class*="branch"]:has-text("${branchText}"), button:has-text("${branchText}")`
    )
    await branchOption.first().click()
    await this.waitForResponse()
  }

  /**
   * 检查是否有分支选项
   */
  async hasReasoningBranches(): Promise<boolean> {
    try {
      // 查找 "其他可能" 或分支选项区域
      const branchSection = this.page.locator(':text("其他可能"), [class*="branch"]')
      await expect(branchSection.first()).toBeVisible({ timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取推理链节点数量
   */
  async getReasoningNodeCount(): Promise<number> {
    // 查找所有推理节点
    const nodes = await this.page
      .locator('[class*="理解"], [class*="分析"], [class*="推荐"], [class*="风险"]')
      .all()
    return nodes.length
  }

  /**
   * 验证推理链质疑后收到响应
   */
  async expectChallengeResponse() {
    // 质疑后应该收到解释性响应
    const response = await this.getLastMessage()
    expect(response).toMatch(/质疑|解释|理解|重新|补充/)
  }
}

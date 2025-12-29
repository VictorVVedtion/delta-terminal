/**
 * ChatPage - 策略页面 Page Object
 *
 * 封装 /strategies 页面的所有交互操作
 */

import { type Locator, type Page, expect } from '@playwright/test'

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

  // Canvas 相关
  readonly canvas: Locator
  readonly canvasPanel: Locator

  // 加载状态
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    this.page = page

    // 聊天输入区域
    this.chatInput = page.locator('textarea[placeholder*="输入"], textarea[placeholder*="想法"]')
    this.sendButton = page.getByRole('button', { name: /发送|提交/ })
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
   * 导航到策略页面
   */
  async goto() {
    await this.page.goto('/strategies')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * 等待页面完全加载
   */
  async waitForReady() {
    await expect(this.chatInput).toBeVisible({ timeout: 10000 })
  }

  // ==========================================================================
  // 聊天交互方法
  // ==========================================================================

  /**
   * 发送消息
   */
  async sendMessage(message: string) {
    await this.chatInput.fill(message)
    await this.sendButton.click()
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
   * 获取最后一条消息内容
   */
  async getLastMessage(): Promise<string> {
    const messages = await this.page.locator('.rounded-2xl, [class*="message"]').all()
    if (messages.length === 0) return ''
    const lastMessage = messages[messages.length - 1]
    return (await lastMessage.textContent()) || ''
  }

  /**
   * 获取所有消息数量
   */
  async getMessageCount(): Promise<number> {
    return await this.page.locator('.rounded-2xl, [class*="message"]').count()
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
}

/**
 * Chat E2E Test Fixture
 *
 * 提供 AI 聊天测试的统一 fixture
 * - 页面导航和设置
 * - API Mock 拦截
 * - Page Object 集成
 */

import { test as base, type Page, type Route } from '@playwright/test'

import { ChatPage } from '../pages/ChatPage'
import { CanvasPage } from '../pages/CanvasPage'
import {
  type InsightApiResponse,
  exploratoryResponse,
  actionableResponse,
  negationResponse,
  questionResponse,
  questionWithActionResponse,
  singleClarificationResponse,
  multiStepClarification1,
  multiStepClarification2,
  multiStepClarification3,
  multiStepClarificationComplete,
  backtestSuccessResponse,
  backtestFailedCriteriaResponse,
  backtestErrorResponse,
  deployPaperSuccess,
  deployLiveSuccess,
  deployFailedResponse,
  agentStatusResponse,
  agentPauseSuccess,
  agentResumeSuccess,
  agentStopSuccess,
  backendNotConfiguredResponse,
  requestTimeoutResponse,
  networkErrorResponse,
  batchAdjustResponse,
  tradeSignalResponse,
  templateSelectionResponse,
  reasoningChainResponse,
  getMockResponseForMessage,
} from './mock-responses'

// =============================================================================
// Fixture 类型定义
// =============================================================================

interface ChatTestFixtures {
  /** 聊天页面 Page Object */
  chatPage: ChatPage
  /** Canvas Page Object */
  canvasPage: CanvasPage
  /** 设置 Mock 响应 */
  mockInsightApi: MockApiController
}

interface MockApiController {
  /** 设置下一次 API 响应 */
  setNextResponse: (response: InsightApiResponse) => void
  /** 设置多个连续响应 (用于多步骤流程) */
  setResponseQueue: (responses: InsightApiResponse[]) => void
  /** 启用自动响应 (根据消息内容自动选择) */
  enableAutoResponse: () => void
  /** 禁用 Mock (使用真实 API) */
  disableMock: () => void
  /** 设置响应延迟 */
  setDelay: (ms: number) => void
  /** 模拟网络错误 */
  simulateNetworkError: () => void
  /** 模拟超时 */
  simulateTimeout: () => void
  /** 模拟 503 错误 */
  simulate503: () => void
  /** 重置到默认状态 */
  reset: () => void
}

// =============================================================================
// Mock API 控制器实现
// =============================================================================

class MockApiControllerImpl implements MockApiController {
  private page: Page
  private nextResponse: InsightApiResponse | null = null
  private responseQueue: InsightApiResponse[] = []
  private autoResponseEnabled = false
  private mockEnabled = true
  private delayMs = 200
  private simulateError: 'network' | 'timeout' | '503' | null = null
  private routeHandler: ((route: Route) => Promise<void>) | null = null

  constructor(page: Page) {
    this.page = page
  }

  setNextResponse(response: InsightApiResponse): void {
    this.nextResponse = response
    this.autoResponseEnabled = false
  }

  setResponseQueue(responses: InsightApiResponse[]): void {
    this.responseQueue = [...responses]
    this.nextResponse = null
    this.autoResponseEnabled = false
  }

  enableAutoResponse(): void {
    this.autoResponseEnabled = true
    this.nextResponse = null
    this.responseQueue = []
  }

  disableMock(): void {
    this.mockEnabled = false
  }

  setDelay(ms: number): void {
    this.delayMs = ms
  }

  simulateNetworkError(): void {
    this.simulateError = 'network'
  }

  simulateTimeout(): void {
    this.simulateError = 'timeout'
  }

  simulate503(): void {
    this.simulateError = '503'
  }

  reset(): void {
    this.nextResponse = null
    this.responseQueue = []
    this.autoResponseEnabled = false
    this.mockEnabled = true
    this.delayMs = 200
    this.simulateError = null
  }

  async setupRoutes(): Promise<void> {
    // Mock /api/ai/insight endpoint
    await this.page.route('**/api/ai/insight', async (route) => {
      if (!this.mockEnabled) {
        await route.continue()
        return
      }

      // 模拟延迟
      if (this.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs))
      }

      // 模拟错误
      if (this.simulateError) {
        await this.handleError(route)
        return
      }

      // 获取响应
      const response = this.getNextResponse(route)

      // 返回响应
      await route.fulfill({
        status: response.success ? 200 : 500,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })

    // Mock /api/spirit/analyze endpoint (备用 AI 端点)
    await this.page.route('**/api/spirit/analyze', async (route) => {
      if (!this.mockEnabled) {
        await route.continue()
        return
      }

      await new Promise((resolve) => setTimeout(resolve, this.delayMs))

      const response = this.getNextResponse(route)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })

    // Mock backtest API
    await this.page.route('**/api/backtest/**', async (route) => {
      if (!this.mockEnabled) {
        await route.continue()
        return
      }

      await new Promise((resolve) => setTimeout(resolve, this.delayMs))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // Mock deploy API
    await this.page.route('**/api/agent/deploy', async (route) => {
      if (!this.mockEnabled) {
        await route.continue()
        return
      }

      await new Promise((resolve) => setTimeout(resolve, this.delayMs))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          agent_id: 'agent_mock_001',
          status: 'running',
        }),
      })
    })

    // Mock agent control APIs
    await this.page.route('**/api/agent/*/pause', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'paused' }),
      })
    })

    await this.page.route('**/api/agent/*/resume', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'running' }),
      })
    })

    await this.page.route('**/api/agent/*/stop', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'stopped' }),
      })
    })
  }

  private async handleError(route: Route): Promise<void> {
    switch (this.simulateError) {
      case 'network':
        await route.abort('failed')
        break
      case 'timeout':
        // 等待足够长时间触发超时
        await new Promise((resolve) => setTimeout(resolve, 30000))
        await route.fulfill({
          status: 504,
          contentType: 'application/json',
          body: JSON.stringify(requestTimeoutResponse),
        })
        break
      case '503':
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify(backendNotConfiguredResponse),
        })
        break
      default:
        await route.continue()
    }
    // 重置错误状态
    this.simulateError = null
  }

  private getNextResponse(route: Route): InsightApiResponse {
    // 优先使用预设响应
    if (this.nextResponse) {
      const response = this.nextResponse
      this.nextResponse = null
      return response
    }

    // 使用响应队列
    if (this.responseQueue.length > 0) {
      return this.responseQueue.shift()!
    }

    // 自动响应模式
    if (this.autoResponseEnabled) {
      try {
        const request = route.request()
        const postData = request.postDataJSON() as { message?: string }
        if (postData?.message) {
          return getMockResponseForMessage(postData.message)
        }
      } catch {
        // 解析失败，使用默认响应
      }
    }

    // 默认返回探索性响应
    return exploratoryResponse
  }
}

// =============================================================================
// 扩展 Playwright Test
// =============================================================================

export const test = base.extend<ChatTestFixtures>({
  // 聊天页面 Page Object
  chatPage: async ({ page }, use) => {
    const chatPage = new ChatPage(page)
    await use(chatPage)
  },

  // Canvas Page Object
  canvasPage: async ({ page }, use) => {
    const canvasPage = new CanvasPage(page)
    await use(canvasPage)
  },

  // Mock API 控制器
  mockInsightApi: async ({ page }, use) => {
    const controller = new MockApiControllerImpl(page)
    await controller.setupRoutes()
    await use(controller)
    controller.reset()
  },
})

// 导出 expect
export { expect } from '@playwright/test'

// =============================================================================
// 预设测试场景
// =============================================================================

/**
 * 预设的测试场景配置
 * 用于快速设置常见测试情况
 */
export const testScenarios = {
  // === 意图分类场景 ===
  exploratory: {
    name: 'SC01: 探索性查询',
    response: exploratoryResponse,
    inputExample: 'BTC 现在是什么行情？',
  },
  actionable: {
    name: 'SC02: 行动性请求',
    response: actionableResponse,
    inputExample: '在 BTC 跌到支撑位时买入',
  },
  negation: {
    name: 'SC03: 否定句处理',
    response: negationResponse,
    inputExample: '不要买入 BTC',
  },
  question: {
    name: 'SC04: 疑问句',
    response: questionResponse,
    inputExample: '网格策略怎么设置？',
  },
  questionWithAction: {
    name: 'SC05: 问号+动作词',
    response: questionWithActionResponse,
    inputExample: '帮我创建网格策略好吗？',
  },

  // === 澄清问题场景 ===
  singleClarification: {
    name: 'SC06: 单步澄清',
    response: singleClarificationResponse,
    inputExample: '创建一个策略',
  },
  multiStepClarification: {
    name: 'SC07: 多步澄清',
    responses: [
      multiStepClarification1,
      multiStepClarification2,
      multiStepClarification3,
      multiStepClarificationComplete,
    ],
    inputExample: '帮我做一个交易策略',
  },

  // === 策略创建场景 ===
  batchAdjust: {
    name: 'SC13: 批量调整',
    response: batchAdjustResponse,
    inputExample: '把所有策略止损收紧 2%',
  },
  tradeSignal: {
    name: 'SC14: 交易信号',
    response: tradeSignalResponse,
    inputExample: 'ETH 有没有交易机会？',
  },

  // === 回测场景 ===
  backtestSuccess: {
    name: 'SC15-16: 回测成功',
    response: backtestSuccessResponse,
  },
  backtestFailed: {
    name: 'SC17: 回测未通过',
    response: backtestFailedCriteriaResponse,
  },
  backtestError: {
    name: 'SC18: 回测失败',
    response: backtestErrorResponse,
  },

  // === 部署场景 ===
  deployPaper: {
    name: 'SC19: Paper 部署',
    response: deployPaperSuccess,
  },
  deployLive: {
    name: 'SC20: Live 部署',
    response: deployLiveSuccess,
  },
  deployFailed: {
    name: 'SC21: 部署失败',
    response: deployFailedResponse,
  },

  // === 监控场景 ===
  agentStatus: {
    name: 'SC23: 代理状态',
    response: agentStatusResponse,
  },
  agentPause: {
    name: 'SC24: 暂停代理',
    response: agentPauseSuccess,
  },
  agentResume: {
    name: 'SC25: 恢复代理',
    response: agentResumeSuccess,
  },
  agentStop: {
    name: 'SC26: 停止代理',
    response: agentStopSuccess,
  },

  // === 错误处理场景 ===
  backendNotConfigured: {
    name: 'SC27: 后端未配置',
    response: backendNotConfiguredResponse,
  },
  timeout: {
    name: 'SC28: 请求超时',
    response: requestTimeoutResponse,
  },
  networkError: {
    name: 'SC29: 网络中断',
    response: networkErrorResponse,
  },

  // === 高级功能场景 ===
  template: {
    name: 'SC32: 模板选择',
    response: templateSelectionResponse,
  },
  reasoningChain: {
    name: 'SC33: 推理链展示',
    response: reasoningChainResponse,
  },
}

// =============================================================================
// 测试辅助函数
// =============================================================================

/**
 * 等待 AI 响应完成
 * 支持自定义超时和轮询间隔
 */
export async function waitForAIResponse(
  page: Page,
  options: {
    timeout?: number
    pollInterval?: number
  } = {}
): Promise<void> {
  const { timeout = 30000, pollInterval = 500 } = options

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    // 检查加载指示器是否消失
    const loadingVisible = await page
      .locator('[data-testid="loading"], [class*="loading"], [class*="spinner"]')
      .isVisible()
      .catch(() => false)

    if (!loadingVisible) {
      // 额外等待确保渲染完成
      await page.waitForTimeout(pollInterval)
      return
    }

    await page.waitForTimeout(pollInterval)
  }

  throw new Error(`AI response timeout after ${timeout}ms`)
}

/**
 * 验证 InsightCard 是否显示
 */
export async function expectInsightCardVisible(page: Page): Promise<void> {
  const insightCard = page.locator('[data-testid="insight-card"], [class*="InsightCard"]')
  await insightCard.waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * 验证纯文本响应 (无 InsightCard)
 */
export async function expectTextResponseOnly(page: Page): Promise<void> {
  // 等待响应
  await waitForAIResponse(page)

  // 确保没有 InsightCard
  const insightCard = page.locator('[data-testid="insight-card"], [class*="InsightCard"]')
  const isVisible = await insightCard.isVisible().catch(() => false)

  if (isVisible) {
    throw new Error('Expected text response only, but InsightCard is visible')
  }
}

/**
 * 验证澄清问题显示
 */
export async function expectClarificationVisible(page: Page): Promise<void> {
  const clarificationCard = page.locator(
    '[data-testid="clarification-card"], [class*="Clarification"]'
  )
  await clarificationCard.waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * 验证错误消息显示
 */
export async function expectErrorMessage(page: Page, expectedText?: string): Promise<void> {
  const errorLocator = page.locator('[class*="error"], [role="alert"]')
  await errorLocator.waitFor({ state: 'visible', timeout: 10000 })

  if (expectedText) {
    const text = await errorLocator.textContent()
    if (!text?.includes(expectedText)) {
      throw new Error(`Expected error message "${expectedText}" not found. Got: "${text}"`)
    }
  }
}

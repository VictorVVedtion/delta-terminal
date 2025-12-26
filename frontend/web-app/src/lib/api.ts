/**
 * API 客户端 - 钱包认证版本
 * 处理所有后端 API 请求
 */

import { UserRole } from '@/store/auth'
import type {
  DeploymentResult,
  DeploymentStatus,
  BacktestSummary,
  PaperPerformance,
  PaperDeployConfig,
  LiveDeployConfig,
} from '@/types/deployment'
import { DeploymentError } from '@/types/deployment'
import type {
  BacktestConfig,
  BacktestResult,
  BacktestRunState,
  BacktestHistoryItem,
} from '@/types/backtest'

// =============================================================================
// API 特定类型 (Story 2.2)
// =============================================================================

/** 回测配置输入 (与 BacktestConfig 相同，便于 API 层使用) */
type BacktestConfigInput = BacktestConfig

/** 回测运行状态 (API 返回格式) */
type BacktestRunStatus = BacktestRunState

/** 完整回测结果 (API 返回格式) */
type BacktestFullResult = BacktestResult

/** 回测历史项 (API 返回格式) */
type BacktestHistoryItemApi = BacktestHistoryItem

// API 基础 URL - 开发时指向认证服务
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// 响应类型定义
interface WalletUser {
  id: string
  walletAddress: string
  role: UserRole
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface AuthResponse {
  user: WalletUser
  tokens: AuthTokens
}

interface NonceResponse {
  nonce: string
  message: string
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private refreshToken: string | null = null
  private refreshPromise: Promise<AuthTokens> | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string) {
    this.token = token
  }

  setRefreshToken(token: string) {
    this.refreshToken = token
  }

  clearToken() {
    this.token = null
    this.refreshToken = null
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    retry = true
  ): Promise<T> {
    const { params, ...fetchOptions } = options

    let url = `${this.baseUrl}${endpoint}`

    // 添加查询参数
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value))
      })
      url += `?${searchParams.toString()}`
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...this.getHeaders(),
        ...fetchOptions.headers,
      },
    })

    // 处理 401 错误 - 尝试刷新 Token
    if (response.status === 401 && retry && this.refreshToken) {
      try {
        const tokens = await this.refreshAccessToken()
        this.token = tokens.accessToken
        this.refreshToken = tokens.refreshToken
        // 重试原始请求
        return this.request<T>(endpoint, options, false)
      } catch {
        // 刷新失败，清除 token
        this.clearToken()
        throw new Error('会话已过期，请重新连接钱包')
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // ========== 钱包认证相关 ==========

  /**
   * 获取 Nonce（用于签名）
   */
  async getNonce(walletAddress: string): Promise<NonceResponse> {
    return this.request<NonceResponse>('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    })
  }

  /**
   * 钱包登录
   */
  async walletLogin(walletAddress: string, signature: string): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature }),
    })
    this.token = result.tokens.accessToken
    this.refreshToken = result.tokens.refreshToken
    return result
  }

  /**
   * 刷新 Token
   */
  async refreshAccessToken(): Promise<AuthTokens> {
    // 防止并发刷新
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.request<AuthTokens>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      },
      false
    ).finally(() => {
      this.refreshPromise = null
    })

    return this.refreshPromise
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      await this.request<{ message: string }>('/auth/logout', {
        method: 'POST',
      })
    } finally {
      this.clearToken()
    }
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<WalletUser> {
    const result = await this.request<{ user: WalletUser }>('/auth/me')
    return result.user
  }

  // ========== 市场数据相关 ==========

  async getMarketData(symbol: string) {
    return this.request<unknown>(`/market/${symbol}`)
  }

  async getOrderBook(symbol: string, limit: number = 20) {
    return this.request<unknown>(`/market/${symbol}/orderbook`, {
      params: { limit },
    })
  }

  async getTrades(symbol: string, limit: number = 50) {
    return this.request<unknown>(`/market/${symbol}/trades`, {
      params: { limit },
    })
  }

  // ========== 策略相关 ==========

  async getStrategies() {
    return this.request<unknown[]>('/strategies')
  }

  async getStrategy(id: string) {
    return this.request<unknown>(`/strategies/${id}`)
  }

  async createStrategy(data: unknown) {
    return this.request<unknown>('/strategies', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateStrategy(id: string, data: unknown) {
    return this.request<unknown>(`/strategies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteStrategy(id: string) {
    return this.request<void>(`/strategies/${id}`, {
      method: 'DELETE',
    })
  }

  async startStrategy(id: string) {
    return this.request<unknown>(`/strategies/${id}/start`, {
      method: 'POST',
    })
  }

  async stopStrategy(id: string) {
    return this.request<unknown>(`/strategies/${id}/stop`, {
      method: 'POST',
    })
  }

  // ========== 交易相关 ==========

  async createOrder(data: {
    symbol: string
    side: 'buy' | 'sell'
    type: 'market' | 'limit'
    amount: number
    price?: number
  }) {
    return this.request<unknown>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getOrders(params?: {
    symbol?: string
    status?: string
    limit?: number
  }) {
    return this.request<unknown[]>('/orders', params ? { params: params as Record<string, string | number | boolean> } : {})
  }

  async cancelOrder(id: string) {
    return this.request<void>(`/orders/${id}`, {
      method: 'DELETE',
    })
  }

  async cancelAllOrders() {
    return this.request<{ cancelledCount: number }>('/orders/cancel-all', {
      method: 'POST',
    })
  }

  async getActiveOrdersCount() {
    const orders = await this.getOrders({ status: 'open' })
    return Array.isArray(orders) ? orders.length : 0
  }

  // ========== 资产相关 ==========

  async getPortfolio() {
    return this.request<unknown>('/portfolio')
  }

  async getBalance() {
    return this.request<unknown>('/portfolio/balance')
  }

  async getTransactions(limit: number = 50) {
    return this.request<unknown[]>('/portfolio/transactions', {
      params: { limit },
    })
  }

  async getPositions() {
    return this.request<unknown[]>('/portfolio/positions')
  }

  async closeAllPositions() {
    return this.request<{ closedCount: number }>('/portfolio/positions/close-all', {
      method: 'POST',
    })
  }

  async getOpenPositionsCount() {
    const positions = await this.getPositions()
    return Array.isArray(positions) ? positions.length : 0
  }

  // ========== 回测相关 (Story 2.2) ==========

  /**
   * 启动回测
   * @param config 回测配置
   */
  async runBacktest(config: BacktestConfigInput): Promise<{ backtestId: string }> {
    return this.request<{ backtestId: string }>('/backtest/run', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  /**
   * 获取回测运行状态
   * @param backtestId 回测 ID
   */
  async getBacktestRunStatus(backtestId: string): Promise<BacktestRunStatus> {
    return this.request<BacktestRunStatus>(`/backtest/${backtestId}/status`)
  }

  /**
   * 获取完整回测结果
   * @param backtestId 回测 ID
   */
  async getBacktestFullResult(backtestId: string): Promise<BacktestFullResult> {
    return this.request<BacktestFullResult>(`/backtest/${backtestId}/result`)
  }

  /**
   * 暂停回测
   * @param backtestId 回测 ID
   */
  async pauseBacktest(backtestId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/backtest/${backtestId}/pause`, {
      method: 'POST',
    })
  }

  /**
   * 恢复回测
   * @param backtestId 回测 ID
   */
  async resumeBacktest(backtestId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/backtest/${backtestId}/resume`, {
      method: 'POST',
    })
  }

  /**
   * 取消回测
   * @param backtestId 回测 ID
   */
  async cancelBacktestRun(backtestId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/backtest/${backtestId}/cancel`, {
      method: 'POST',
    })
  }

  /**
   * 获取回测历史
   * @param strategyId 策略 ID
   */
  async getBacktestHistory(strategyId: string): Promise<BacktestHistoryItemApi[]> {
    return this.request<BacktestHistoryItemApi[]>(`/strategies/${strategyId}/backtest/history`)
  }

  // Legacy backtest methods (保留兼容)
  async createBacktest(data: {
    strategyId: string
    symbol: string
    startDate: string
    endDate: string
    initialBalance: number
  }) {
    return this.request<unknown>('/backtest', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getBacktest(id: string) {
    return this.request<unknown>(`/backtest/${id}`)
  }

  async getBacktestResults(id: string) {
    return this.request<unknown>(`/backtest/${id}/results`)
  }

  // ========== AI 相关 ==========

  async chatWithAI(message: string, conversationId?: string) {
    return this.request<{ response: string; conversationId: string }>(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({ message, conversationId }),
      }
    )
  }

  async generateStrategy(prompt: string) {
    return this.request<unknown>('/ai/generate-strategy', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    })
  }

  async analyzeMarket(symbol: string) {
    return this.request<unknown>('/ai/analyze-market', {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    })
  }

  // ========== KillSwitch 相关 ==========

  async logKillSwitchEvent(data: {
    timestamp: string
    cancelledOrders: number
    closedPositions: number
    stoppedStrategies: number
  }) {
    return this.request<{ success: boolean }>('/system/killswitch-log', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ========== 部署相关 (Story 1.2) ==========

  /**
   * 部署策略到 Paper 模式
   * @param strategyId 策略 ID
   * @param config Paper 部署配置
   */
  async deployPaper(
    strategyId: string,
    config: PaperDeployConfig
  ): Promise<DeploymentResult> {
    try {
      return await this.request<DeploymentResult>('/strategies/deploy/paper', {
        method: 'POST',
        body: JSON.stringify({ strategyId, ...config }),
      })
    } catch (error) {
      throw this.handleDeploymentError(error, 'paper')
    }
  }

  /**
   * 部署策略到 Live 模式
   * @param strategyId 策略 ID
   * @param config Live 部署配置 (包含确认令牌)
   */
  async deployLive(
    strategyId: string,
    config: LiveDeployConfig
  ): Promise<DeploymentResult> {
    try {
      return await this.request<DeploymentResult>('/strategies/deploy/live', {
        method: 'POST',
        body: JSON.stringify({ strategyId, ...config }),
      })
    } catch (error) {
      throw this.handleDeploymentError(error, 'live')
    }
  }

  /**
   * 获取部署状态
   * @param deploymentId 部署 ID
   */
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
    return this.request<DeploymentStatus>(`/deployments/${deploymentId}/status`)
  }

  /**
   * 获取策略回测结果摘要
   * @param strategyId 策略 ID
   */
  async getStrategyBacktestResult(strategyId: string): Promise<BacktestSummary> {
    return this.request<BacktestSummary>(`/strategies/${strategyId}/backtest`)
  }

  /**
   * 获取 Paper 阶段表现数据
   * @param agentId Agent ID
   */
  async getPaperPerformance(agentId: string): Promise<PaperPerformance> {
    return this.request<PaperPerformance>(`/agents/${agentId}/paper-performance`)
  }

  /**
   * 取消部署
   * @param deploymentId 部署 ID
   */
  async cancelDeployment(deploymentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/deployments/${deploymentId}/cancel`, {
      method: 'POST',
    })
  }

  /**
   * 处理部署错误
   */
  private handleDeploymentError(error: unknown, mode: 'paper' | 'live'): DeploymentError {
    if (error instanceof DeploymentError) {
      return error
    }

    const message = error instanceof Error ? error.message : '未知错误'

    // 根据错误消息推断错误类型
    if (message.includes('回测') || message.includes('backtest')) {
      return new DeploymentError('策略回测未通过', 'BACKTEST_NOT_PASSED', error)
    }
    if (message.includes('Paper') || message.includes('7 天') || message.includes('运行时间')) {
      return new DeploymentError('Paper 运行时间不足', 'PAPER_TIME_INSUFFICIENT', error)
    }
    if (message.includes('令牌') || message.includes('token') || message.includes('确认')) {
      return new DeploymentError('确认令牌无效', 'INVALID_TOKEN', error)
    }
    if (message.includes('余额') || message.includes('balance')) {
      return new DeploymentError('账户余额不足', 'INSUFFICIENT_BALANCE', error)
    }
    if (message.includes('网络') || message.includes('network') || message.includes('fetch')) {
      return new DeploymentError('网络连接失败', 'NETWORK_ERROR', error)
    }

    return new DeploymentError(
      `${mode === 'live' ? 'Live' : 'Paper'} 部署失败: ${message}`,
      'API_ERROR',
      error
    )
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

export default apiClient

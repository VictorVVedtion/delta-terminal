/**
 * Backtest Service 客户端
 *
 * 与回测引擎通信，执行策略回测和结果分析
 */

// =============================================================================
// 配置
// =============================================================================

const BACKTEST_SERVICE_URL = process.env.BACKTEST_SERVICE_URL || 'http://localhost:4004'

// =============================================================================
// 类型定义
// =============================================================================

export interface BacktestConfig {
  strategyId?: string
  strategyConfig?: Record<string, unknown>
  symbol: string
  timeframe: string
  startDate: string
  endDate: string
  initialCapital: number
  commission?: number
  slippage?: number
  leverage?: number
}

export interface BacktestTrade {
  id: string
  timestamp: string
  side: 'buy' | 'sell'
  price: number
  quantity: number
  pnl: number
  pnlPercent: number
  commission: number
}

export interface BacktestMetrics {
  totalReturn: number
  totalReturnPercent: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  maxDrawdownPercent: number
  winRate: number
  profitFactor: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgWin: number
  avgLoss: number
  avgHoldingPeriod: number
  volatility: number
  calmarRatio: number
}

export interface BacktestResult {
  id: string
  strategyId?: string
  config: BacktestConfig
  metrics: BacktestMetrics
  trades: BacktestTrade[]
  equityCurve: Array<{ timestamp: string; equity: number }>
  drawdownCurve: Array<{ timestamp: string; drawdown: number }>
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  error?: string
  createdAt: string
  completedAt?: string
}

export interface BacktestSuggestion {
  period: string
  initialCapital: number
  commission: number
  slippage: number
  reasoning: string
  warnings?: string[]
}

// =============================================================================
// Backtest Service 客户端
// =============================================================================

export class BacktestClientService {
  private baseUrl: string
  private isAvailable: boolean | null = null

  constructor() {
    this.baseUrl = BACKTEST_SERVICE_URL
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now()
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      this.isAvailable = response.ok
      return {
        healthy: response.ok,
        latency: Date.now() - start,
      }
    } catch {
      this.isAvailable = false
      return {
        healthy: false,
        latency: Date.now() - start,
      }
    }
  }

  /**
   * 运行回测
   */
  async runBacktest(
    config: BacktestConfig,
    userId: string
  ): Promise<{ success: boolean; backtestId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/backtest/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(60000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: string }
        return {
          success: false,
          error: error.message || `Failed to run backtest: ${response.status}`,
        }
      }

      const data = await response.json() as { backtestId: string }
      return {
        success: true,
        backtestId: data.backtestId,
      }
    } catch (error) {
      console.error('[BacktestClient] Run backtest failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run backtest',
      }
    }
  }

  /**
   * 获取回测结果
   */
  async getBacktestResult(
    backtestId: string,
    userId: string
  ): Promise<{ success: boolean; result?: BacktestResult; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/backtest/${backtestId}`, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get backtest result: ${response.status}`,
        }
      }

      const data = await response.json() as BacktestResult
      return {
        success: true,
        result: data,
      }
    } catch (error) {
      console.error('[BacktestClient] Get backtest result failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get backtest result',
      }
    }
  }

  /**
   * 获取回测进度
   */
  async getBacktestProgress(
    backtestId: string,
    userId: string
  ): Promise<{ success: boolean; status?: string; progress?: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/backtest/${backtestId}/progress`, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get backtest progress: ${response.status}`,
        }
      }

      const data = await response.json() as { status: string; progress: number }
      return {
        success: true,
        status: data.status,
        progress: data.progress,
      }
    } catch (error) {
      console.error('[BacktestClient] Get backtest progress failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get backtest progress',
      }
    }
  }

  /**
   * 列出用户的回测历史
   */
  async listBacktests(
    userId: string,
    options?: {
      strategyId?: string
      status?: 'completed' | 'failed' | 'all'
      limit?: number
    }
  ): Promise<{ success: boolean; backtests: BacktestResult[]; error?: string }> {
    try {
      const params = new URLSearchParams()
      if (options?.strategyId) {
        params.set('strategyId', options.strategyId)
      }
      if (options?.status && options.status !== 'all') {
        params.set('status', options.status)
      }
      if (options?.limit) {
        params.set('limit', String(options.limit))
      }

      const url = `${this.baseUrl}/api/v1/backtest?${params.toString()}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        return {
          success: false,
          backtests: [],
          error: `Failed to list backtests: ${response.status}`,
        }
      }

      const data = await response.json() as { backtests: BacktestResult[] }
      return {
        success: true,
        backtests: data.backtests || [],
      }
    } catch (error) {
      console.error('[BacktestClient] List backtests failed:', error)
      return {
        success: false,
        backtests: [],
        error: error instanceof Error ? error.message : 'Failed to list backtests',
      }
    }
  }

  /**
   * 取消回测
   */
  async cancelBacktest(
    backtestId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/backtest/${backtestId}/cancel`, {
        method: 'POST',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: string }
        return {
          success: false,
          error: error.message || `Failed to cancel backtest: ${response.status}`,
        }
      }

      return { success: true }
    } catch (error) {
      console.error('[BacktestClient] Cancel backtest failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel backtest',
      }
    }
  }

  /**
   * 生成回测解释
   */
  async explainBacktest(
    backtestId: string,
    userId: string
  ): Promise<{
    success: boolean
    explanation?: {
      summary: string
      keyMetrics: Record<string, { value: number; interpretation: string }>
      strengths: string[]
      weaknesses: string[]
      suggestions: string[]
    }
    error?: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/backtest/${backtestId}/explain`, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to explain backtest: ${response.status}`,
        }
      }

      const data = await response.json() as {
        summary: string
        keyMetrics: Record<string, { value: number; interpretation: string }>
        strengths: string[]
        weaknesses: string[]
        suggestions: string[]
      }
      return {
        success: true,
        explanation: data,
      }
    } catch (error) {
      console.error('[BacktestClient] Explain backtest failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to explain backtest',
      }
    }
  }

  /**
   * 获取回测配置建议
   */
  async suggestBacktestConfig(
    strategyConfig: Record<string, unknown>
  ): Promise<{ success: boolean; suggestion?: BacktestSuggestion; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/backtest/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ strategyConfig }),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to suggest backtest config: ${response.status}`,
        }
      }

      const data = await response.json() as BacktestSuggestion
      return {
        success: true,
        suggestion: data,
      }
    } catch (error) {
      console.error('[BacktestClient] Suggest backtest config failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to suggest backtest config',
      }
    }
  }

  /**
   * 检查服务是否可用
   */
  async isServiceAvailable(): Promise<boolean> {
    if (this.isAvailable === null) {
      const health = await this.healthCheck()
      this.isAvailable = health.healthy
    }
    return this.isAvailable
  }

  /**
   * 重置可用性缓存
   */
  resetAvailabilityCache(): void {
    this.isAvailable = null
  }
}

// 单例导出
export const backtestClient = new BacktestClientService()

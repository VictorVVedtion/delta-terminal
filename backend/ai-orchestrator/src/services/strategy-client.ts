/**
 * Strategy Service 客户端
 *
 * 与 Strategy Service 通信，实现策略的 CRUD 操作
 */

// =============================================================================
// 配置
// =============================================================================

const STRATEGY_SERVICE_URL = process.env.STRATEGY_SERVICE_URL || 'http://localhost:4002'

// =============================================================================
// 类型定义
// =============================================================================

export interface Factor {
  id: string
  name?: string
  params?: Record<string, unknown>
}

export interface RiskManagement {
  stopLoss?: number
  takeProfit?: number
  positionSize?: number
  maxDrawdown?: number
  dailyLossLimit?: number
}

export interface StrategyConfig {
  name: string
  symbol: string
  timeframe?: string
  factors: Factor[]
  entryConditions: string[]
  exitConditions?: string[]
  riskManagement?: RiskManagement
  description?: string
  tags?: string[]
}

export interface Strategy {
  id: string
  userId: string
  name: string
  symbol: string
  timeframe?: string
  factors: Factor[]
  entryConditions: string[]
  exitConditions?: string[]
  riskManagement?: RiskManagement
  status: 'draft' | 'active' | 'paused' | 'stopped' | 'archived'
  version: number
  description?: string
  tags?: string[]
  performance?: StrategyPerformance
  createdAt: string
  updatedAt: string
}

export interface StrategyPerformance {
  totalPnL: number
  totalPnLPercent: number
  winRate: number
  totalTrades: number
  sharpeRatio?: number
  maxDrawdown?: number
  lastUpdated: string
}

export interface CreateStrategyResponse {
  success: boolean
  strategy?: Strategy
  strategyId?: string
  error?: string
}

export interface UpdateStrategyResponse {
  success: boolean
  strategy?: Strategy
  newVersion?: number
  error?: string
}

export interface ListStrategiesResponse {
  success: boolean
  strategies: Strategy[]
  total: number
  page: number
  pageSize: number
}

export interface StrategyActionResponse {
  success: boolean
  strategyId: string
  status: string
  message?: string
  error?: string
}

// =============================================================================
// Strategy Service 客户端
// =============================================================================

export class StrategyClientService {
  private baseUrl: string
  private isAvailable: boolean | null = null

  constructor() {
    this.baseUrl = STRATEGY_SERVICE_URL
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
   * 创建策略
   */
  async createStrategy(
    config: StrategyConfig,
    userId: string
  ): Promise<CreateStrategyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: string }
        return {
          success: false,
          error: error.message || `Failed to create strategy: ${response.status}`,
        }
      }

      const data = await response.json() as Strategy
      return {
        success: true,
        strategy: data,
        strategyId: data.id,
      }
    } catch (error) {
      console.error('[StrategyClient] Create strategy failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create strategy',
      }
    }
  }

  /**
   * 获取策略详情
   */
  async getStrategy(strategyId: string, userId: string): Promise<Strategy | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/strategies/${strategyId}`, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return null
      }

      return await response.json() as Strategy
    } catch (error) {
      console.error('[StrategyClient] Get strategy failed:', error)
      return null
    }
  }

  /**
   * 列出用户策略
   */
  async listStrategies(
    userId: string,
    options?: {
      status?: 'all' | 'active' | 'paused' | 'draft'
      limit?: number
      page?: number
      sortBy?: 'createdAt' | 'updatedAt' | 'performance'
    }
  ): Promise<ListStrategiesResponse> {
    try {
      const params = new URLSearchParams()
      if (options?.status && options.status !== 'all') {
        params.set('status', options.status)
      }
      if (options?.limit) {
        params.set('limit', String(options.limit))
      }
      if (options?.page) {
        params.set('page', String(options.page))
      }
      if (options?.sortBy) {
        params.set('sortBy', options.sortBy)
      }

      const url = `${this.baseUrl}/api/v1/strategies?${params.toString()}`
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
          strategies: [],
          total: 0,
          page: options?.page || 1,
          pageSize: options?.limit || 20,
        }
      }

      const data = await response.json() as {
        strategies: Strategy[]
        total: number
        page: number
        pageSize: number
      }

      return {
        success: true,
        ...data,
      }
    } catch (error) {
      console.error('[StrategyClient] List strategies failed:', error)
      return {
        success: false,
        strategies: [],
        total: 0,
        page: options?.page || 1,
        pageSize: options?.limit || 20,
      }
    }
  }

  /**
   * 更新策略参数
   */
  async updateStrategy(
    strategyId: string,
    userId: string,
    updates: Partial<StrategyConfig>
  ): Promise<UpdateStrategyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/strategies/${strategyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: string }
        return {
          success: false,
          error: error.message || `Failed to update strategy: ${response.status}`,
        }
      }

      const data = await response.json() as Strategy
      return {
        success: true,
        strategy: data,
        newVersion: data.version,
      }
    } catch (error) {
      console.error('[StrategyClient] Update strategy failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update strategy',
      }
    }
  }

  /**
   * 启动策略
   */
  async startStrategy(strategyId: string, userId: string): Promise<StrategyActionResponse> {
    return this.performStrategyAction(strategyId, userId, 'start')
  }

  /**
   * 暂停策略
   */
  async pauseStrategy(strategyId: string, userId: string): Promise<StrategyActionResponse> {
    return this.performStrategyAction(strategyId, userId, 'pause')
  }

  /**
   * 停止策略
   */
  async stopStrategy(strategyId: string, userId: string): Promise<StrategyActionResponse> {
    return this.performStrategyAction(strategyId, userId, 'stop')
  }

  /**
   * 删除策略
   */
  async deleteStrategy(strategyId: string, userId: string): Promise<StrategyActionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/strategies/${strategyId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: string }
        return {
          success: false,
          strategyId,
          status: 'error',
          error: error.message || `Failed to delete strategy: ${response.status}`,
        }
      }

      return {
        success: true,
        strategyId,
        status: 'deleted',
        message: 'Strategy deleted successfully',
      }
    } catch (error) {
      console.error('[StrategyClient] Delete strategy failed:', error)
      return {
        success: false,
        strategyId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to delete strategy',
      }
    }
  }

  /**
   * 编译策略 (生成 RuntimePlan)
   */
  async compileStrategy(
    strategyId: string,
    userId: string,
    version?: number
  ): Promise<{ success: boolean; runtimePlanId?: string; hash?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/strategies/${strategyId}/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ version }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: string }
        return {
          success: false,
          error: error.message || `Failed to compile strategy: ${response.status}`,
        }
      }

      const data = await response.json() as { runtimePlanId: string; hash: string }
      return {
        success: true,
        runtimePlanId: data.runtimePlanId,
        hash: data.hash,
      }
    } catch (error) {
      console.error('[StrategyClient] Compile strategy failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compile strategy',
      }
    }
  }

  /**
   * 执行策略操作 (start/pause/stop)
   */
  private async performStrategyAction(
    strategyId: string,
    userId: string,
    action: 'start' | 'pause' | 'stop'
  ): Promise<StrategyActionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/strategies/${strategyId}/${action}`, {
        method: 'POST',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: string }
        return {
          success: false,
          strategyId,
          status: 'error',
          error: error.message || `Failed to ${action} strategy: ${response.status}`,
        }
      }

      const data = await response.json() as { status: string; message?: string }
      return {
        success: true,
        strategyId,
        status: data.status,
        message: data.message,
      }
    } catch (error) {
      console.error(`[StrategyClient] ${action} strategy failed:`, error)
      return {
        success: false,
        strategyId,
        status: 'error',
        error: error instanceof Error ? error.message : `Failed to ${action} strategy`,
      }
    }
  }

  /**
   * 检查服务是否可用（使用缓存）
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
export const strategyClient = new StrategyClientService()

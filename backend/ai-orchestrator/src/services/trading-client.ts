/**
 * Trading Service 客户端
 *
 * 与交易引擎通信，获取持仓、订单、市场数据等
 */

// =============================================================================
// 配置
// =============================================================================

const TRADING_SERVICE_URL = process.env.TRADING_SERVICE_URL || 'http://localhost:4003'

// =============================================================================
// 类型定义
// =============================================================================

export interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  currentPrice: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  leverage: number
  margin: number
  liquidationPrice?: number
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  status: 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'
  price?: number
  stopPrice?: number
  quantity: number
  filledQuantity: number
  avgFillPrice?: number
  createdAt: string
  updatedAt: string
}

export interface AccountBalance {
  currency: string
  total: number
  available: number
  locked: number
  unrealizedPnL: number
}

export interface MarketData {
  symbol: string
  price: number
  change24h: number
  changePercent24h: number
  high24h: number
  low24h: number
  volume24h: number
  timestamp: number
}

export interface RiskMetrics {
  portfolioValue: number
  totalExposure: number
  marginUsed: number
  marginRate: number
  maxDrawdown: number
  var95: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

// =============================================================================
// Trading Service 客户端
// =============================================================================

export class TradingClientService {
  private baseUrl: string
  private isAvailable: boolean | null = null

  constructor() {
    this.baseUrl = TRADING_SERVICE_URL
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
   * 获取持仓列表
   */
  async getPositions(
    userId: string,
    symbol?: string
  ): Promise<{ success: boolean; positions: Position[]; error?: string }> {
    try {
      const params = new URLSearchParams()
      if (symbol) {
        params.set('symbol', symbol)
      }

      const url = `${this.baseUrl}/api/v1/positions?${params.toString()}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return {
          success: false,
          positions: [],
          error: `Failed to get positions: ${response.status}`,
        }
      }

      const data = await response.json() as { positions: Position[] }
      return {
        success: true,
        positions: data.positions || [],
      }
    } catch (error) {
      console.error('[TradingClient] Get positions failed:', error)
      return {
        success: false,
        positions: [],
        error: error instanceof Error ? error.message : 'Failed to get positions',
      }
    }
  }

  /**
   * 获取订单列表
   */
  async getOrders(
    userId: string,
    options?: {
      symbol?: string
      status?: 'open' | 'filled' | 'cancelled' | 'all'
      limit?: number
    }
  ): Promise<{ success: boolean; orders: Order[]; error?: string }> {
    try {
      const params = new URLSearchParams()
      if (options?.symbol) {
        params.set('symbol', options.symbol)
      }
      if (options?.status && options.status !== 'all') {
        params.set('status', options.status)
      }
      if (options?.limit) {
        params.set('limit', String(options.limit))
      }

      const url = `${this.baseUrl}/api/v1/orders?${params.toString()}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return {
          success: false,
          orders: [],
          error: `Failed to get orders: ${response.status}`,
        }
      }

      const data = await response.json() as { orders: Order[] }
      return {
        success: true,
        orders: data.orders || [],
      }
    } catch (error) {
      console.error('[TradingClient] Get orders failed:', error)
      return {
        success: false,
        orders: [],
        error: error instanceof Error ? error.message : 'Failed to get orders',
      }
    }
  }

  /**
   * 获取账户余额
   */
  async getBalance(userId: string): Promise<{ success: boolean; balances: AccountBalance[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/account/balance`, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return {
          success: false,
          balances: [],
          error: `Failed to get balance: ${response.status}`,
        }
      }

      const data = await response.json() as { balances: AccountBalance[] }
      return {
        success: true,
        balances: data.balances || [],
      }
    } catch (error) {
      console.error('[TradingClient] Get balance failed:', error)
      return {
        success: false,
        balances: [],
        error: error instanceof Error ? error.message : 'Failed to get balance',
      }
    }
  }

  /**
   * 获取风险指标
   */
  async getRiskMetrics(userId: string): Promise<{ success: boolean; metrics?: RiskMetrics; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/risk/metrics`, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get risk metrics: ${response.status}`,
        }
      }

      const data = await response.json() as RiskMetrics
      return {
        success: true,
        metrics: data,
      }
    } catch (error) {
      console.error('[TradingClient] Get risk metrics failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get risk metrics',
      }
    }
  }

  /**
   * 获取市场数据
   */
  async getMarketData(symbol: string): Promise<{ success: boolean; data?: MarketData; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/market/${encodeURIComponent(symbol)}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get market data: ${response.status}`,
        }
      }

      const data = await response.json() as MarketData
      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('[TradingClient] Get market data failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get market data',
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
export const tradingClient = new TradingClientService()

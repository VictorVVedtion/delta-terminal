/**
 * usePaperTrading Hook - Paper Trading 操作封装
 * Story 2: 虚拟账户与模拟订单系统
 */

import { useCallback, useEffect, useMemo } from 'react'
import {
  usePaperTradingStore,
  selectActiveAccount,
  selectAccountByAgentId,
} from '@/store/paperTrading'
import type {
  PaperAccount,
  PaperAccountStats,
  PlaceOrderParams,
  PlaceOrderResult,
  ClosePositionParams,
  ClosePositionResult,
  TradeSide,
} from '@/types/paperTrading'

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UsePaperTradingReturn {
  // 账户信息
  account: PaperAccount | null
  accountId: string | null
  stats: PaperAccountStats | null

  // 账户操作
  initAccount: (agentId: string, initialCapital: number) => string
  deleteAccount: (accountId: string) => void
  setActiveAccount: (accountId: string | null) => void

  // 交易操作
  buy: (symbol: string, size: number, currentPrice: number) => PlaceOrderResult
  sell: (symbol: string, size: number, currentPrice: number) => PlaceOrderResult
  closePosition: (positionId: string, currentPrice: number) => ClosePositionResult
  closeAllPositions: (currentPrices: Record<string, number>) => ClosePositionResult[]

  // 持仓更新
  updatePrice: (symbol: string, currentPrice: number) => void
  updateAllPrices: (priceMap: Record<string, number>) => void

  // 便捷方法
  getPositionBySymbol: (symbol: string) => PaperAccount['positions'][0] | undefined
  hasPosition: (symbol: string) => boolean
  canBuy: (symbol: string, size: number, price: number) => { can: boolean; reason?: string }
  canSell: (symbol: string, size: number) => { can: boolean; reason?: string }

  // 状态
  loading: boolean
  error: string | null
}

// =============================================================================
// Hook Options
// =============================================================================

export interface UsePaperTradingOptions {
  /** 账户 ID (如果不提供则使用 activeAccount) */
  accountId?: string
  /** Agent ID (用于自动查找账户) */
  agentId?: string
  /** 是否自动更新价格 */
  autoUpdatePrices?: boolean
  /** 价格更新间隔 (ms) */
  priceUpdateInterval?: number
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Paper Trading Hook
 *
 * @example
 * ```tsx
 * const { account, buy, sell, stats } = usePaperTrading({
 *   agentId: 'agent_1'
 * })
 *
 * // 买入 BTC
 * const result = buy('BTC/USDT', 0.01, 50000)
 *
 * // 卖出 BTC
 * const result = sell('BTC/USDT', 0.01, 51000)
 * ```
 */
export function usePaperTrading(
  options: UsePaperTradingOptions = {}
): UsePaperTradingReturn {
  const {
    accountId: providedAccountId,
    agentId,
    autoUpdatePrices = false,
    priceUpdateInterval = 5000,
  } = options

  // Store actions
  const {
    initAccount: storeInitAccount,
    getAccount,
    getAccountByAgentId: storeGetAccountByAgentId,
    deleteAccount: storeDeleteAccount,
    setActiveAccount: storeSetActiveAccount,
    placeMarketOrder,
    closePosition: storeClosePosition,
    updatePositionPrice,
    updateAllPositionPrices,
    getAccountStats,
  } = usePaperTradingStore()

  // 获取活跃账户
  const activeAccount = usePaperTradingStore(selectActiveAccount)

  // 确定当前使用的账户
  const account = useMemo(() => {
    if (providedAccountId) {
      return getAccount(providedAccountId) || null
    }
    if (agentId) {
      return storeGetAccountByAgentId(agentId) || null
    }
    return activeAccount
  }, [providedAccountId, agentId, activeAccount, getAccount, storeGetAccountByAgentId])

  const accountId = account?.id || null

  // 计算统计信息
  const stats = useMemo(() => {
    if (!accountId) return null
    return getAccountStats(accountId)
  }, [accountId, account, getAccountStats])

  // ===== 账户操作 =====

  const initAccount = useCallback(
    (agentId: string, initialCapital: number) => {
      return storeInitAccount(agentId, initialCapital)
    },
    [storeInitAccount]
  )

  const deleteAccount = useCallback(
    (accountId: string) => {
      storeDeleteAccount(accountId)
    },
    [storeDeleteAccount]
  )

  const setActiveAccount = useCallback(
    (accountId: string | null) => {
      storeSetActiveAccount(accountId)
    },
    [storeSetActiveAccount]
  )

  // ===== 交易操作 =====

  const buy = useCallback(
    (symbol: string, size: number, currentPrice: number): PlaceOrderResult => {
      if (!accountId) {
        return { success: false, error: '账户不存在' }
      }

      const params: PlaceOrderParams = {
        accountId,
        symbol,
        side: 'buy',
        type: 'market',
        size,
      }

      return placeMarketOrder(params, currentPrice)
    },
    [accountId, placeMarketOrder]
  )

  const sell = useCallback(
    (symbol: string, size: number, currentPrice: number): PlaceOrderResult => {
      if (!accountId) {
        return { success: false, error: '账户不存在' }
      }

      const params: PlaceOrderParams = {
        accountId,
        symbol,
        side: 'sell',
        type: 'market',
        size,
      }

      return placeMarketOrder(params, currentPrice)
    },
    [accountId, placeMarketOrder]
  )

  const closePosition = useCallback(
    (positionId: string, currentPrice: number): ClosePositionResult => {
      if (!accountId) {
        return { success: false, error: '账户不存在' }
      }

      const params: ClosePositionParams = {
        accountId,
        positionId,
      }

      return storeClosePosition(params, currentPrice)
    },
    [accountId, storeClosePosition]
  )

  const closeAllPositions = useCallback(
    (currentPrices: Record<string, number>): ClosePositionResult[] => {
      if (!account) {
        return [{ success: false, error: '账户不存在' }]
      }

      return account.positions.map((pos) => {
        const currentPrice = currentPrices[pos.symbol]
        if (!currentPrice) {
          return { success: false, error: `未找到 ${pos.symbol} 的价格` }
        }
        return closePosition(pos.id, currentPrice)
      })
    },
    [account, closePosition]
  )

  // ===== 持仓更新 =====

  const updatePrice = useCallback(
    (symbol: string, currentPrice: number) => {
      if (!accountId) return
      updatePositionPrice(accountId, symbol, currentPrice)
    },
    [accountId, updatePositionPrice]
  )

  const updateAllPrices = useCallback(
    (priceMap: Record<string, number>) => {
      if (!accountId) return
      updateAllPositionPrices(accountId, priceMap)
    },
    [accountId, updateAllPositionPrices]
  )

  // ===== 便捷方法 =====

  const getPositionBySymbol = useCallback(
    (symbol: string) => {
      if (!account) return undefined
      return account.positions.find((p) => p.symbol === symbol)
    },
    [account]
  )

  const hasPosition = useCallback(
    (symbol: string): boolean => {
      return !!getPositionBySymbol(symbol)
    },
    [getPositionBySymbol]
  )

  const canBuy = useCallback(
    (
      symbol: string,
      size: number,
      price: number
    ): { can: boolean; reason?: string } => {
      if (!account) {
        return { can: false, reason: '账户不存在' }
      }

      const orderValue = size * price
      const fee = orderValue * 0.001
      const totalCost = orderValue + fee

      if (totalCost > account.currentBalance) {
        return { can: false, reason: '余额不足' }
      }

      if (orderValue < 10) {
        return { can: false, reason: '订单金额不足 10 USDT' }
      }

      return { can: true }
    },
    [account]
  )

  const canSell = useCallback(
    (symbol: string, size: number): { can: boolean; reason?: string } => {
      if (!account) {
        return { can: false, reason: '账户不存在' }
      }

      const position = getPositionBySymbol(symbol)
      if (!position) {
        return { can: false, reason: '无持仓' }
      }

      if (position.size < size) {
        return { can: false, reason: '持仓不足' }
      }

      return { can: true }
    },
    [account, getPositionBySymbol]
  )

  // ===== 自动价格更新 (TODO: 集成 WebSocket) =====

  useEffect(() => {
    if (!autoUpdatePrices || !accountId || !account) return

    // TODO: 订阅 WebSocket 价格更新
    // 目前使用定时器模拟

    const interval = setInterval(() => {
      // 模拟价格更新
      const priceMap: Record<string, number> = {}
      account.positions.forEach((pos) => {
        // 模拟价格变化 ±1%
        const change = (Math.random() - 0.5) * 0.02
        priceMap[pos.symbol] = pos.currentPrice * (1 + change)
      })
      updateAllPrices(priceMap)
    }, priceUpdateInterval)

    return () => clearInterval(interval)
  }, [autoUpdatePrices, accountId, account, priceUpdateInterval, updateAllPrices])

  // ===== 返回值 =====

  return {
    // 账户信息
    account,
    accountId,
    stats,

    // 账户操作
    initAccount,
    deleteAccount,
    setActiveAccount,

    // 交易操作
    buy,
    sell,
    closePosition,
    closeAllPositions,

    // 持仓更新
    updatePrice,
    updateAllPrices,

    // 便捷方法
    getPositionBySymbol,
    hasPosition,
    canBuy,
    canSell,

    // 状态
    loading: false, // TODO: 实现加载状态
    error: null, // TODO: 实现错误处理
  }
}

// =============================================================================
// 辅助 Hook: 使用 Agent ID
// =============================================================================

/**
 * 通过 Agent ID 使用 Paper Trading
 */
export function usePaperTradingByAgent(agentId: string) {
  return usePaperTrading({ agentId })
}

// =============================================================================
// 辅助 Hook: 获取所有账户
// =============================================================================

/**
 * 获取所有 Paper Trading 账户
 */
export function usePaperTradingAccounts() {
  const accounts = usePaperTradingStore((state) => state.accounts)
  const activeAccountId = usePaperTradingStore((state) => state.activeAccountId)

  return {
    accounts,
    activeAccountId,
  }
}

export default usePaperTrading

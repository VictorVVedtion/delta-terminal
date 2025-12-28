/**
 * usePaperTrading Hook - Paper Trading 操作封装
 * Story 2: 虚拟账户与模拟订单系统
 */

import { useCallback, useEffect, useMemo } from 'react'

import {
  selectAccountByAgentId as _selectAccountByAgentId,
  selectAllAccounts,
  usePaperTradingStore,
} from '@/store/paperTrading'
import type {
  ClosePositionParams,
  ClosePositionResult,
  PaperAccount,
  PaperAccountStats,
  PlaceOrderParams,
  PlaceOrderResult,
  TradeSide as _TradeSide,
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

  // 订阅所有需要的状态以确保更新触发重渲染
  const accounts = usePaperTradingStore(selectAllAccounts)
  const activeAccountId = usePaperTradingStore((state) => state.activeAccountId)

  // 确定当前使用的账户（统一使用 accounts 数组查找确保实时更新）
  const account = useMemo(() => {
    if (providedAccountId) {
      return accounts.find((acc) => acc.id === providedAccountId) || null
    }
    if (agentId) {
      return accounts.find((acc) => acc.agentId === agentId) || null
    }
    // 使用 activeAccountId 从 accounts 中查找，而不是依赖单独的 activeAccount 订阅
    if (activeAccountId) {
      return accounts.find((acc) => acc.id === activeAccountId) || null
    }
    return null
  }, [providedAccountId, agentId, activeAccountId, accounts])

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

  // 辅助函数：获取当前有效的 accountId（支持实时获取最新状态）
  const getEffectiveAccountId = useCallback(() => {
    // 优先使用提供的 accountId
    if (providedAccountId) return providedAccountId
    // 其次使用 agentId 查找
    if (agentId) {
      const state = usePaperTradingStore.getState()
      const acc = state.accounts.find((a) => a.agentId === agentId)
      return acc?.id || null
    }
    // 最后使用 activeAccountId（从 store 实时获取以确保最新）
    return usePaperTradingStore.getState().activeAccountId
  }, [providedAccountId, agentId])

  const buy = useCallback(
    (symbol: string, size: number, currentPrice: number): PlaceOrderResult => {
      const effectiveAccountId = getEffectiveAccountId()
      if (!effectiveAccountId) {
        return { success: false, error: '账户不存在' }
      }

      const params: PlaceOrderParams = {
        accountId: effectiveAccountId,
        symbol,
        side: 'buy',
        type: 'market',
        size,
      }

      return placeMarketOrder(params, currentPrice)
    },
    [getEffectiveAccountId, placeMarketOrder]
  )

  const sell = useCallback(
    (symbol: string, size: number, currentPrice: number): PlaceOrderResult => {
      const effectiveAccountId = getEffectiveAccountId()
      if (!effectiveAccountId) {
        return { success: false, error: '账户不存在' }
      }

      const params: PlaceOrderParams = {
        accountId: effectiveAccountId,
        symbol,
        side: 'sell',
        type: 'market',
        size,
      }

      return placeMarketOrder(params, currentPrice)
    },
    [getEffectiveAccountId, placeMarketOrder]
  )

  const closePosition = useCallback(
    (positionId: string, currentPrice: number): ClosePositionResult => {
      const effectiveAccountId = getEffectiveAccountId()
      if (!effectiveAccountId) {
        return { success: false, error: '账户不存在' }
      }

      const params: ClosePositionParams = {
        accountId: effectiveAccountId,
        positionId,
      }

      return storeClosePosition(params, currentPrice)
    },
    [getEffectiveAccountId, storeClosePosition]
  )

  // 辅助函数：获取当前有效的账户对象（支持实时获取最新状态）
  const getEffectiveAccount = useCallback(() => {
    const state = usePaperTradingStore.getState()
    const effectiveAccountId = getEffectiveAccountId()
    if (!effectiveAccountId) return null
    return state.accounts.find((acc) => acc.id === effectiveAccountId) || null
  }, [getEffectiveAccountId])

  const closeAllPositions = useCallback(
    (currentPrices: Record<string, number>): ClosePositionResult[] => {
      const currentAccount = getEffectiveAccount()
      if (!currentAccount) {
        return [{ success: false, error: '账户不存在' }]
      }

      return currentAccount.positions.map((pos) => {
        const currentPrice = currentPrices[pos.symbol]
        if (!currentPrice) {
          return { success: false, error: `未找到 ${pos.symbol} 的价格` }
        }
        return closePosition(pos.id, currentPrice)
      })
    },
    [getEffectiveAccount, closePosition]
  )

  // ===== 持仓更新 =====

  const updatePrice = useCallback(
    (symbol: string, currentPrice: number) => {
      const effectiveAccountId = getEffectiveAccountId()
      if (!effectiveAccountId) return
      updatePositionPrice(effectiveAccountId, symbol, currentPrice)
    },
    [getEffectiveAccountId, updatePositionPrice]
  )

  const updateAllPrices = useCallback(
    (priceMap: Record<string, number>) => {
      const effectiveAccountId = getEffectiveAccountId()
      if (!effectiveAccountId) return
      updateAllPositionPrices(effectiveAccountId, priceMap)
    },
    [getEffectiveAccountId, updateAllPositionPrices]
  )

  // ===== 便捷方法 =====

  // 使用 getEffectiveAccount 获取最新持仓数据，确保实时性
  const getPositionBySymbol = useCallback(
    (symbol: string) => {
      const currentAccount = getEffectiveAccount()
      if (!currentAccount) return undefined
      return currentAccount.positions.find((p) => p.symbol === symbol)
    },
    [getEffectiveAccount]
  )

  const hasPosition = useCallback(
    (symbol: string): boolean => {
      const currentAccount = getEffectiveAccount()
      if (!currentAccount) return false
      return currentAccount.positions.some((p) => p.symbol === symbol)
    },
    [getEffectiveAccount]
  )

  const canBuy = useCallback(
    (
      symbol: string,
      size: number,
      price: number
    ): { can: boolean; reason?: string } => {
      const currentAccount = getEffectiveAccount()
      if (!currentAccount) {
        return { can: false, reason: '账户不存在' }
      }

      const orderValue = size * price
      const fee = orderValue * 0.001
      const totalCost = orderValue + fee

      if (totalCost > currentAccount.currentBalance) {
        return { can: false, reason: '余额不足' }
      }

      if (orderValue < 10) {
        return { can: false, reason: '订单金额不足 10 USDT' }
      }

      return { can: true }
    },
    [getEffectiveAccount]
  )

  const canSell = useCallback(
    (symbol: string, size: number): { can: boolean; reason?: string } => {
      const currentAccount = getEffectiveAccount()
      if (!currentAccount) {
        return { can: false, reason: '账户不存在' }
      }

      const position = currentAccount.positions.find((p) => p.symbol === symbol)
      if (!position) {
        return { can: false, reason: '无持仓' }
      }

      if (position.size < size) {
        return { can: false, reason: '持仓不足' }
      }

      return { can: true }
    },
    [getEffectiveAccount]
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

    return () => { clearInterval(interval); }
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

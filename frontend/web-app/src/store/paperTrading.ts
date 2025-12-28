/**
 * Paper Trading Store - 虚拟账户与模拟订单状态管理
 * Story 2: 虚拟账户与模拟订单系统
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { fetchRemoteAccountsFromSupabase, persistAccountsToSupabase } from '@/lib/paperTradingSync'
import type {
  ClosePositionParams,
  ClosePositionResult,
  PaperAccount,
  PaperAccountStats,
  PaperPosition,
  PaperTrade,
  PlaceOrderParams,
  PlaceOrderResult,
  PositionSide,
  TradeSide,
} from '@/types/paperTrading'

// =============================================================================
// Constants
// =============================================================================

const FEE_RATE = 0.001 // 0.1% Taker Fee
const MIN_ORDER_VALUE = 10 // 最小 10 USDT

// =============================================================================
// Store State
// =============================================================================

export interface PaperTradingState {
  /** 所有虚拟账户 */
  accounts: PaperAccount[]
  /** 当前活跃账户 ID */
  activeAccountId: string | null
}

// =============================================================================
// Store Actions
// =============================================================================

export interface PaperTradingActions {
  // 账户管理
  /** 初始化虚拟账户 */
  initAccount: (agentId: string, initialCapital: number) => string
  /** 获取账户 */
  getAccount: (accountId: string) => PaperAccount | undefined
  /** 获取 Agent 的账户 */
  getAccountByAgentId: (agentId: string) => PaperAccount | undefined
  /** 删除账户 */
  deleteAccount: (accountId: string) => void
  /** 设置活跃账户 */
  setActiveAccount: (accountId: string | null) => void

  // 交易操作
  /** 下单 (市价单) */
  placeMarketOrder: (params: PlaceOrderParams, currentPrice: number) => PlaceOrderResult
  /** 平仓 */
  closePosition: (params: ClosePositionParams, currentPrice: number) => ClosePositionResult

  // 持仓更新
  /** 更新持仓市价 (用于计算未实现盈亏) */
  updatePositionPrice: (accountId: string, symbol: string, currentPrice: number) => void
  /** 批量更新所有持仓市价 */
  updateAllPositionPrices: (accountId: string, priceMap: Record<string, number>) => void

  // 统计计算
  /** 计算账户统计 */
  getAccountStats: (accountId: string) => PaperAccountStats | null

  // 清除数据
  /** 重置所有数据 */
  reset: () => void
}

export type PaperTradingStore = PaperTradingState & PaperTradingActions

// =============================================================================
// Initial State
// =============================================================================

const initialState: PaperTradingState = {
  accounts: [],
  activeAccountId: null,
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 计算交易总成本/收益
 */
function calculateTradeTotal(side: TradeSide, size: number, price: number, fee: number): number {
  const base = size * price
  if (side === 'buy') {
    return -(base + fee) // 买入是负数 (花费)
  } else {
    return base - fee // 卖出是正数 (收入)
  }
}

/**
 * 计算未实现盈亏
 */
function calculateUnrealizedPnl(
  side: PositionSide,
  entryPrice: number,
  currentPrice: number,
  size: number
): { pnl: number; pnlPercent: number } {
  let pnl = 0
  if (side === 'long') {
    pnl = (currentPrice - entryPrice) * size
  } else {
    pnl = (entryPrice - currentPrice) * size
  }
  const pnlPercent = (pnl / (entryPrice * size)) * 100
  return { pnl, pnlPercent }
}

/**
 * 计算已实现盈亏
 */
function calculateRealizedPnl(position: PaperPosition, exitPrice: number, fee: number): number {
  const { side, entryPrice, size } = position
  let pnl = 0
  if (side === 'long') {
    pnl = (exitPrice - entryPrice) * size - fee
  } else {
    pnl = (entryPrice - exitPrice) * size - fee
  }
  return pnl
}

// =============================================================================
// Store Implementation
// =============================================================================

export const usePaperTradingStore = create<PaperTradingStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...initialState,

        // ===== 账户管理 =====

        initAccount: (agentId, initialCapital) => {
          const accountId = generateId('paper_account')
          const now = Date.now()

          const account: PaperAccount = {
            id: accountId,
            agentId,
            initialCapital,
            currentBalance: initialCapital,
            positions: [],
            trades: [],
            createdAt: now,
            updatedAt: now,
          }

          set((state) => ({
            accounts: [...state.accounts, account],
            activeAccountId: accountId,
          }))

          return accountId
        },

        getAccount: (accountId) => {
          return get().accounts.find((acc) => acc.id === accountId)
        },

        getAccountByAgentId: (agentId) => {
          return get().accounts.find((acc) => acc.agentId === agentId)
        },

        deleteAccount: (accountId) => {
          set((state) => ({
            accounts: state.accounts.filter((acc) => acc.id !== accountId),
            activeAccountId: state.activeAccountId === accountId ? null : state.activeAccountId,
          }))
        },

        setActiveAccount: (accountId) => {
          set({ activeAccountId: accountId })
        },

        // ===== 交易操作 =====

        placeMarketOrder: (params, currentPrice) => {
          const { accountId, symbol, side, size } = params
          const account = get().getAccount(accountId)

          if (!account) {
            return { success: false, error: '账户不存在' }
          }

          // 计算交易金额
          const orderValue = size * currentPrice
          if (orderValue < MIN_ORDER_VALUE) {
            return { success: false, error: `订单金额不足 ${MIN_ORDER_VALUE} USDT` }
          }

          // 计算手续费
          const fee = orderValue * FEE_RATE

          // 买入: 检查余额
          if (side === 'buy') {
            const totalCost = orderValue + fee
            if (account.currentBalance < totalCost) {
              return { success: false, error: '余额不足' }
            }
          }

          // 卖出: 检查持仓
          if (side === 'sell') {
            const position = account.positions.find((p) => p.symbol === symbol)
            if (!position || position.size < size) {
              return { success: false, error: '持仓不足' }
            }
          }

          // 创建交易记录
          const tradeId = generateId('paper_trade')
          const now = Date.now()
          const total = calculateTradeTotal(side, size, currentPrice, fee)

          const trade: PaperTrade = {
            id: tradeId,
            accountId,
            symbol,
            side,
            type: 'market',
            size,
            price: currentPrice,
            fee,
            feeRate: FEE_RATE,
            total,
            timestamp: now,
          }

          // 更新账户状态
          set((state) => {
            const accounts = state.accounts.map((acc) => {
              if (acc.id !== accountId) return acc

              const newBalance = acc.currentBalance + total
              let newPositions = [...acc.positions]

              if (side === 'buy') {
                // 买入: 增加持仓或创建新持仓
                const existingPosIndex = newPositions.findIndex(
                  (p) => p.symbol === symbol && p.side === 'long'
                )

                if (existingPosIndex >= 0) {
                  // 更新现有持仓
                  const existingPos = newPositions[existingPosIndex]
                  const totalSize = existingPos.size + size
                  const newEntryPrice =
                    (existingPos.entryPrice * existingPos.size + currentPrice * size) / totalSize

                  newPositions[existingPosIndex] = {
                    id: existingPos.id,
                    symbol: existingPos.symbol,
                    side: existingPos.side,
                    size: totalSize,
                    entryPrice: newEntryPrice,
                    currentPrice,
                    unrealizedPnl: existingPos.unrealizedPnl,
                    unrealizedPnlPercent: existingPos.unrealizedPnlPercent,
                    openedAt: existingPos.openedAt,
                    updatedAt: now,
                  }
                } else {
                  // 创建新持仓
                  const newPosition: PaperPosition = {
                    id: generateId('paper_position'),
                    symbol,
                    side: 'long',
                    size,
                    entryPrice: currentPrice,
                    currentPrice,
                    unrealizedPnl: 0,
                    unrealizedPnlPercent: 0,
                    openedAt: now,
                    updatedAt: now,
                  }
                  newPositions.push(newPosition)
                }
              } else {
                // 卖出: 减少或关闭持仓
                const existingPosIndex = newPositions.findIndex(
                  (p) => p.symbol === symbol && p.side === 'long'
                )

                if (existingPosIndex >= 0) {
                  const existingPos = newPositions[existingPosIndex]

                  // 计算已实现盈亏 - 创建符合 PaperPosition 类型的对象
                  const posForCalc: PaperPosition = {
                    id: existingPos.id,
                    symbol: existingPos.symbol,
                    side: existingPos.side,
                    size: size,
                    entryPrice: existingPos.entryPrice,
                    currentPrice: existingPos.currentPrice,
                    unrealizedPnl: 0,
                    unrealizedPnlPercent: 0,
                    openedAt: existingPos.openedAt,
                    updatedAt: existingPos.updatedAt,
                  }
                  const realizedPnl = calculateRealizedPnl(posForCalc, currentPrice, fee)
                  trade.realizedPnl = realizedPnl

                  if (existingPos.size === size) {
                    // 完全平仓
                    newPositions.splice(existingPosIndex, 1)
                  } else {
                    // 部分平仓
                    newPositions[existingPosIndex] = {
                      id: existingPos.id,
                      symbol: existingPos.symbol,
                      side: existingPos.side,
                      size: existingPos.size - size,
                      entryPrice: existingPos.entryPrice,
                      currentPrice,
                      unrealizedPnl: existingPos.unrealizedPnl,
                      unrealizedPnlPercent: existingPos.unrealizedPnlPercent,
                      openedAt: existingPos.openedAt,
                      updatedAt: now,
                    }
                  }
                }
              }

              // 重新计算所有持仓的未实现盈亏
              newPositions = newPositions.map((pos) => {
                const { pnl, pnlPercent } = calculateUnrealizedPnl(
                  pos.side,
                  pos.entryPrice,
                  pos.currentPrice,
                  pos.size
                )
                return {
                  ...pos,
                  unrealizedPnl: pnl,
                  unrealizedPnlPercent: pnlPercent,
                }
              })

              return {
                ...acc,
                currentBalance: newBalance,
                positions: newPositions,
                trades: [...acc.trades, trade],
                updatedAt: now,
              }
            })

            return { accounts }
          })

          return { success: true, trade }
        },

        closePosition: (params, currentPrice) => {
          const { accountId, positionId } = params
          const account = get().getAccount(accountId)

          if (!account) {
            return { success: false, error: '账户不存在' }
          }

          const position = account.positions.find((p) => p.id === positionId)
          if (!position) {
            return { success: false, error: '持仓不存在' }
          }

          // 执行平仓 (市价卖出)
          const result = get().placeMarketOrder(
            {
              accountId,
              symbol: position.symbol,
              side: 'sell',
              type: 'market',
              size: position.size,
            },
            currentPrice
          )

          if (result.success && result.trade) {
            const closeResult: ClosePositionResult = {
              success: true as const,
              trade: result.trade,
            }
            if (result.trade.realizedPnl !== undefined) {
              closeResult.realizedPnl = result.trade.realizedPnl
            }
            return closeResult
          }

          return { success: false, error: result.error ?? '下单失败' }
        },

        // ===== 持仓更新 =====

        updatePositionPrice: (accountId, symbol, currentPrice) => {
          set((state) => {
            const accounts = state.accounts.map((acc) => {
              if (acc.id !== accountId) return acc

              const positions = acc.positions.map((pos) => {
                if (pos.symbol !== symbol) return pos

                const { pnl, pnlPercent } = calculateUnrealizedPnl(
                  pos.side,
                  pos.entryPrice,
                  currentPrice,
                  pos.size
                )

                return {
                  ...pos,
                  currentPrice,
                  unrealizedPnl: pnl,
                  unrealizedPnlPercent: pnlPercent,
                  updatedAt: Date.now(),
                }
              })

              return { ...acc, positions, updatedAt: Date.now() }
            })

            return { accounts }
          })
        },

        updateAllPositionPrices: (accountId, priceMap) => {
          set((state) => {
            const accounts = state.accounts.map((acc) => {
              if (acc.id !== accountId) return acc

              const positions = acc.positions.map((pos) => {
                const currentPrice = priceMap[pos.symbol]
                if (!currentPrice) return pos

                const { pnl, pnlPercent } = calculateUnrealizedPnl(
                  pos.side,
                  pos.entryPrice,
                  currentPrice,
                  pos.size
                )

                return {
                  ...pos,
                  currentPrice,
                  unrealizedPnl: pnl,
                  unrealizedPnlPercent: pnlPercent,
                  updatedAt: Date.now(),
                }
              })

              return { ...acc, positions, updatedAt: Date.now() }
            })

            return { accounts }
          })
        },

        // ===== 统计计算 =====

        getAccountStats: (accountId) => {
          const account = get().getAccount(accountId)
          if (!account) return null

          // 计算总资产
          const positionValue = account.positions.reduce(
            (sum, pos) => sum + pos.currentPrice * pos.size,
            0
          )
          const totalEquity = account.currentBalance + positionValue

          // 计算总盈亏
          const totalPnl = totalEquity - account.initialCapital
          const totalPnlPercent = (totalPnl / account.initialCapital) * 100

          // 计算未实现盈亏
          const unrealizedPnl = account.positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0)

          // 计算已实现盈亏
          const realizedPnl = account.trades.reduce(
            (sum, trade) => sum + (trade.realizedPnl || 0),
            0
          )

          // 计算交易统计
          const closedTrades = account.trades.filter((t) => t.realizedPnl !== undefined)
          const totalTrades = closedTrades.length
          const winTrades = closedTrades.filter((t) => (t.realizedPnl || 0) > 0).length
          const lossTrades = closedTrades.filter((t) => (t.realizedPnl || 0) < 0).length
          const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0

          // 计算平均盈亏
          const wins = closedTrades
            .filter((t) => (t.realizedPnl || 0) > 0)
            .map((t) => t.realizedPnl || 0)
          const losses = closedTrades
            .filter((t) => (t.realizedPnl || 0) < 0)
            .map((t) => t.realizedPnl || 0)

          const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0
          const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0

          // 计算总手续费
          const totalFees = account.trades.reduce((sum, trade) => sum + trade.fee, 0)

          // TODO: 计算最大回撤 (需要历史权益曲线数据)
          const maxDrawdown = 0

          return {
            accountId,
            totalEquity,
            totalPnl,
            totalPnlPercent,
            unrealizedPnl,
            realizedPnl,
            totalTrades,
            winTrades,
            lossTrades,
            winRate,
            maxDrawdown,
            avgWin,
            avgLoss,
            totalFees,
          }
        },

        // ===== 清除数据 =====

        reset: () => {
          set(initialState)
        },
      }),
      {
        name: 'paper-trading-storage',
        // 只持久化账户数据
        partialize: (state) => ({
          accounts: state.accounts,
          activeAccountId: state.activeAccountId,
        }),
        // 启动时从 Supabase 拉取远程数据并合并
        onRehydrateStorage: () => (state) => {
          if (!state) return
          void (async () => {
            try {
              const remoteAccounts = await fetchRemoteAccountsFromSupabase()
              if (!remoteAccounts.length) return

              // 合并本地和远程账户（以远程为准）
              const localMap = new Map(state.accounts.map((a) => [a.id, a]))
              remoteAccounts.forEach((a) => localMap.set(a.id, a))
              const merged = Array.from(localMap.values())

              usePaperTradingStore.setState({
                accounts: merged,
                activeAccountId: state.activeAccountId ?? merged[0]?.id ?? null,
              })
            } catch (err) {
              console.warn('[PaperTrading] 同步远程数据失败:', err)
            }
          })()
        },
      }
    ),
    {
      name: 'paper-trading-store',
    }
  )
)

// 订阅 accounts 变化，自动同步到 Supabase
if (typeof window !== 'undefined') {
  usePaperTradingStore.subscribe((state, prevState) => {
    if (state.accounts !== prevState.accounts) {
      void persistAccountsToSupabase(state.accounts)
    }
  })
}

// =============================================================================
// Selectors
// =============================================================================

/**
 * 选择所有账户
 */
export const selectAllAccounts = (state: PaperTradingStore) => state.accounts

/**
 * 选择活跃账户
 */
export const selectActiveAccount = (state: PaperTradingStore) => {
  if (!state.activeAccountId) return null
  return state.accounts.find((acc) => acc.id === state.activeAccountId) || null
}

/**
 * 选择指定 Agent 的账户
 */
export const selectAccountByAgentId = (agentId: string) => (state: PaperTradingStore) => {
  return state.accounts.find((acc) => acc.agentId === agentId)
}

/**
 * 选择指定 ID 的账户
 */
export const selectAccountById = (accountId: string) => (state: PaperTradingStore) => {
  return state.accounts.find((acc) => acc.id === accountId)
}

export default usePaperTradingStore

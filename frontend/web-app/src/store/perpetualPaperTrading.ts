/**
 * Perpetual Paper Trading Store - 永续合约模拟交易状态管理
 *
 * 管理虚拟账户、模拟持仓、交易执行
 * 支持杠杆交易、做空、爆仓模拟
 */

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'

import type {
  PerpetualPaperAccount,
  PerpetualPaperPosition,
  PerpetualPaperTrade,
  PerpetualLiquidation,
  PerpetualPaperAccountStats,
  OpenPositionParams,
  OpenPositionResult,
  ClosePositionParams,
  ClosePositionResult,
  SetTpSlParams,
  PositionSide,
  MarginMode,
} from '@/types/perpetualPaperTrading'
import {
  DEFAULT_PERPETUAL_PAPER_CONFIG,
  getMaintenanceMarginRate,
  getMaxLeverage,
  calculateUnrealizedPnl,
  calculateROE,
  calculateLiquidationPrice,
  calculateInitialMargin,
  calculateMaintenanceMargin,
  calculateMarginRatio,
  calculateRiskLevel,
  checkLiquidation,
  generateId,
} from '@/types/perpetualPaperTrading'
import type { RiskLevel } from '@/types/perpetual'

// =============================================================================
// State Types
// =============================================================================

interface PerpetualPaperTradingState {
  /** 当前账户 */
  account: PerpetualPaperAccount | null
  /** 是否已初始化 */
  isInitialized: boolean
  /** 配置 */
  config: typeof DEFAULT_PERPETUAL_PAPER_CONFIG
  /** 价格缓存 */
  priceCache: Record<string, number>
}

interface PerpetualPaperTradingActions {
  // 账户管理
  initAccount: (initialCapital: number, userId?: string, agentId?: string) => void
  resetAccount: () => void
  deleteAccount: () => void

  // 交易操作
  openPosition: (params: OpenPositionParams) => OpenPositionResult
  closePosition: (params: ClosePositionParams) => ClosePositionResult
  closeAllPositions: (price: Record<string, number>) => void

  // 持仓管理
  updatePositionPrice: (coin: string, markPrice: number) => void
  updateAllPrices: (prices: Record<string, number>) => void
  setTpSl: (params: SetTpSlParams) => boolean
  adjustLeverage: (positionId: string, newLeverage: number) => boolean

  // 爆仓检查
  checkAndExecuteLiquidations: () => PerpetualLiquidation[]

  // 统计
  getAccountStats: () => PerpetualPaperAccountStats | null

  // 选择器
  getPosition: (positionId: string) => PerpetualPaperPosition | undefined
  getPositionByCoin: (coin: string) => PerpetualPaperPosition | undefined
  getLongPositions: () => PerpetualPaperPosition[]
  getShortPositions: () => PerpetualPaperPosition[]
}

export type PerpetualPaperTradingStore = PerpetualPaperTradingState & PerpetualPaperTradingActions

// =============================================================================
// Initial State
// =============================================================================

const initialState: PerpetualPaperTradingState = {
  account: null,
  isInitialized: false,
  config: DEFAULT_PERPETUAL_PAPER_CONFIG,
  priceCache: {},
}

// =============================================================================
// Store Implementation
// =============================================================================

export const usePerpetualPaperTradingStore = create<PerpetualPaperTradingStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,

        // =====================================================================
        // 账户管理
        // =====================================================================

        initAccount: (initialCapital, userId = 'default-user', agentId) => {
          const account: PerpetualPaperAccount = {
            id: generateId(),
            userId,
            agentId,
            initialCapital,
            walletBalance: initialCapital,
            totalEquity: initialCapital,
            availableMargin: initialCapital,
            usedMargin: 0,
            maintenanceMargin: 0,
            marginRatio: 999,
            riskLevel: 'safe',
            totalUnrealizedPnl: 0,
            totalRealizedPnl: 0,
            positions: [],
            trades: [],
            liquidations: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }

          set({ account, isInitialized: true })
        },

        resetAccount: () => {
          const { account } = get()
          if (!account) return

          set({
            account: {
              ...account,
              walletBalance: account.initialCapital,
              totalEquity: account.initialCapital,
              availableMargin: account.initialCapital,
              usedMargin: 0,
              maintenanceMargin: 0,
              marginRatio: 999,
              riskLevel: 'safe',
              totalUnrealizedPnl: 0,
              totalRealizedPnl: 0,
              positions: [],
              trades: [],
              liquidations: [],
              updatedAt: Date.now(),
            },
          })
        },

        deleteAccount: () => {
          set({ account: null, isInitialized: false, priceCache: {} })
        },

        // =====================================================================
        // 交易操作
        // =====================================================================

        openPosition: (params) => {
          const { account, config } = get()

          if (!account) {
            return { success: false, error: 'Account not initialized' }
          }

          const { symbol, coin, side, size, price, leverage, marginMode = 'cross' } = params
          const maxLev = getMaxLeverage(coin)

          // 验证杠杆
          if (leverage > maxLev) {
            return { success: false, error: `Max leverage for ${coin} is ${maxLev}x` }
          }

          // 计算名义价值和保证金
          const notionalValue = price * size
          const initialMargin = calculateInitialMargin(notionalValue, leverage)
          const fee = notionalValue * config.defaultFeeRate

          // 检查余额
          const requiredMargin = initialMargin + fee
          if (requiredMargin > account.availableMargin) {
            return { success: false, error: `Insufficient margin. Required: ${requiredMargin.toFixed(2)} USDT` }
          }

          // 检查最小订单金额
          if (notionalValue < config.minOrderValue) {
            return { success: false, error: `Minimum order value is ${config.minOrderValue} USDT` }
          }

          // 检查是否已有相同方向的持仓
          const existingPosition = account.positions.find(
            (p) => p.coin === coin && p.side === side
          )

          if (existingPosition) {
            // 加仓逻辑
            return addToPosition(get, set, existingPosition, params, fee)
          }

          // 创建新持仓
          const maintenanceMarginRate = getMaintenanceMarginRate(coin)
          const maintenanceMargin = calculateMaintenanceMargin(notionalValue, maintenanceMarginRate)
          const liquidationPrice = calculateLiquidationPrice(side, price, leverage, maintenanceMarginRate)

          const positionId = generateId()
          const now = Date.now()

          const newPosition: PerpetualPaperPosition = {
            id: positionId,
            accountId: account.id,
            symbol,
            coin,
            side,
            size,
            notionalValue,
            entryPrice: price,
            markPrice: price,
            liquidationPrice,
            leverage,
            marginMode,
            initialMargin,
            maintenanceMargin,
            unrealizedPnl: 0,
            unrealizedPnlPercent: 0,
            returnOnEquity: 0,
            takeProfitPrice: params.takeProfitPrice ?? null,
            stopLossPrice: params.stopLossPrice ?? null,
            openedAt: now,
            updatedAt: now,
          }

          const trade: PerpetualPaperTrade = {
            id: generateId(),
            accountId: account.id,
            positionId,
            symbol,
            coin,
            side: side === 'long' ? 'buy' : 'sell',
            positionSide: side,
            orderType: 'market',
            action: 'open',
            size,
            price,
            notionalValue,
            leverage,
            fee,
            realizedPnl: null,
            timestamp: now,
          }

          // 更新账户
          const newWalletBalance = account.walletBalance - fee
          const newUsedMargin = account.usedMargin + initialMargin
          const newMaintenanceMargin = account.maintenanceMargin + maintenanceMargin
          const newAvailableMargin = newWalletBalance - newUsedMargin
          const newTotalEquity = newWalletBalance + 0 // unrealizedPnl = 0 for new position
          const newMarginRatio = calculateMarginRatio(newTotalEquity, newMaintenanceMargin)
          const newRiskLevel = calculateRiskLevel(newMarginRatio)

          set({
            account: {
              ...account,
              walletBalance: newWalletBalance,
              totalEquity: newTotalEquity,
              availableMargin: newAvailableMargin,
              usedMargin: newUsedMargin,
              maintenanceMargin: newMaintenanceMargin,
              marginRatio: newMarginRatio,
              riskLevel: newRiskLevel,
              positions: [...account.positions, newPosition],
              trades: [...account.trades, trade],
              updatedAt: now,
            },
          })

          return { success: true, position: newPosition, trade }
        },

        closePosition: (params) => {
          const { account, config } = get()

          if (!account) {
            return { success: false, error: 'Account not initialized' }
          }

          const { positionId, price, size: closeSize } = params
          const position = account.positions.find((p) => p.id === positionId)

          if (!position) {
            return { success: false, error: 'Position not found' }
          }

          const actualCloseSize = closeSize ?? position.size
          if (actualCloseSize > position.size) {
            return { success: false, error: 'Close size exceeds position size' }
          }

          const isFullClose = actualCloseSize >= position.size
          const now = Date.now()

          // 计算已实现盈亏
          const { pnl } = calculateUnrealizedPnl(
            position.side,
            position.entryPrice,
            price,
            actualCloseSize
          )

          const closeNotionalValue = price * actualCloseSize
          const fee = closeNotionalValue * config.defaultFeeRate
          const realizedPnl = pnl - fee

          // 计算释放的保证金
          const releasedMargin = (actualCloseSize / position.size) * position.initialMargin
          const releasedMaintenanceMargin = (actualCloseSize / position.size) * position.maintenanceMargin

          const trade: PerpetualPaperTrade = {
            id: generateId(),
            accountId: account.id,
            positionId,
            symbol: position.symbol,
            coin: position.coin,
            side: position.side === 'long' ? 'sell' : 'buy',
            positionSide: position.side,
            orderType: 'market',
            action: isFullClose ? 'close' : 'reduce',
            size: actualCloseSize,
            price,
            notionalValue: closeNotionalValue,
            leverage: position.leverage,
            fee,
            realizedPnl,
            timestamp: now,
          }

          // 更新账户
          let newPositions: PerpetualPaperPosition[]
          if (isFullClose) {
            newPositions = account.positions.filter((p) => p.id !== positionId)
          } else {
            // 部分平仓
            const remainingSize = position.size - actualCloseSize
            const remainingNotional = position.entryPrice * remainingSize
            const remainingInitialMargin = calculateInitialMargin(remainingNotional, position.leverage)
            const maintenanceMarginRate = getMaintenanceMarginRate(position.coin)
            const remainingMaintenanceMargin = calculateMaintenanceMargin(remainingNotional, maintenanceMarginRate)

            newPositions = account.positions.map((p) =>
              p.id === positionId
                ? {
                    ...p,
                    size: remainingSize,
                    notionalValue: remainingNotional,
                    initialMargin: remainingInitialMargin,
                    maintenanceMargin: remainingMaintenanceMargin,
                    updatedAt: now,
                  }
                : p
            )
          }

          const newWalletBalance = account.walletBalance + releasedMargin + realizedPnl
          const newUsedMargin = account.usedMargin - releasedMargin
          const newMaintenanceMargin = account.maintenanceMargin - releasedMaintenanceMargin

          // 重新计算未实现盈亏
          const newTotalUnrealizedPnl = newPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0)
          const newTotalEquity = newWalletBalance + newTotalUnrealizedPnl
          const newAvailableMargin = newWalletBalance - newUsedMargin
          const newMarginRatio = calculateMarginRatio(newTotalEquity, newMaintenanceMargin)
          const newRiskLevel = calculateRiskLevel(newMarginRatio)

          set({
            account: {
              ...account,
              walletBalance: newWalletBalance,
              totalEquity: newTotalEquity,
              availableMargin: newAvailableMargin,
              usedMargin: newUsedMargin,
              maintenanceMargin: newMaintenanceMargin,
              marginRatio: newMarginRatio,
              riskLevel: newRiskLevel,
              totalUnrealizedPnl: newTotalUnrealizedPnl,
              totalRealizedPnl: account.totalRealizedPnl + realizedPnl,
              positions: newPositions,
              trades: [...account.trades, trade],
              updatedAt: now,
            },
          })

          return { success: true, trade, realizedPnl }
        },

        closeAllPositions: (prices) => {
          const { account } = get()
          if (!account) return

          account.positions.forEach((position) => {
            const price = prices[position.coin] ?? position.markPrice
            get().closePosition({ positionId: position.id, price })
          })
        },

        // =====================================================================
        // 持仓管理
        // =====================================================================

        updatePositionPrice: (coin, markPrice) => {
          const { account } = get()
          if (!account) return

          set((state) => ({
            priceCache: { ...state.priceCache, [coin]: markPrice },
          }))

          const now = Date.now()
          let totalUnrealizedPnl = 0

          const updatedPositions = account.positions.map((position) => {
            if (position.coin !== coin) {
              totalUnrealizedPnl += position.unrealizedPnl
              return position
            }

            const { pnl, pnlPercent } = calculateUnrealizedPnl(
              position.side,
              position.entryPrice,
              markPrice,
              position.size
            )

            const roe = calculateROE(pnl, position.initialMargin)
            totalUnrealizedPnl += pnl

            return {
              ...position,
              markPrice,
              notionalValue: markPrice * position.size,
              unrealizedPnl: pnl,
              unrealizedPnlPercent: pnlPercent,
              returnOnEquity: roe,
              updatedAt: now,
            }
          })

          const newTotalEquity = account.walletBalance + totalUnrealizedPnl
          const newMarginRatio = calculateMarginRatio(newTotalEquity, account.maintenanceMargin)
          const newRiskLevel = calculateRiskLevel(newMarginRatio)

          set({
            account: {
              ...account,
              positions: updatedPositions,
              totalUnrealizedPnl,
              totalEquity: newTotalEquity,
              marginRatio: newMarginRatio,
              riskLevel: newRiskLevel,
              updatedAt: now,
            },
          })

          // 检查爆仓
          get().checkAndExecuteLiquidations()
        },

        updateAllPrices: (prices) => {
          Object.entries(prices).forEach(([coin, price]) => {
            get().updatePositionPrice(coin, price)
          })
        },

        setTpSl: (params) => {
          const { account } = get()
          if (!account) return false

          const { positionId, takeProfitPrice, stopLossPrice } = params
          const position = account.positions.find((p) => p.id === positionId)
          if (!position) return false

          const updatedPositions = account.positions.map((p) =>
            p.id === positionId
              ? {
                  ...p,
                  takeProfitPrice: takeProfitPrice !== undefined ? takeProfitPrice : p.takeProfitPrice,
                  stopLossPrice: stopLossPrice !== undefined ? stopLossPrice : p.stopLossPrice,
                  updatedAt: Date.now(),
                }
              : p
          )

          set({
            account: {
              ...account,
              positions: updatedPositions,
              updatedAt: Date.now(),
            },
          })

          return true
        },

        adjustLeverage: (positionId, newLeverage) => {
          const { account } = get()
          if (!account) return false

          const position = account.positions.find((p) => p.id === positionId)
          if (!position) return false

          const maxLev = getMaxLeverage(position.coin)
          if (newLeverage > maxLev) return false

          const now = Date.now()
          const maintenanceMarginRate = getMaintenanceMarginRate(position.coin)

          // 计算新的保证金需求
          const newInitialMargin = calculateInitialMargin(position.notionalValue, newLeverage)
          const marginDiff = newInitialMargin - position.initialMargin

          // 检查是否有足够余额
          if (marginDiff > account.availableMargin) return false

          const newLiquidationPrice = calculateLiquidationPrice(
            position.side,
            position.entryPrice,
            newLeverage,
            maintenanceMarginRate
          )

          const updatedPositions = account.positions.map((p) =>
            p.id === positionId
              ? {
                  ...p,
                  leverage: newLeverage,
                  initialMargin: newInitialMargin,
                  liquidationPrice: newLiquidationPrice,
                  returnOnEquity: calculateROE(p.unrealizedPnl, newInitialMargin),
                  updatedAt: now,
                }
              : p
          )

          set({
            account: {
              ...account,
              usedMargin: account.usedMargin + marginDiff,
              availableMargin: account.availableMargin - marginDiff,
              positions: updatedPositions,
              updatedAt: now,
            },
          })

          return true
        },

        // =====================================================================
        // 爆仓检查
        // =====================================================================

        checkAndExecuteLiquidations: () => {
          const { account, priceCache } = get()
          if (!account) return []

          const liquidations: PerpetualLiquidation[] = []
          const now = Date.now()

          account.positions.forEach((position) => {
            const markPrice = priceCache[position.coin] ?? position.markPrice

            if (checkLiquidation(position, markPrice)) {
              const liquidation: PerpetualLiquidation = {
                id: generateId(),
                accountId: account.id,
                positionId: position.id,
                symbol: position.symbol,
                coin: position.coin,
                side: position.side,
                size: position.size,
                entryPrice: position.entryPrice,
                liquidationPrice: position.liquidationPrice,
                markPriceAtLiquidation: markPrice,
                lossAmount: position.initialMargin + position.unrealizedPnl,
                timestamp: now,
              }
              liquidations.push(liquidation)
            }
          })

          if (liquidations.length > 0) {
            // 执行爆仓
            const liquidatedPositionIds = liquidations.map((l) => l.positionId)
            const remainingPositions = account.positions.filter(
              (p) => !liquidatedPositionIds.includes(p.id)
            )

            const totalLoss = liquidations.reduce((sum, l) => sum + l.lossAmount, 0)
            const releasedMargin = account.positions
              .filter((p) => liquidatedPositionIds.includes(p.id))
              .reduce((sum, p) => sum + p.initialMargin, 0)
            const releasedMaintenanceMargin = account.positions
              .filter((p) => liquidatedPositionIds.includes(p.id))
              .reduce((sum, p) => sum + p.maintenanceMargin, 0)

            // 爆仓交易记录
            const liquidationTrades: PerpetualPaperTrade[] = liquidations.map((l) => {
              const position = account.positions.find((p) => p.id === l.positionId)!
              return {
                id: generateId(),
                accountId: account.id,
                positionId: l.positionId,
                symbol: l.symbol,
                coin: l.coin,
                side: l.side === 'long' ? 'sell' : 'buy',
                positionSide: l.side,
                orderType: 'market' as const,
                action: 'liquidation' as const,
                size: l.size,
                price: l.markPriceAtLiquidation,
                notionalValue: l.markPriceAtLiquidation * l.size,
                leverage: position.leverage,
                fee: 0,
                realizedPnl: -l.lossAmount,
                timestamp: now,
              }
            })

            const newWalletBalance = account.walletBalance - totalLoss + releasedMargin
            const newUsedMargin = account.usedMargin - releasedMargin
            const newMaintenanceMargin = account.maintenanceMargin - releasedMaintenanceMargin
            const newTotalUnrealizedPnl = remainingPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0)
            const newTotalEquity = newWalletBalance + newTotalUnrealizedPnl
            const newMarginRatio = calculateMarginRatio(newTotalEquity, newMaintenanceMargin)
            const newRiskLevel = calculateRiskLevel(newMarginRatio)

            set({
              account: {
                ...account,
                walletBalance: newWalletBalance,
                totalEquity: newTotalEquity,
                availableMargin: newWalletBalance - newUsedMargin,
                usedMargin: newUsedMargin,
                maintenanceMargin: newMaintenanceMargin,
                marginRatio: newMarginRatio,
                riskLevel: newRiskLevel,
                totalUnrealizedPnl: newTotalUnrealizedPnl,
                totalRealizedPnl: account.totalRealizedPnl - totalLoss,
                positions: remainingPositions,
                trades: [...account.trades, ...liquidationTrades],
                liquidations: [...account.liquidations, ...liquidations],
                updatedAt: now,
              },
            })
          }

          return liquidations
        },

        // =====================================================================
        // 统计
        // =====================================================================

        getAccountStats: () => {
          const { account } = get()
          if (!account) return null

          const closedTrades = account.trades.filter(
            (t) => t.action === 'close' || t.action === 'liquidation'
          )

          const winTrades = closedTrades.filter((t) => (t.realizedPnl ?? 0) > 0)
          const lossTrades = closedTrades.filter((t) => (t.realizedPnl ?? 0) < 0)

          const totalWin = winTrades.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0)
          const totalLoss = Math.abs(lossTrades.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0))

          const totalFees = account.trades.reduce((sum, t) => sum + t.fee, 0)
          const totalLiquidationLoss = account.liquidations.reduce((sum, l) => sum + l.lossAmount, 0)

          return {
            accountId: account.id,
            totalEquity: account.totalEquity,
            totalPnl: account.totalEquity - account.initialCapital,
            totalPnlPercent: ((account.totalEquity - account.initialCapital) / account.initialCapital) * 100,
            unrealizedPnl: account.totalUnrealizedPnl,
            realizedPnl: account.totalRealizedPnl,
            totalTrades: closedTrades.length,
            winTrades: winTrades.length,
            lossTrades: lossTrades.length,
            winRate: closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 0,
            maxDrawdown: 0, // TODO: Calculate from equity history
            avgWin: winTrades.length > 0 ? totalWin / winTrades.length : 0,
            avgLoss: lossTrades.length > 0 ? totalLoss / lossTrades.length : 0,
            profitFactor: totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0,
            totalFees,
            liquidationCount: account.liquidations.length,
            totalLiquidationLoss,
          }
        },

        // =====================================================================
        // 选择器
        // =====================================================================

        getPosition: (positionId) => {
          const { account } = get()
          return account?.positions.find((p) => p.id === positionId)
        },

        getPositionByCoin: (coin) => {
          const { account } = get()
          return account?.positions.find((p) => p.coin === coin)
        },

        getLongPositions: () => {
          const { account } = get()
          return account?.positions.filter((p) => p.side === 'long') ?? []
        },

        getShortPositions: () => {
          const { account } = get()
          return account?.positions.filter((p) => p.side === 'short') ?? []
        },
      })),
      {
        name: 'perpetual-paper-trading-store',
        partialize: (state) => ({
          account: state.account,
          isInitialized: state.isInitialized,
          config: state.config,
        }),
      }
    ),
    { name: 'perpetual-paper-trading' }
  )
)

// =============================================================================
// Helper: Add to Position (加仓)
// =============================================================================

function addToPosition(
  get: () => PerpetualPaperTradingStore,
  set: (state: Partial<PerpetualPaperTradingStore> | ((state: PerpetualPaperTradingStore) => Partial<PerpetualPaperTradingStore>)) => void,
  existingPosition: PerpetualPaperPosition,
  params: OpenPositionParams,
  fee: number
): OpenPositionResult {
  const { account, config } = get()
  if (!account) return { success: false, error: 'Account not initialized' }

  const { size, price, leverage } = params
  const now = Date.now()

  // 计算新的均价
  const totalSize = existingPosition.size + size
  const newEntryPrice =
    (existingPosition.entryPrice * existingPosition.size + price * size) / totalSize

  // 计算新的名义价值和保证金
  const newNotionalValue = newEntryPrice * totalSize
  const newInitialMargin = calculateInitialMargin(newNotionalValue, existingPosition.leverage)
  const marginDiff = newInitialMargin - existingPosition.initialMargin

  // 检查余额
  if (marginDiff + fee > account.availableMargin) {
    return { success: false, error: 'Insufficient margin for adding to position' }
  }

  const maintenanceMarginRate = getMaintenanceMarginRate(existingPosition.coin)
  const newMaintenanceMargin = calculateMaintenanceMargin(newNotionalValue, maintenanceMarginRate)
  const newLiquidationPrice = calculateLiquidationPrice(
    existingPosition.side,
    newEntryPrice,
    existingPosition.leverage,
    maintenanceMarginRate
  )

  const maintenanceMarginDiff = newMaintenanceMargin - existingPosition.maintenanceMargin

  const updatedPosition: PerpetualPaperPosition = {
    ...existingPosition,
    size: totalSize,
    notionalValue: newNotionalValue,
    entryPrice: newEntryPrice,
    initialMargin: newInitialMargin,
    maintenanceMargin: newMaintenanceMargin,
    liquidationPrice: newLiquidationPrice,
    updatedAt: now,
  }

  const trade: PerpetualPaperTrade = {
    id: generateId(),
    accountId: account.id,
    positionId: existingPosition.id,
    symbol: existingPosition.symbol,
    coin: existingPosition.coin,
    side: existingPosition.side === 'long' ? 'buy' : 'sell',
    positionSide: existingPosition.side,
    orderType: 'market',
    action: 'add',
    size,
    price,
    notionalValue: price * size,
    leverage: existingPosition.leverage,
    fee,
    realizedPnl: null,
    timestamp: now,
  }

  const newWalletBalance = account.walletBalance - fee
  const newUsedMargin = account.usedMargin + marginDiff
  const newTotalMaintenanceMargin = account.maintenanceMargin + maintenanceMarginDiff
  const newAvailableMargin = newWalletBalance - newUsedMargin
  const newTotalEquity = newWalletBalance + account.totalUnrealizedPnl
  const newMarginRatio = calculateMarginRatio(newTotalEquity, newTotalMaintenanceMargin)
  const newRiskLevel = calculateRiskLevel(newMarginRatio)

  set({
    account: {
      ...account,
      walletBalance: newWalletBalance,
      totalEquity: newTotalEquity,
      availableMargin: newAvailableMargin,
      usedMargin: newUsedMargin,
      maintenanceMargin: newTotalMaintenanceMargin,
      marginRatio: newMarginRatio,
      riskLevel: newRiskLevel,
      positions: account.positions.map((p) =>
        p.id === existingPosition.id ? updatedPosition : p
      ),
      trades: [...account.trades, trade],
      updatedAt: now,
    },
  })

  return { success: true, position: updatedPosition, trade }
}

// =============================================================================
// Selectors
// =============================================================================

export const selectAccount = (state: PerpetualPaperTradingStore) => state.account
export const selectIsInitialized = (state: PerpetualPaperTradingStore) => state.isInitialized
export const selectPositions = (state: PerpetualPaperTradingStore) => state.account?.positions ?? []
export const selectTrades = (state: PerpetualPaperTradingStore) => state.account?.trades ?? []
export const selectRiskLevel = (state: PerpetualPaperTradingStore) => state.account?.riskLevel ?? 'safe'
export const selectMarginRatio = (state: PerpetualPaperTradingStore) => state.account?.marginRatio ?? 999
export const selectTotalEquity = (state: PerpetualPaperTradingStore) => state.account?.totalEquity ?? 0
export const selectAvailableMargin = (state: PerpetualPaperTradingStore) => state.account?.availableMargin ?? 0

export default usePerpetualPaperTradingStore

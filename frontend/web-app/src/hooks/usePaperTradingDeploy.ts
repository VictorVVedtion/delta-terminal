/**
 * usePaperTradingDeploy Hook
 *
 * 将 Paper Trading Store 集成到部署流程
 * 替代远程 API 调用，使用本地模拟交易引擎
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePaperTradingStore } from '@/store/paperTrading'
import { useHyperliquidPrice } from '@/hooks/useHyperliquidPrice'
import type {
  PaperAccount,
  PaperAccountStats,
  PlaceOrderResult,
} from '@/types/paperTrading'
import type { DeployConfig } from '@/components/canvas/DeployCanvas'

// =============================================================================
// Types
// =============================================================================

export interface PaperTradingDeployState {
  /** 是否已部署 */
  isDeployed: boolean
  /** 部署进度 (0-100) */
  progress: number
  /** 当前步骤 */
  currentStep: string
  /** 错误信息 */
  error: string | null
}

export interface UsePaperTradingDeployOptions {
  /** 策略 ID */
  strategyId: string
  /** Agent ID */
  agentId: string
  /** 交易对 (如 'BTC/USDT') */
  symbol: string
  /** 部署成功回调 */
  onSuccess?: (accountId: string) => void
  /** 部署失败回调 */
  onError?: (error: string) => void
}

export interface UsePaperTradingDeployReturn {
  /** 部署状态 */
  state: PaperTradingDeployState
  /** 虚拟账户 */
  account: PaperAccount | null
  /** 账户统计 */
  stats: PaperAccountStats | null
  /** 当前价格 */
  currentPrice: number | null
  /** 价格加载中 */
  priceLoading: boolean
  /** 执行 Paper 部署 */
  deployPaper: (config: DeployConfig) => Promise<string>
  /** 停止 Paper Trading */
  stopPaper: () => void
  /** 执行买入 */
  executeBuy: (size: number) => PlaceOrderResult
  /** 执行卖出 */
  executeSell: (size: number) => PlaceOrderResult
  /** 平仓所有持仓 */
  closeAllPositions: () => void
  /** 重置 */
  reset: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function usePaperTradingDeploy(
  options: UsePaperTradingDeployOptions
): UsePaperTradingDeployReturn {
  const { strategyId, agentId, symbol, onSuccess, onError } = options

  // 提取交易对基础资产 (BTC/USDT -> BTC)
  const baseAsset = useMemo(() => {
    return symbol.split('/')[0] || 'BTC'
  }, [symbol])

  // 状态
  const [state, setState] = useState<PaperTradingDeployState>({
    isDeployed: false,
    progress: 0,
    currentStep: '',
    error: null,
  })

  // Paper Trading Store
  const {
    initAccount,
    getAccountByAgentId,
    deleteAccount,
    placeMarketOrder,
    closePosition,
    updatePositionPrice,
    getAccountStats,
  } = usePaperTradingStore()

  // 获取账户
  const account = usePaperTradingStore((s) =>
    s.accounts.find((a) => a.agentId === agentId) || null
  )

  // 获取统计
  const stats = useMemo(() => {
    if (!account) return null
    return getAccountStats(account.id)
  }, [account, getAccountStats])

  // 实时价格
  const { prices, loading: priceLoading } = useHyperliquidPrice([baseAsset], {
    refreshInterval: 3000,
    enabled: !!account,
  })
  const currentPrice = prices.get(baseAsset) || null

  // 价格更新到持仓
  useEffect(() => {
    if (!account || !currentPrice) return
    updatePositionPrice(account.id, symbol, currentPrice)
  }, [account, currentPrice, symbol, updatePositionPrice])

  // 检查是否已部署
  useEffect(() => {
    const existingAccount = getAccountByAgentId(agentId)
    if (existingAccount) {
      setState((s) => ({
        ...s,
        isDeployed: true,
        progress: 100,
        currentStep: 'Paper Trading 运行中',
      }))
    }
  }, [agentId, getAccountByAgentId])

  // ==========================================================================
  // Deploy Paper Trading
  // ==========================================================================

  const deployPaper = useCallback(
    async (config: DeployConfig): Promise<string> => {
      if (config.mode !== 'paper') {
        throw new Error('此 Hook 仅支持 Paper 模式部署')
      }

      try {
        // Step 1: 验证
        setState({
          isDeployed: false,
          progress: 10,
          currentStep: '验证配置...',
          error: null,
        })
        await delay(300)

        // Step 2: 初始化账户
        setState((s) => ({
          ...s,
          progress: 30,
          currentStep: '初始化虚拟账户...',
        }))
        await delay(300)

        const accountId = initAccount(agentId, config.capital)

        // Step 3: 连接市场数据
        setState((s) => ({
          ...s,
          progress: 60,
          currentStep: '连接市场数据...',
        }))
        await delay(500)

        // Step 4: 完成
        setState({
          isDeployed: true,
          progress: 100,
          currentStep: 'Paper Trading 已启动',
          error: null,
        })

        onSuccess?.(accountId)
        return accountId
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '部署失败'
        setState((s) => ({
          ...s,
          progress: 0,
          currentStep: '',
          error: errorMsg,
        }))
        onError?.(errorMsg)
        throw error
      }
    },
    [agentId, initAccount, onSuccess, onError]
  )

  // ==========================================================================
  // Stop Paper Trading
  // ==========================================================================

  const stopPaper = useCallback(() => {
    if (!account) return
    deleteAccount(account.id)
    setState({
      isDeployed: false,
      progress: 0,
      currentStep: '',
      error: null,
    })
  }, [account, deleteAccount])

  // ==========================================================================
  // Execute Trades
  // ==========================================================================

  const executeBuy = useCallback(
    (size: number): PlaceOrderResult => {
      if (!account || !currentPrice) {
        return { success: false, error: '账户或价格不可用' }
      }
      return placeMarketOrder(
        {
          accountId: account.id,
          symbol,
          side: 'buy',
          type: 'market',
          size,
        },
        currentPrice
      )
    },
    [account, currentPrice, symbol, placeMarketOrder]
  )

  const executeSell = useCallback(
    (size: number): PlaceOrderResult => {
      if (!account || !currentPrice) {
        return { success: false, error: '账户或价格不可用' }
      }
      return placeMarketOrder(
        {
          accountId: account.id,
          symbol,
          side: 'sell',
          type: 'market',
          size,
        },
        currentPrice
      )
    },
    [account, currentPrice, symbol, placeMarketOrder]
  )

  const closeAllPositions = useCallback(() => {
    if (!account || !currentPrice) return

    account.positions.forEach((pos) => {
      closePosition(
        { accountId: account.id, positionId: pos.id },
        currentPrice
      )
    })
  }, [account, currentPrice, closePosition])

  // ==========================================================================
  // Reset
  // ==========================================================================

  const reset = useCallback(() => {
    stopPaper()
  }, [stopPaper])

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    state,
    account,
    stats,
    currentPrice,
    priceLoading,
    deployPaper,
    stopPaper,
    executeBuy,
    executeSell,
    closeAllPositions,
    reset,
  }
}

// =============================================================================
// Helpers
// =============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default usePaperTradingDeploy

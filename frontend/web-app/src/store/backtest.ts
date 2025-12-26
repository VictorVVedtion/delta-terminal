/**
 * BacktestStore - 回测状态管理
 * Story 2.2: 回测 API 接口与数据层
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  BacktestConfig,
  BacktestResult,
  BacktestRunState,
  BacktestHistoryItem,
} from '@/types/backtest'

// =============================================================================
// Types
// =============================================================================

export interface BacktestStoreState {
  // 当前回测
  currentBacktestId: string | null
  currentConfig: BacktestConfig | null
  currentStatus: BacktestRunState
  currentResult: BacktestResult | null

  // 历史记录
  history: BacktestHistoryItem[]

  // 加载状态
  isLoading: boolean
  error: string | null
}

export interface BacktestStoreActions {
  // 设置当前回测
  setCurrentBacktest: (id: string, config: BacktestConfig) => void

  // 更新状态
  updateStatus: (status: Partial<BacktestRunState>) => void

  // 设置结果
  setResult: (result: BacktestResult) => void

  // 清除当前回测
  clearCurrent: () => void

  // 添加到历史
  addToHistory: (item: BacktestHistoryItem) => void

  // 移除历史项
  removeFromHistory: (id: string) => void

  // 设置加载状态
  setLoading: (loading: boolean) => void

  // 设置错误
  setError: (error: string | null) => void

  // 重置 Store
  reset: () => void

  // 获取回测是否通过
  isBacktestPassed: () => boolean

  // 获取回测结果供 DeployCanvas 使用
  getBacktestSummary: () => {
    passed: boolean
    expectedReturn: number
    maxDrawdown: number
    winRate: number
    backtestId: string
    completedAt: string
  } | null
}

export type BacktestStore = BacktestStoreState & BacktestStoreActions

// =============================================================================
// Initial State
// =============================================================================

const initialStatus: BacktestRunState = {
  isRunning: false,
  progress: 0,
  stage: 'preparing',
}

const initialState: BacktestStoreState = {
  currentBacktestId: null,
  currentConfig: null,
  currentStatus: initialStatus,
  currentResult: null,
  history: [],
  isLoading: false,
  error: null,
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useBacktestStore = create<BacktestStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Actions
      setCurrentBacktest: (id, config) => {
        set({
          currentBacktestId: id,
          currentConfig: config,
          currentStatus: {
            isRunning: true,
            progress: 0,
            stage: 'preparing',
          },
          currentResult: null,
          error: null,
        })
      },

      updateStatus: (statusUpdate) => {
        set((state) => ({
          currentStatus: {
            ...state.currentStatus,
            ...statusUpdate,
          },
        }))
      },

      setResult: (result) => {
        set({
          currentResult: result,
          currentStatus: {
            isRunning: false,
            progress: 100,
            stage: 'completed',
          },
        })

        // 自动添加到历史
        const historyItem: BacktestHistoryItem = {
          id: result.id,
          name: result.config.name,
          symbol: result.config.symbol,
          period: `${result.config.startDate} - ${result.config.endDate}`,
          totalReturn: result.metrics.totalReturn,
          status: 'completed',
          createdAt: Date.now(),
        }
        get().addToHistory(historyItem)
      },

      clearCurrent: () => {
        set({
          currentBacktestId: null,
          currentConfig: null,
          currentStatus: initialStatus,
          currentResult: null,
          error: null,
        })
      },

      addToHistory: (item) => {
        set((state) => ({
          history: [item, ...state.history].slice(0, 50), // 最多保存 50 条
        }))
      },

      removeFromHistory: (id) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }))
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({
          error,
          currentStatus: error
            ? {
                isRunning: false,
                progress: get().currentStatus.progress,
                stage: 'completed',
                error,
              }
            : get().currentStatus,
        })
      },

      reset: () => {
        set(initialState)
      },

      isBacktestPassed: () => {
        const result = get().currentResult
        if (!result) return false

        // 判断回测是否通过的标准
        const metrics = result.metrics
        return (
          metrics.totalReturn > 0 &&
          metrics.maxDrawdown > -30 && // 最大回撤不超过 30%
          metrics.winRate > 40 && // 胜率大于 40%
          metrics.sharpeRatio > 0.5 // 夏普比率大于 0.5
        )
      },

      getBacktestSummary: () => {
        const result = get().currentResult
        if (!result) return null

        return {
          passed: get().isBacktestPassed(),
          expectedReturn: result.metrics.totalReturn,
          maxDrawdown: result.metrics.maxDrawdown,
          winRate: result.metrics.winRate,
          backtestId: result.id,
          completedAt: result.completedAt || result.createdAt,
        }
      },
    }),
    {
      name: 'backtest-store',
    }
  )
)

// =============================================================================
// Selectors
// =============================================================================

/**
 * 选择当前回测状态
 */
export const selectCurrentBacktest = (state: BacktestStore) => ({
  id: state.currentBacktestId,
  config: state.currentConfig,
  status: state.currentStatus,
  result: state.currentResult,
})

/**
 * 选择回测历史
 */
export const selectBacktestHistory = (state: BacktestStore) => state.history

/**
 * 选择是否正在运行
 */
export const selectIsRunning = (state: BacktestStore) =>
  state.currentStatus.isRunning

/**
 * 选择回测进度
 */
export const selectProgress = (state: BacktestStore) =>
  state.currentStatus.progress

export default useBacktestStore

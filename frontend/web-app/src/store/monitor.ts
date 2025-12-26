/**
 * MonitorStore - 监控状态管理
 * Story 3.2: 监控 API 接口与数据层
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  StrategyInfo,
  PnLData,
  Position,
  Trade,
  StrategyMetrics,
} from '@/components/canvas/MonitorCanvas'

// =============================================================================
// Types
// =============================================================================

export interface MonitorData {
  strategy: StrategyInfo
  pnl: PnLData
  positions: Position[]
  recentTrades: Trade[]
  metrics: StrategyMetrics
  lastUpdated: number
}

export interface MonitorStoreState {
  // 当前监控的 Agent
  currentAgentId: string | null

  // 缓存的监控数据 (agentId -> data)
  cachedData: Record<string, MonitorData>

  // 加载状态
  isLoading: boolean
  error: string | null
}

export interface MonitorStoreActions {
  // 设置当前监控的 Agent
  setCurrentAgent: (agentId: string) => void

  // 更新监控数据
  updateData: (agentId: string, data: Partial<MonitorData>) => void

  // 清除当前监控
  clearCurrent: () => void

  // 清除缓存数据
  clearCache: (agentId?: string) => void

  // 设置加载状态
  setLoading: (loading: boolean) => void

  // 设置错误
  setError: (error: string | null) => void

  // 获取监控数据
  getData: (agentId: string) => MonitorData | null

  // 重置 Store
  reset: () => void
}

export type MonitorStore = MonitorStoreState & MonitorStoreActions

// =============================================================================
// Initial State
// =============================================================================

const initialState: MonitorStoreState = {
  currentAgentId: null,
  cachedData: {},
  isLoading: false,
  error: null,
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useMonitorStore = create<MonitorStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Actions
      setCurrentAgent: (agentId) => {
        set({
          currentAgentId: agentId,
          error: null,
        })
      },

      updateData: (agentId, data) => {
        set((state) => {
          const existing = state.cachedData[agentId] || {
            strategy: { name: '', symbol: '', status: 'stopped' as const, createdAt: '' },
            pnl: { daily: 0, total: 0, unrealized: 0, realized: 0 },
            positions: [],
            recentTrades: [],
            metrics: {
              winRate: 0,
              avgHoldTime: '0h',
              maxDrawdown: 0,
              totalTrades: 0,
              winningTrades: 0,
              losingTrades: 0,
            },
            lastUpdated: Date.now(),
          }

          return {
            cachedData: {
              ...state.cachedData,
              [agentId]: {
                ...existing,
                ...data,
                lastUpdated: Date.now(),
              },
            },
            isLoading: false,
          }
        })
      },

      clearCurrent: () => {
        set({
          currentAgentId: null,
          error: null,
        })
      },

      clearCache: (agentId) => {
        set((state) => {
          if (agentId) {
            const { [agentId]: _, ...rest } = state.cachedData
            return { cachedData: rest }
          }
          return { cachedData: {} }
        })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({
          error,
          isLoading: false,
        })
      },

      getData: (agentId) => {
        return get().cachedData[agentId] || null
      },

      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'monitor-store',
    }
  )
)

// =============================================================================
// Selectors
// =============================================================================

/**
 * 选择当前监控数据
 */
export const selectCurrentMonitorData = (state: MonitorStore) => {
  const { currentAgentId, cachedData } = state
  if (!currentAgentId) return null
  return cachedData[currentAgentId] || null
}

/**
 * 选择是否正在加载
 */
export const selectIsLoading = (state: MonitorStore) => state.isLoading

/**
 * 选择错误信息
 */
export const selectError = (state: MonitorStore) => state.error

/**
 * 选择当前 Agent ID
 */
export const selectCurrentAgentId = (state: MonitorStore) => state.currentAgentId

export default useMonitorStore

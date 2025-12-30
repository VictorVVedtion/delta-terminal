/**
 * Strategy Lifecycle Store - 策略生命周期状态管理
 *
 * S12a: 策略删除与归档功能
 * - 软删除、归档、恢复、永久删除
 * - 回收站管理
 * - 归档策略视图
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import {
  calculateRemainingDays,
  calculateScheduledPermanentDeleteAt,
  canArchiveStrategy,
  canDeleteStrategy,
  RECYCLE_BIN_RETENTION_DAYS,
  type StrategyWithLifecycle,
} from '@/types/strategy-lifecycle'

// =============================================================================
// Types
// =============================================================================

interface StrategyLifecycleState {
  /** 所有策略（包含所有生命周期状态） */
  strategies: StrategyWithLifecycle[]
  /** 当前选中的策略ID */
  selectedStrategyId: string | null
  /** 加载状态 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
}

interface StrategyLifecycleActions {
  // 基础操作
  setStrategies: (strategies: StrategyWithLifecycle[]) => void
  addStrategy: (strategy: StrategyWithLifecycle) => void
  updateStrategy: (id: string, updates: Partial<StrategyWithLifecycle>) => void
  setSelectedStrategy: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // 生命周期操作
  /** 软删除策略（移入回收站） */
  softDeleteStrategy: (id: string) => { success: boolean; error?: string }
  /** 永久删除策略 */
  permanentDeleteStrategy: (id: string) => { success: boolean; error?: string }
  /** 归档策略 */
  archiveStrategy: (id: string) => { success: boolean; error?: string }
  /** 恢复策略（从回收站或归档） */
  restoreStrategy: (id: string) => { success: boolean; error?: string }
  /** 批量清空回收站 */
  emptyRecycleBin: () => void
  /** 清理过期的回收站策略 */
  cleanupExpiredStrategies: () => void

  // 查询方法
  /** 获取活跃策略列表 */
  getActiveStrategies: () => StrategyWithLifecycle[]
  /** 获取归档策略列表 */
  getArchivedStrategies: () => StrategyWithLifecycle[]
  /** 获取回收站策略列表 */
  getDeletedStrategies: () => StrategyWithLifecycle[]
  /** 获取策略详情 */
  getStrategy: (id: string) => StrategyWithLifecycle | undefined
  /** 获取回收站策略剩余天数 */
  getRemainingDays: (id: string) => number
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: StrategyLifecycleState = {
  strategies: [],
  selectedStrategyId: null,
  isLoading: false,
  error: null,
}

// =============================================================================
// Store
// =============================================================================

export const useStrategyLifecycleStore = create<
  StrategyLifecycleState & StrategyLifecycleActions
>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================== 基础操作 ====================

        setStrategies: (strategies) => {
          set({ strategies }, false, 'strategyLifecycle/setStrategies')
        },

        addStrategy: (strategy) => {
          set(
            (state) => ({
              strategies: [...state.strategies, strategy],
            }),
            false,
            'strategyLifecycle/addStrategy'
          )
        },

        updateStrategy: (id, updates) => {
          set(
            (state) => ({
              strategies: state.strategies.map((s) =>
                s.id === id
                  ? {
                      ...s,
                      ...updates,
                      timestamps: {
                        ...s.timestamps,
                        updatedAt: Date.now(),
                      },
                    }
                  : s
              ),
            }),
            false,
            'strategyLifecycle/updateStrategy'
          )
        },

        setSelectedStrategy: (id) => {
          set({ selectedStrategyId: id }, false, 'strategyLifecycle/setSelectedStrategy')
        },

        setLoading: (isLoading) => {
          set({ isLoading }, false, 'strategyLifecycle/setLoading')
        },

        setError: (error) => {
          set({ error }, false, 'strategyLifecycle/setError')
        },

        // ==================== 生命周期操作 ====================

        softDeleteStrategy: (id) => {
          const strategy = get().strategies.find((s) => s.id === id)
          if (!strategy) {
            return { success: false, error: '策略不存在' }
          }

          const { canDelete, reason } = canDeleteStrategy(strategy)
          if (!canDelete) {
            return { success: false, error: reason }
          }

          const now = Date.now()
          set(
            (state) => ({
              strategies: state.strategies.map((s) =>
                s.id === id
                  ? {
                      ...s,
                      lifecycleStatus: 'deleted' as const,
                      timestamps: {
                        ...s.timestamps,
                        updatedAt: now,
                        deletedAt: now,
                        scheduledPermanentDeleteAt:
                          calculateScheduledPermanentDeleteAt(now),
                      },
                    }
                  : s
              ),
              selectedStrategyId:
                state.selectedStrategyId === id ? null : state.selectedStrategyId,
            }),
            false,
            'strategyLifecycle/softDeleteStrategy'
          )

          return { success: true }
        },

        permanentDeleteStrategy: (id) => {
          const strategy = get().strategies.find((s) => s.id === id)
          if (!strategy) {
            return { success: false, error: '策略不存在' }
          }

          set(
            (state) => ({
              strategies: state.strategies.filter((s) => s.id !== id),
              selectedStrategyId:
                state.selectedStrategyId === id ? null : state.selectedStrategyId,
            }),
            false,
            'strategyLifecycle/permanentDeleteStrategy'
          )

          return { success: true }
        },

        archiveStrategy: (id) => {
          const strategy = get().strategies.find((s) => s.id === id)
          if (!strategy) {
            return { success: false, error: '策略不存在' }
          }

          const { canArchive, reason } = canArchiveStrategy(strategy)
          if (!canArchive) {
            return { success: false, error: reason }
          }

          const now = Date.now()
          set(
            (state) => ({
              strategies: state.strategies.map((s) =>
                s.id === id
                  ? {
                      ...s,
                      lifecycleStatus: 'archived' as const,
                      runStatus: 'stopped' as const,
                      timestamps: {
                        ...s.timestamps,
                        updatedAt: now,
                        archivedAt: now,
                      },
                    }
                  : s
              ),
            }),
            false,
            'strategyLifecycle/archiveStrategy'
          )

          return { success: true }
        },

        restoreStrategy: (id) => {
          const strategy = get().strategies.find((s) => s.id === id)
          if (!strategy) {
            return { success: false, error: '策略不存在' }
          }

          if (strategy.lifecycleStatus === 'active') {
            return { success: false, error: '策略已是活跃状态' }
          }

          const now = Date.now()
          set(
            (state) => ({
              strategies: state.strategies.map((s) =>
                s.id === id
                  ? {
                      ...s,
                      lifecycleStatus: 'active' as const,
                      runStatus: 'stopped' as const, // 恢复后默认停止状态
                      timestamps: {
                        ...s.timestamps,
                        updatedAt: now,
                        deletedAt: undefined,
                        scheduledPermanentDeleteAt: undefined,
                        archivedAt: undefined,
                      },
                    }
                  : s
              ),
            }),
            false,
            'strategyLifecycle/restoreStrategy'
          )

          return { success: true }
        },

        emptyRecycleBin: () => {
          set(
            (state) => ({
              strategies: state.strategies.filter(
                (s) => s.lifecycleStatus !== 'deleted'
              ),
            }),
            false,
            'strategyLifecycle/emptyRecycleBin'
          )
        },

        cleanupExpiredStrategies: () => {
          const now = Date.now()
          set(
            (state) => ({
              strategies: state.strategies.filter((s) => {
                if (s.lifecycleStatus !== 'deleted') return true
                if (!s.timestamps.scheduledPermanentDeleteAt) return true
                return s.timestamps.scheduledPermanentDeleteAt > now
              }),
            }),
            false,
            'strategyLifecycle/cleanupExpiredStrategies'
          )
        },

        // ==================== 查询方法 ====================

        getActiveStrategies: () => {
          return get().strategies.filter((s) => s.lifecycleStatus === 'active')
        },

        getArchivedStrategies: () => {
          return get().strategies.filter((s) => s.lifecycleStatus === 'archived')
        },

        getDeletedStrategies: () => {
          return get().strategies.filter((s) => s.lifecycleStatus === 'deleted')
        },

        getStrategy: (id) => {
          return get().strategies.find((s) => s.id === id)
        },

        getRemainingDays: (id) => {
          const strategy = get().strategies.find((s) => s.id === id)
          if (
            !strategy ||
            strategy.lifecycleStatus !== 'deleted' ||
            !strategy.timestamps.scheduledPermanentDeleteAt
          ) {
            return RECYCLE_BIN_RETENTION_DAYS
          }
          return calculateRemainingDays(strategy.timestamps.scheduledPermanentDeleteAt)
        },
      }),
      {
        name: 'delta-strategy-lifecycle',
        partialize: (state) => ({
          strategies: state.strategies,
        }),
        // Fix hydration issue with Next.js App Router
        skipHydration: true,
      }
    ),
    { name: 'StrategyLifecycleStore' }
  )
)

// =============================================================================
// Selectors
// =============================================================================

/** 获取活跃策略数量 */
export const selectActiveCount = (
  state: StrategyLifecycleState
): number => state.strategies.filter((s) => s.lifecycleStatus === 'active').length

/** 获取归档策略数量 */
export const selectArchivedCount = (
  state: StrategyLifecycleState
): number => state.strategies.filter((s) => s.lifecycleStatus === 'archived').length

/** 获取回收站策略数量 */
export const selectDeletedCount = (
  state: StrategyLifecycleState
): number => state.strategies.filter((s) => s.lifecycleStatus === 'deleted').length

/** 获取选中的策略 */
export const selectSelectedStrategy = (
  state: StrategyLifecycleState & StrategyLifecycleActions
): StrategyWithLifecycle | undefined =>
  state.selectedStrategyId
    ? state.strategies.find((s) => s.id === state.selectedStrategyId)
    : undefined

// =============================================================================
// Hydration Hook (for Next.js App Router compatibility)
// =============================================================================

/**
 * Hook to handle store hydration in Next.js App Router
 * Returns true when store is hydrated and ready to use
 */
export const useStrategyLifecycleHydration = () => {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Trigger rehydration and wait for completion
    const unsubFinishHydration = useStrategyLifecycleStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })

    // Check if already hydrated
    if (useStrategyLifecycleStore.persist.hasHydrated()) {
      setHydrated(true)
    } else {
      // Manually trigger rehydration
      void useStrategyLifecycleStore.persist.rehydrate()
    }

    return () => {
      unsubFinishHydration()
    }
  }, [])

  return hydrated
}

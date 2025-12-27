/**
 * Version Store
 * EPIC-009 Story 9.3: 策略版本管理状态
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type { InsightParam } from '@/types/insight'
import type {
  CreateVersionParams,
  StrategyVersion,
  VersionChangeType,
} from '@/types/version'
import { generateNextVersion } from '@/types/version'

// =============================================================================
// Types
// =============================================================================

interface VersionState {
  // 版本记录 (按 strategyId 分组)
  versions: Record<string, StrategyVersion[]>

  // 最大版本数
  maxVersions: number

  // Actions
  createVersion: (params: CreateVersionParams) => string
  createInitialVersion: (strategyId: string, params: InsightParam[], summary?: string) => string
  getVersionsByStrategy: (strategyId: string) => StrategyVersion[]
  getActiveVersion: (strategyId: string) => StrategyVersion | undefined
  getVersionById: (strategyId: string, versionId: string) => StrategyVersion | undefined
  rollbackToVersion: (strategyId: string, targetVersionId: string, reason?: string) => string | null
  setActiveVersion: (strategyId: string, versionId: string) => void
  clearVersions: (strategyId: string) => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateVersionId(): string {
  return `version_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// =============================================================================
// Store
// =============================================================================

export const useVersionStore = create<VersionState>()(
  devtools(
    persist(
      (set, get) => ({
        versions: {},
        maxVersions: 50,

        createVersion: (params) => {
          const { strategyId, params: versionParams, summary, reason, createdBy, changeType } = params
          const existingVersions = get().versions[strategyId] ?? []
          const currentVersion = existingVersions.find(v => v.isActive)

          const newVersionNumber = currentVersion
            ? generateNextVersion(currentVersion.version, changeType)
            : 'v1.0'

          const id = generateVersionId()
          const version: StrategyVersion = {
            id,
            strategyId,
            version: newVersionNumber,
            timestamp: Date.now(),
            params: versionParams,
            summary,
            isActive: true,
            createdBy,
          }
          if (reason) {
            version.reason = reason
          }
          if (currentVersion?.id) {
            version.parentVersionId = currentVersion.id
          }

          set((state) => {
            const strategyVersions = (state.versions[strategyId] ?? []).map(v => ({
              ...v,
              isActive: false,
            }))
            const updatedVersions = [version, ...strategyVersions].slice(0, state.maxVersions)

            return {
              versions: {
                ...state.versions,
                [strategyId]: updatedVersions,
              },
            }
          })

          return id
        },

        createInitialVersion: (strategyId, params, summary) => {
          return get().createVersion({
            strategyId,
            params,
            summary: summary ?? '初始部署',
            createdBy: 'system',
            changeType: 'major',
          })
        },

        getVersionsByStrategy: (strategyId) => {
          return get().versions[strategyId] ?? []
        },

        getActiveVersion: (strategyId) => {
          const versions = get().versions[strategyId] ?? []
          return versions.find(v => v.isActive)
        },

        getVersionById: (strategyId, versionId) => {
          const versions = get().versions[strategyId] ?? []
          return versions.find(v => v.id === versionId)
        },

        rollbackToVersion: (strategyId, targetVersionId, reason) => {
          const targetVersion = get().getVersionById(strategyId, targetVersionId)
          if (!targetVersion) {
            return null
          }

          // 创建回滚版本（复制目标版本的参数）
          const newVersionId = get().createVersion({
            strategyId,
            params: targetVersion.params,
            summary: `回滚到 ${targetVersion.version}`,
            reason: reason ?? `回滚自 ${targetVersion.version}`,
            createdBy: 'user',
            changeType: 'minor',
          })

          return newVersionId
        },

        setActiveVersion: (strategyId, versionId) => {
          set((state) => {
            const versions = state.versions[strategyId] ?? []
            const updatedVersions = versions.map(v => ({
              ...v,
              isActive: v.id === versionId,
            }))

            return {
              versions: {
                ...state.versions,
                [strategyId]: updatedVersions,
              },
            }
          })
        },

        clearVersions: (strategyId) => {
          set((state) => {
            const newVersions = { ...state.versions }
            delete newVersions[strategyId]
            return { versions: newVersions }
          })
        },
      }),
      {
        name: 'delta-version-storage',
        partialize: (state) => ({
          versions: state.versions,
        }),
      }
    ),
    { name: 'VersionStore' }
  )
)

// =============================================================================
// Selectors
// =============================================================================

export const selectStrategyVersions = (strategyId: string) => (state: VersionState) =>
  state.versions[strategyId] ?? []

export const selectActiveVersion = (strategyId: string) => (state: VersionState) =>
  (state.versions[strategyId] ?? []).find(v => v.isActive)

export const selectVersionCount = (strategyId: string) => (state: VersionState) =>
  (state.versions[strategyId] ?? []).length

// =============================================================================
// Utility: Determine Change Type
// =============================================================================

/**
 * 根据参数变更程度判断版本变更类型
 */
export function determineChangeType(
  oldParams: InsightParam[],
  newParams: InsightParam[]
): VersionChangeType {
  const oldMap = new Map(oldParams.map(p => [p.key, p.value]))
  const newMap = new Map(newParams.map(p => [p.key, p.value]))

  // 检查是否有新增或删除的参数（major 变更）
  const oldKeys = new Set(oldMap.keys())
  const newKeys = new Set(newMap.keys())

  const addedKeys = [...newKeys].filter(k => !oldKeys.has(k))
  const removedKeys = [...oldKeys].filter(k => !newKeys.has(k))

  if (addedKeys.length > 0 || removedKeys.length > 0) {
    return 'major'
  }

  // 计算变更参数的百分比
  let changedCount = 0
  for (const [key, newValue] of newMap) {
    const oldValue = oldMap.get(key)
    if (oldValue !== newValue) {
      changedCount++
    }
  }

  const changeRatio = changedCount / oldParams.length

  // 超过 30% 参数变更视为 major
  if (changeRatio > 0.3) {
    return 'major'
  }

  return 'minor'
}

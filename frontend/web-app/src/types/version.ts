/**
 * Version Types
 * EPIC-009 Story 9.3: 策略版本管理和回滚类型
 */

import type { InsightParam } from './insight'

// =============================================================================
// Strategy Version Types
// =============================================================================

/** 版本创建者类型 */
export type VersionCreator = 'user' | 'system'

/** 版本变更类型 */
export type VersionChangeType = 'major' | 'minor' | 'patch'

/** 策略版本 */
export interface StrategyVersion {
  id: string
  strategyId: string
  version: string          // 'v1.0', 'v1.1', 'v2.0'
  timestamp: number
  params: InsightParam[]
  summary: string          // 修改摘要
  reason?: string          // 创建原因
  isActive: boolean
  createdBy: VersionCreator
  parentVersionId?: string // 父版本 ID（回滚时使用）
}

/** 版本差异项 */
export interface VersionDiffItem {
  key: string
  label: string
  oldValue: unknown
  newValue: unknown
  unit: string | undefined
  hasChanged: boolean
}

/** 版本对比结果 */
export interface VersionComparison {
  version1: StrategyVersion
  version2: StrategyVersion
  diffs: VersionDiffItem[]
  addedParams: string[]    // 新版本新增的参数
  removedParams: string[]  // 新版本移除的参数
}

/** 版本创建参数 */
export interface CreateVersionParams {
  strategyId: string
  params: InsightParam[]
  summary: string
  reason?: string
  createdBy: VersionCreator
  changeType: VersionChangeType
}

/** 回滚参数 */
export interface RollbackParams {
  strategyId: string
  targetVersionId: string
  reason?: string
}

// =============================================================================
// Version Utility Functions
// =============================================================================

/**
 * 解析版本号
 */
export function parseVersion(version: string): { major: number; minor: number } {
  const match = version.match(/^v?(\d+)\.(\d+)$/)
  if (!match) {
    return { major: 1, minor: 0 }
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
  }
}

/**
 * 生成下一个版本号
 */
export function generateNextVersion(currentVersion: string, changeType: VersionChangeType): string {
  const { major, minor } = parseVersion(currentVersion)

  switch (changeType) {
    case 'major':
      return `v${major + 1}.0`
    case 'minor':
      return `v${major}.${minor + 1}`
    case 'patch':
      // Patch 使用 minor 版本
      return `v${major}.${minor + 1}`
    default:
      return `v${major}.${minor + 1}`
  }
}

/**
 * 比较两个版本的参数差异
 */
export function compareVersionParams(
  version1: StrategyVersion,
  version2: StrategyVersion
): VersionComparison {
  const diffs: VersionDiffItem[] = []
  const addedParams: string[] = []
  const removedParams: string[] = []

  const params1Map = new Map(version1.params.map(p => [p.key, p]))
  const params2Map = new Map(version2.params.map(p => [p.key, p]))

  // 检查 version1 中的参数
  for (const [key, param1] of params1Map) {
    const param2 = params2Map.get(key)
    if (!param2) {
      removedParams.push(key)
      diffs.push({
        key,
        label: param1.label,
        oldValue: param1.value,
        newValue: undefined,
        unit: param1.config.unit,
        hasChanged: true,
      })
    } else {
      const hasChanged = param1.value !== param2.value
      diffs.push({
        key,
        label: param1.label,
        oldValue: param1.value,
        newValue: param2.value,
        unit: param1.config.unit,
        hasChanged,
      })
    }
  }

  // 检查 version2 中新增的参数
  for (const [key, param2] of params2Map) {
    if (!params1Map.has(key)) {
      addedParams.push(key)
      diffs.push({
        key,
        label: param2.label,
        oldValue: undefined,
        newValue: param2.value,
        unit: param2.config.unit,
        hasChanged: true,
      })
    }
  }

  return {
    version1,
    version2,
    diffs,
    addedParams,
    removedParams,
  }
}

/**
 * 格式化版本时间
 */
export function formatVersionTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

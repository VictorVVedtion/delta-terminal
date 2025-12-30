/**
 * Strategy Lifecycle Types - 策略生命周期类型定义
 *
 * S12a: 策略删除与归档功能
 * - 软删除：移入回收站，30天后自动永久删除
 * - 归档：停止策略并归档，可随时恢复
 * - 恢复：从回收站或归档状态恢复
 */

// =============================================================================
// 策略生命周期状态
// =============================================================================

/**
 * 策略运行状态
 */
export type StrategyRunStatus = 'running' | 'paused' | 'stopped'

/**
 * 策略生命周期状态
 */
export type StrategyLifecycleStatus = 'active' | 'archived' | 'deleted'

/**
 * 完整的策略状态
 */
export interface StrategyStatus {
  /** 运行状态 */
  runStatus: StrategyRunStatus
  /** 生命周期状态 */
  lifecycleStatus: StrategyLifecycleStatus
}

// =============================================================================
// 策略时间戳
// =============================================================================

/**
 * 策略时间戳
 */
export interface StrategyTimestamps {
  /** 创建时间 */
  createdAt: number
  /** 最后更新时间 */
  updatedAt: number
  /** 最后活跃时间 */
  lastActiveAt: number
  /** 归档时间 */
  archivedAt?: number
  /** 删除时间（软删除） */
  deletedAt?: number
  /** 计划永久删除时间（删除后30天） */
  scheduledPermanentDeleteAt?: number
}

// =============================================================================
// 扩展的策略接口
// =============================================================================

/**
 * 策略绩效数据
 */
export interface StrategyPerformance {
  /** 盈亏金额 */
  pnl: number
  /** 盈亏百分比 */
  pnlPercent: number
  /** 交易次数 */
  trades: number
  /** 胜率 */
  winRate: number
}

/**
 * 完整策略接口（包含生命周期）
 */
export interface StrategyWithLifecycle {
  /** 唯一标识 */
  id: string
  /** 策略名称 */
  name: string
  /** 策略描述 */
  description: string
  /** 运行状态 */
  runStatus: StrategyRunStatus
  /** 生命周期状态 */
  lifecycleStatus: StrategyLifecycleStatus
  /** 绩效数据 */
  performance: StrategyPerformance
  /** 时间戳 */
  timestamps: StrategyTimestamps
}

// =============================================================================
// 删除与归档操作
// =============================================================================

/**
 * 删除策略选项
 */
export interface DeleteStrategyOptions {
  /** 策略ID */
  strategyId: string
  /** 是否永久删除（跳过回收站） */
  permanent?: boolean
  /** 删除原因 */
  reason?: string
}

/**
 * 归档策略选项
 */
export interface ArchiveStrategyOptions {
  /** 策略ID */
  strategyId: string
  /** 归档原因 */
  reason?: string
}

/**
 * 恢复策略选项
 */
export interface RestoreStrategyOptions {
  /** 策略ID */
  strategyId: string
  /** 恢复后的运行状态 */
  targetRunStatus?: StrategyRunStatus
}

// =============================================================================
// 回收站配置
// =============================================================================

/**
 * 回收站保留天数
 */
export const RECYCLE_BIN_RETENTION_DAYS = 30

/**
 * 计算计划永久删除时间
 */
export function calculateScheduledPermanentDeleteAt(deletedAt: number): number {
  return deletedAt + RECYCLE_BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000
}

/**
 * 计算回收站剩余天数
 */
export function calculateRemainingDays(scheduledPermanentDeleteAt: number): number {
  const now = Date.now()
  const remaining = scheduledPermanentDeleteAt - now
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
}

/**
 * 检查策略是否可以删除
 * 运行中的策略不能直接删除，需要先停止
 */
export function canDeleteStrategy(strategy: StrategyWithLifecycle): {
  canDelete: boolean
  reason?: string
} {
  if (strategy.runStatus === 'running') {
    return {
      canDelete: false,
      reason: '运行中的策略不能删除，请先停止策略',
    }
  }
  if (strategy.lifecycleStatus === 'deleted') {
    return {
      canDelete: false,
      reason: '策略已在回收站中',
    }
  }
  return { canDelete: true }
}

/**
 * 检查策略是否可以归档
 * 运行中的策略需要先停止才能归档
 */
export function canArchiveStrategy(strategy: StrategyWithLifecycle): {
  canArchive: boolean
  reason?: string
} {
  if (strategy.runStatus === 'running') {
    return {
      canArchive: false,
      reason: '运行中的策略不能归档，请先停止策略',
    }
  }
  if (strategy.lifecycleStatus === 'archived') {
    return {
      canArchive: false,
      reason: '策略已归档',
    }
  }
  if (strategy.lifecycleStatus === 'deleted') {
    return {
      canArchive: false,
      reason: '回收站中的策略不能归档',
    }
  }
  return { canArchive: true }
}

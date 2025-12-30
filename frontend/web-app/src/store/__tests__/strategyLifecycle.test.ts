import { beforeEach, describe, expect, it } from 'vitest'

import type { StrategyWithLifecycle } from '@/types/strategy-lifecycle'
import {
  calculateRemainingDays,
  calculateScheduledPermanentDeleteAt,
  canArchiveStrategy,
  canDeleteStrategy,
  RECYCLE_BIN_RETENTION_DAYS,
} from '@/types/strategy-lifecycle'

import {
  selectActiveCount,
  selectArchivedCount,
  selectDeletedCount,
  useStrategyLifecycleStore,
} from '../strategyLifecycle'

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockStrategy = (
  overrides: Partial<StrategyWithLifecycle> = {}
): StrategyWithLifecycle => ({
  id: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: '测试策略',
  description: '这是一个测试策略',
  runStatus: 'stopped',
  lifecycleStatus: 'active',
  performance: {
    pnl: 1000,
    pnlPercent: 10,
    trades: 50,
    winRate: 60,
  },
  timestamps: {
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    lastActiveAt: Date.now(),
  },
  ...overrides,
})

// =============================================================================
// Tests
// =============================================================================

describe('StrategyLifecycleStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useStrategyLifecycleStore.setState({
      strategies: [],
      selectedStrategyId: null,
      isLoading: false,
      error: null,
    })
  })

  describe('Initial State', () => {
    it('should have empty strategies array', () => {
      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies).toEqual([])
    })

    it('should have null selectedStrategyId', () => {
      const { selectedStrategyId } = useStrategyLifecycleStore.getState()
      expect(selectedStrategyId).toBeNull()
    })

    it('should not be loading', () => {
      const { isLoading } = useStrategyLifecycleStore.getState()
      expect(isLoading).toBe(false)
    })
  })

  describe('Basic Operations', () => {
    it('should add strategy', () => {
      const strategy = createMockStrategy()
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies).toHaveLength(1)
      expect(strategies[0].id).toBe(strategy.id)
    })

    it('should update strategy', () => {
      const strategy = createMockStrategy()
      useStrategyLifecycleStore.getState().addStrategy(strategy)
      useStrategyLifecycleStore.getState().updateStrategy(strategy.id, {
        name: '更新后的策略',
      })

      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies[0].name).toBe('更新后的策略')
    })

    it('should set selected strategy', () => {
      const strategy = createMockStrategy()
      useStrategyLifecycleStore.getState().addStrategy(strategy)
      useStrategyLifecycleStore.getState().setSelectedStrategy(strategy.id)

      const { selectedStrategyId } = useStrategyLifecycleStore.getState()
      expect(selectedStrategyId).toBe(strategy.id)
    })
  })

  describe('Soft Delete', () => {
    it('should soft delete stopped strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'stopped' })
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const result = useStrategyLifecycleStore.getState().softDeleteStrategy(strategy.id)

      expect(result.success).toBe(true)
      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies[0].lifecycleStatus).toBe('deleted')
      expect(strategies[0].timestamps.deletedAt).toBeDefined()
      expect(strategies[0].timestamps.scheduledPermanentDeleteAt).toBeDefined()
    })

    it('should not delete running strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'running' })
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const result = useStrategyLifecycleStore.getState().softDeleteStrategy(strategy.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('运行中')
      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies[0].lifecycleStatus).toBe('active')
    })

    it('should clear selectedStrategyId when deleting selected strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'stopped' })
      useStrategyLifecycleStore.getState().addStrategy(strategy)
      useStrategyLifecycleStore.getState().setSelectedStrategy(strategy.id)
      useStrategyLifecycleStore.getState().softDeleteStrategy(strategy.id)

      const { selectedStrategyId } = useStrategyLifecycleStore.getState()
      expect(selectedStrategyId).toBeNull()
    })
  })

  describe('Permanent Delete', () => {
    it('should permanently delete strategy', () => {
      const strategy = createMockStrategy()
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const result = useStrategyLifecycleStore.getState().permanentDeleteStrategy(strategy.id)

      expect(result.success).toBe(true)
      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies).toHaveLength(0)
    })

    it('should return error for non-existent strategy', () => {
      const result = useStrategyLifecycleStore.getState().permanentDeleteStrategy('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('不存在')
    })
  })

  describe('Archive', () => {
    it('should archive stopped strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'stopped' })
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const result = useStrategyLifecycleStore.getState().archiveStrategy(strategy.id)

      expect(result.success).toBe(true)
      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies[0].lifecycleStatus).toBe('archived')
      expect(strategies[0].runStatus).toBe('stopped')
      expect(strategies[0].timestamps.archivedAt).toBeDefined()
    })

    it('should not archive running strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'running' })
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const result = useStrategyLifecycleStore.getState().archiveStrategy(strategy.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('运行中')
    })

    it('should not archive already archived strategy', () => {
      const strategy = createMockStrategy({ lifecycleStatus: 'archived' })
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const result = useStrategyLifecycleStore.getState().archiveStrategy(strategy.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('已归档')
    })
  })

  describe('Restore', () => {
    it('should restore deleted strategy', () => {
      const strategy = createMockStrategy({
        lifecycleStatus: 'deleted',
        timestamps: {
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now(),
          lastActiveAt: Date.now(),
          deletedAt: Date.now(),
          scheduledPermanentDeleteAt: Date.now() + 86400000 * 30,
        },
      })
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const result = useStrategyLifecycleStore.getState().restoreStrategy(strategy.id)

      expect(result.success).toBe(true)
      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies[0].lifecycleStatus).toBe('active')
      expect(strategies[0].runStatus).toBe('stopped')
      expect(strategies[0].timestamps.deletedAt).toBeUndefined()
      expect(strategies[0].timestamps.scheduledPermanentDeleteAt).toBeUndefined()
    })

    it('should restore archived strategy', () => {
      const strategy = createMockStrategy({
        lifecycleStatus: 'archived',
        timestamps: {
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now(),
          lastActiveAt: Date.now(),
          archivedAt: Date.now(),
        },
      })
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const result = useStrategyLifecycleStore.getState().restoreStrategy(strategy.id)

      expect(result.success).toBe(true)
      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies[0].lifecycleStatus).toBe('active')
      expect(strategies[0].timestamps.archivedAt).toBeUndefined()
    })

    it('should not restore active strategy', () => {
      const strategy = createMockStrategy({ lifecycleStatus: 'active' })
      useStrategyLifecycleStore.getState().addStrategy(strategy)

      const result = useStrategyLifecycleStore.getState().restoreStrategy(strategy.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('已是活跃状态')
    })
  })

  describe('Recycle Bin Operations', () => {
    it('should empty recycle bin', () => {
      const deleted1 = createMockStrategy({ lifecycleStatus: 'deleted' })
      const deleted2 = createMockStrategy({ lifecycleStatus: 'deleted' })
      const active = createMockStrategy({ lifecycleStatus: 'active' })

      useStrategyLifecycleStore.getState().setStrategies([deleted1, deleted2, active])
      useStrategyLifecycleStore.getState().emptyRecycleBin()

      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies).toHaveLength(1)
      expect(strategies[0].lifecycleStatus).toBe('active')
    })

    it('should cleanup expired strategies', () => {
      const expiredStrategy = createMockStrategy({
        lifecycleStatus: 'deleted',
        timestamps: {
          createdAt: Date.now() - 86400000 * 31,
          updatedAt: Date.now() - 86400000 * 31,
          lastActiveAt: Date.now() - 86400000 * 31,
          deletedAt: Date.now() - 86400000 * 31,
          scheduledPermanentDeleteAt: Date.now() - 1000, // Already expired
        },
      })
      const validStrategy = createMockStrategy({
        lifecycleStatus: 'deleted',
        timestamps: {
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now(),
          lastActiveAt: Date.now(),
          deletedAt: Date.now(),
          scheduledPermanentDeleteAt: Date.now() + 86400000 * 29, // Not expired
        },
      })

      useStrategyLifecycleStore.getState().setStrategies([expiredStrategy, validStrategy])
      useStrategyLifecycleStore.getState().cleanupExpiredStrategies()

      const { strategies } = useStrategyLifecycleStore.getState()
      expect(strategies).toHaveLength(1)
      expect(strategies[0].id).toBe(validStrategy.id)
    })

    it('should get remaining days', () => {
      const strategy = createMockStrategy({
        lifecycleStatus: 'deleted',
        timestamps: {
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now(),
          lastActiveAt: Date.now(),
          deletedAt: Date.now(),
          scheduledPermanentDeleteAt: Date.now() + 86400000 * 15, // 15 days remaining
        },
      })

      useStrategyLifecycleStore.getState().addStrategy(strategy)
      const remainingDays = useStrategyLifecycleStore.getState().getRemainingDays(strategy.id)

      expect(remainingDays).toBe(15)
    })
  })

  describe('Query Methods', () => {
    beforeEach(() => {
      const active1 = createMockStrategy({ lifecycleStatus: 'active' })
      const active2 = createMockStrategy({ lifecycleStatus: 'active' })
      const archived = createMockStrategy({ lifecycleStatus: 'archived' })
      const deleted = createMockStrategy({ lifecycleStatus: 'deleted' })

      useStrategyLifecycleStore.getState().setStrategies([active1, active2, archived, deleted])
    })

    it('should get active strategies', () => {
      const activeStrategies = useStrategyLifecycleStore.getState().getActiveStrategies()
      expect(activeStrategies).toHaveLength(2)
      expect(activeStrategies.every((s) => s.lifecycleStatus === 'active')).toBe(true)
    })

    it('should get archived strategies', () => {
      const archivedStrategies = useStrategyLifecycleStore.getState().getArchivedStrategies()
      expect(archivedStrategies).toHaveLength(1)
      expect(archivedStrategies[0].lifecycleStatus).toBe('archived')
    })

    it('should get deleted strategies', () => {
      const deletedStrategies = useStrategyLifecycleStore.getState().getDeletedStrategies()
      expect(deletedStrategies).toHaveLength(1)
      expect(deletedStrategies[0].lifecycleStatus).toBe('deleted')
    })
  })

  describe('Selectors', () => {
    beforeEach(() => {
      const active1 = createMockStrategy({ lifecycleStatus: 'active' })
      const active2 = createMockStrategy({ lifecycleStatus: 'active' })
      const archived = createMockStrategy({ lifecycleStatus: 'archived' })
      const deleted1 = createMockStrategy({ lifecycleStatus: 'deleted' })
      const deleted2 = createMockStrategy({ lifecycleStatus: 'deleted' })

      useStrategyLifecycleStore.getState().setStrategies([
        active1,
        active2,
        archived,
        deleted1,
        deleted2,
      ])
    })

    it('should select active count', () => {
      const state = useStrategyLifecycleStore.getState()
      expect(selectActiveCount(state)).toBe(2)
    })

    it('should select archived count', () => {
      const state = useStrategyLifecycleStore.getState()
      expect(selectArchivedCount(state)).toBe(1)
    })

    it('should select deleted count', () => {
      const state = useStrategyLifecycleStore.getState()
      expect(selectDeletedCount(state)).toBe(2)
    })
  })
})

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Strategy Lifecycle Utilities', () => {
  describe('calculateScheduledPermanentDeleteAt', () => {
    it('should calculate correct date', () => {
      const now = Date.now()
      const result = calculateScheduledPermanentDeleteAt(now)
      const expectedMs = RECYCLE_BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000

      expect(result).toBe(now + expectedMs)
    })
  })

  describe('calculateRemainingDays', () => {
    it('should return correct remaining days', () => {
      const scheduledDate = Date.now() + 15 * 24 * 60 * 60 * 1000
      const result = calculateRemainingDays(scheduledDate)

      expect(result).toBe(15)
    })

    it('should return 0 for past dates', () => {
      const scheduledDate = Date.now() - 1000
      const result = calculateRemainingDays(scheduledDate)

      expect(result).toBe(0)
    })
  })

  describe('canDeleteStrategy', () => {
    it('should allow deleting stopped strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'stopped', lifecycleStatus: 'active' })
      const result = canDeleteStrategy(strategy)

      expect(result.canDelete).toBe(true)
    })

    it('should not allow deleting running strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'running', lifecycleStatus: 'active' })
      const result = canDeleteStrategy(strategy)

      expect(result.canDelete).toBe(false)
      expect(result.reason).toContain('运行中')
    })

    it('should not allow deleting already deleted strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'stopped', lifecycleStatus: 'deleted' })
      const result = canDeleteStrategy(strategy)

      expect(result.canDelete).toBe(false)
      expect(result.reason).toContain('回收站')
    })
  })

  describe('canArchiveStrategy', () => {
    it('should allow archiving stopped strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'stopped', lifecycleStatus: 'active' })
      const result = canArchiveStrategy(strategy)

      expect(result.canArchive).toBe(true)
    })

    it('should not allow archiving running strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'running', lifecycleStatus: 'active' })
      const result = canArchiveStrategy(strategy)

      expect(result.canArchive).toBe(false)
      expect(result.reason).toContain('运行中')
    })

    it('should not allow archiving already archived strategy', () => {
      const strategy = createMockStrategy({ runStatus: 'stopped', lifecycleStatus: 'archived' })
      const result = canArchiveStrategy(strategy)

      expect(result.canArchive).toBe(false)
      expect(result.reason).toContain('已归档')
    })
  })
})

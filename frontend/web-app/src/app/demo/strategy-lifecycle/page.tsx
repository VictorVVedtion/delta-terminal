'use client'

import { useEffect } from 'react'

import { StrategyListEnhanced } from '@/components/strategy'
import {
  useStrategyLifecycleHydration,
  useStrategyLifecycleStore,
} from '@/store/strategyLifecycle'
import type { StrategyWithLifecycle } from '@/types/strategy-lifecycle'

// Mock data for testing
const mockStrategies: StrategyWithLifecycle[] = [
  {
    id: 'strategy-1',
    name: 'BTC 网格策略',
    description: '在 BTC/USDT 价格区间内自动网格交易，适合震荡行情',
    runStatus: 'running',
    lifecycleStatus: 'active',
    performance: {
      pnl: 1250.50,
      pnlPercent: 12.5,
      trades: 156,
      winRate: 68,
    },
    timestamps: {
      createdAt: Date.now() - 86400000 * 30,
      updatedAt: Date.now() - 3600000,
      lastActiveAt: Date.now() - 60000,
    },
  },
  {
    id: 'strategy-2',
    name: 'ETH RSI 反转',
    description: '基于 RSI 指标的 ETH 反转策略，当 RSI 超卖时买入',
    runStatus: 'paused',
    lifecycleStatus: 'active',
    performance: {
      pnl: -320.25,
      pnlPercent: -3.2,
      trades: 42,
      winRate: 45,
    },
    timestamps: {
      createdAt: Date.now() - 86400000 * 15,
      updatedAt: Date.now() - 86400000 * 2,
      lastActiveAt: Date.now() - 86400000 * 2,
    },
  },
  {
    id: 'strategy-3',
    name: 'SOL 动量突破',
    description: 'SOL 价格突破布林带时入场，跟随趋势',
    runStatus: 'stopped',
    lifecycleStatus: 'active',
    performance: {
      pnl: 580.00,
      pnlPercent: 5.8,
      trades: 28,
      winRate: 57,
    },
    timestamps: {
      createdAt: Date.now() - 86400000 * 45,
      updatedAt: Date.now() - 86400000 * 7,
      lastActiveAt: Date.now() - 86400000 * 7,
    },
  },
  {
    id: 'strategy-4',
    name: '旧版均线策略',
    description: '已过时的均线交叉策略，已归档保存',
    runStatus: 'stopped',
    lifecycleStatus: 'archived',
    performance: {
      pnl: 2100.00,
      pnlPercent: 21.0,
      trades: 89,
      winRate: 62,
    },
    timestamps: {
      createdAt: Date.now() - 86400000 * 180,
      updatedAt: Date.now() - 86400000 * 60,
      lastActiveAt: Date.now() - 86400000 * 60,
      archivedAt: Date.now() - 86400000 * 30,
    },
  },
  {
    id: 'strategy-5',
    name: '测试策略 - 待删除',
    description: '已删除的测试策略，将在30天后永久删除',
    runStatus: 'stopped',
    lifecycleStatus: 'deleted',
    performance: {
      pnl: -50.00,
      pnlPercent: -0.5,
      trades: 5,
      winRate: 20,
    },
    timestamps: {
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 5,
      lastActiveAt: Date.now() - 86400000 * 5,
      deletedAt: Date.now() - 86400000 * 5,
      scheduledPermanentDeleteAt: Date.now() + 86400000 * 25, // 25 days remaining
    },
  },
]

export default function StrategyLifecycleDemoPage() {
  const hydrated = useStrategyLifecycleHydration()
  const { setStrategies } = useStrategyLifecycleStore()

  // Initialize mock data after hydration
  useEffect(() => {
    if (hydrated) {
      setStrategies(mockStrategies)
    }
  }, [hydrated, setStrategies])

  // Show loading state during hydration
  if (!hydrated) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">S12a 策略生命周期演示</h1>
        <p className="text-muted-foreground">
          测试策略删除、归档、回收站功能 - P0 MVP 阻塞项实现
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">功能说明</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>- **活跃标签**：显示所有活跃策略，支持删除和归档操作</li>
          <li>- **归档标签**：已归档的策略，可恢复或删除</li>
          <li>- **回收站标签**：已删除的策略，30天后自动永久删除</li>
          <li>- **运行中策略保护**：运行中的策略不能直接删除或归档</li>
          <li>- **二次确认**：危险操作需要确认，永久删除需输入确认文字</li>
        </ul>
      </div>

      <StrategyListEnhanced
        onCreateNew={() => alert('创建新策略')}
        onEdit={(id) => alert(`编辑策略: ${id}`)}
        onView={(id) => alert(`查看策略详情: ${id}`)}
      />
    </div>
  )
}

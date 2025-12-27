'use client'

import React from 'react'

import type {
  MonitorCanvasProps,
  Position,
  Trade,
} from './MonitorCanvas'
import { MonitorCanvas } from './MonitorCanvas'

/**
 * MonitorCanvas 使用示例
 *
 * 演示如何使用 MonitorCanvas 组件展示运行中策略的监控数据
 */
export function MonitorCanvasExample() {
  const [isOpen, setIsOpen] = React.useState(false)

  // Mock 数据
  const mockData: Omit<MonitorCanvasProps, 'isOpen' | 'onClose'> = {
    strategyId: 'strategy-001',

    // 策略基本信息
    strategy: {
      name: 'BTC 网格策略',
      symbol: 'BTC/USDT',
      status: 'running',
      createdAt: '2025-12-20T10:30:00Z',
      updatedAt: '2025-12-25T14:20:00Z',
    },

    // 盈亏数据
    pnl: {
      daily: 256.78,      // 当日盈亏 +256.78 USDT
      total: 1823.45,     // 总盈亏 +1823.45 USDT
      unrealized: 128.50, // 浮动盈亏 +128.50 USDT
      realized: 1694.95,  // 已实现盈亏 +1694.95 USDT
    },

    // 当前持仓
    positions: [
      {
        symbol: 'BTC/USDT',
        amount: 0.025,
        avgPrice: 95280.50,
        currentPrice: 96800.00,
        unrealizedPnl: 38.00,
        unrealizedPnlPercent: 1.59,
      },
      {
        symbol: 'ETH/USDT',
        amount: 0.5,
        avgPrice: 3620.30,
        currentPrice: 3680.50,
        unrealizedPnl: 30.10,
        unrealizedPnlPercent: 1.66,
      },
    ] as Position[],

    // 最近交易记录
    recentTrades: [
      {
        id: 'trade-010',
        timestamp: Date.now() - 300000,
        symbol: 'BTC/USDT',
        side: 'sell',
        price: 96850.00,
        amount: 0.012,
        fee: 0.58,
        realizedPnl: 18.84,
      },
      {
        id: 'trade-009',
        timestamp: Date.now() - 600000,
        symbol: 'BTC/USDT',
        side: 'buy',
        price: 96280.00,
        amount: 0.012,
        fee: 0.58,
      },
      {
        id: 'trade-008',
        timestamp: Date.now() - 1200000,
        symbol: 'ETH/USDT',
        side: 'sell',
        price: 3695.00,
        amount: 0.25,
        fee: 0.46,
        realizedPnl: 22.50,
      },
      {
        id: 'trade-007',
        timestamp: Date.now() - 1800000,
        symbol: 'ETH/USDT',
        side: 'buy',
        price: 3605.00,
        amount: 0.25,
        fee: 0.45,
      },
      {
        id: 'trade-006',
        timestamp: Date.now() - 2400000,
        symbol: 'BTC/USDT',
        side: 'sell',
        price: 95920.00,
        amount: 0.01,
        fee: 0.48,
        realizedPnl: 12.40,
      },
    ] as Trade[],

    // 性能指标
    metrics: {
      winRate: 0.72,              // 胜率 72%
      avgHoldTime: '2小时15分',    // 平均持仓时间
      maxDrawdown: 3.25,          // 最大回撤 3.25%
      totalTrades: 128,           // 总交易次数
      winningTrades: 92,          // 盈利交易
      losingTrades: 36,           // 亏损交易
    },

    // 操作回调
    onPause: () => {
      console.log('暂停策略')
      alert('策略已暂停')
    },
    onResume: () => {
      console.log('恢复策略')
      alert('策略已恢复运行')
    },
    onStop: () => {
      if (confirm('确定要停止策略吗？此操作不可撤销。')) {
        console.log('停止策略')
        alert('策略已停止')
      }
    },
    onModify: () => {
      console.log('修改参数')
      alert('跳转到参数修改页面')
    },
  }

  return (
    <div className="p-8">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold">MonitorCanvas 组件示例</h1>

        <div className="p-4 bg-card rounded-lg border border-border space-y-3">
          <h2 className="font-semibold">演示场景</h2>
          <p className="text-sm text-muted-foreground">
            点击下方按钮打开策略监控面板，查看运行中策略的实时数据：
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>实时盈亏统计</li>
            <li>当前持仓明细</li>
            <li>最近交易记录</li>
            <li>性能指标分析</li>
            <li>策略控制操作</li>
          </ul>
        </div>

        <button
          onClick={() => { setIsOpen(true); }}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          打开监控面板
        </button>

        <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-2">
          <h3 className="font-semibold">数据说明</h3>
          <ul className="space-y-1 text-muted-foreground">
            <li>• 当前使用 Mock 数据演示</li>
            <li>• 实际使用时需连接实时 WebSocket 数据流</li>
            <li>• 支持暂停/恢复/停止/修改参数操作</li>
            <li>• 按 Esc 键可快速关闭面板</li>
          </ul>
        </div>
      </div>

      {/* MonitorCanvas 组件 */}
      <MonitorCanvas
        {...mockData}
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); }}
      />
    </div>
  )
}

/**
 * 不同状态的示例数据
 */
export const mockDataVariants = {
  // 运行中 - 盈利状态
  running_profit: {
    strategy: {
      name: 'ETH 波段策略',
      symbol: 'ETH/USDT',
      status: 'running' as const,
      createdAt: '2025-12-23T08:00:00Z',
    },
    pnl: {
      daily: 450.20,
      total: 2340.80,
      unrealized: 180.50,
      realized: 2160.30,
    },
  },

  // 暂停 - 亏损状态
  paused_loss: {
    strategy: {
      name: 'SOL 做市策略',
      symbol: 'SOL/USDT',
      status: 'paused' as const,
      createdAt: '2025-12-24T12:30:00Z',
    },
    pnl: {
      daily: -120.50,
      total: -350.80,
      unrealized: -45.20,
      realized: -305.60,
    },
  },

  // 已停止
  stopped: {
    strategy: {
      name: 'DOGE 趋势策略',
      symbol: 'DOGE/USDT',
      status: 'stopped' as const,
      createdAt: '2025-12-22T15:00:00Z',
      updatedAt: '2025-12-24T18:00:00Z',
    },
    pnl: {
      daily: 0,
      total: 680.30,
      unrealized: 0,
      realized: 680.30,
    },
    positions: [], // 已停止策略无持仓
  },

  // 空持仓
  no_positions: {
    strategy: {
      name: 'ADA 套利策略',
      symbol: 'ADA/USDT',
      status: 'running' as const,
      createdAt: '2025-12-25T09:00:00Z',
    },
    positions: [],
    recentTrades: [],
  },
}

export default MonitorCanvasExample

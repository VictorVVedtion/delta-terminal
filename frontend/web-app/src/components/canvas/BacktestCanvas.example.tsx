/**
 * BacktestCanvas 使用示例
 *
 * 本文件展示如何在实际项目中使用 BacktestCanvas 组件
 */

'use client'

import React from 'react'

import type { InsightData } from '@/types/insight'

import type { BacktestMetrics, BacktestTrade, EquityCurvePoint } from './BacktestCanvas';
import { BacktestCanvas } from './BacktestCanvas'

// 示例数据
const exampleInsight: InsightData = {
  id: 'backtest-001',
  type: 'strategy_create',
  target: {
    strategy_id: 'strategy-001',
    name: 'BTC 网格交易策略',
    symbol: 'BTC/USDT',
  },
  params: [],
  explanation: '回测历史数据以验证策略效果',
  created_at: new Date().toISOString(),
}

const exampleMetrics: BacktestMetrics = {
  totalReturn: 15.8,
  winRate: 62.5,
  maxDrawdown: -8.2,
  sharpeRatio: 1.85,
  totalTrades: 120,
  winningTrades: 75,
  losingTrades: 45,
  avgProfit: 2.3,
  avgLoss: -1.8,
}

const exampleTrades: BacktestTrade[] = [
  {
    id: 'trade-001',
    timestamp: Date.now() - 86400000 * 5,
    type: 'buy',
    symbol: 'BTC/USDT',
    price: 42500,
    quantity: 0.1,
    status: 'closed',
    pnl: 125.5,
    pnlPercent: 2.95,
  },
  {
    id: 'trade-002',
    timestamp: Date.now() - 86400000 * 4,
    type: 'sell',
    symbol: 'BTC/USDT',
    price: 43750,
    quantity: 0.1,
    status: 'closed',
    pnl: -85.2,
    pnlPercent: -1.94,
  },
  {
    id: 'trade-003',
    timestamp: Date.now() - 86400000 * 3,
    type: 'buy',
    symbol: 'BTC/USDT',
    price: 41800,
    quantity: 0.15,
    status: 'open',
  },
]

const exampleEquityCurve: EquityCurvePoint[] = Array.from({ length: 30 }, (_, i) => ({
  timestamp: Date.now() - (30 - i) * 86400000,
  value: 10000 + Math.random() * 2000 - 500 + i * 50,
}))

export function BacktestCanvasExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [status, setStatus] = React.useState<'running' | 'paused' | 'completed' | 'failed'>('running')

  // 模拟回测进度
  React.useEffect(() => {
    if (status === 'running' && progress < 100) {
      const timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + 10, 100))
      }, 500)
      return () => { clearTimeout(timer); }
    }
    if (progress >= 100 && status === 'running') {
      setStatus('completed')
    }
  }, [progress, status])

  const handlePause = () => {
    setStatus('paused')
  }

  const handleResume = () => {
    setStatus('running')
  }

  const handleStop = () => {
    setStatus('failed')
    setProgress(0)
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">BacktestCanvas 示例</h1>
        <p className="text-muted-foreground mb-6">
          点击下方按钮打开回测面板，查看回测进度和结果
        </p>

        <button
          onClick={() => {
            setIsOpen(true)
            setProgress(0)
            setStatus('running')
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          开始回测
        </button>

        <BacktestCanvas
          insight={exampleInsight}
          isOpen={isOpen}
          onClose={() => { setIsOpen(false); }}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          progress={progress}
          status={status}
          metrics={exampleMetrics}
          trades={exampleTrades}
          equityCurve={exampleEquityCurve}
        />
      </div>
    </div>
  )
}

export default BacktestCanvasExample

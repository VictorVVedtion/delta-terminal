'use client'

/**
 * Test Page for BacktestInsightCanvas
 *
 * 用于测试 EPIC-007 回测组件的专用页面
 * 无需认证即可访问
 */

import React from 'react'
import { BacktestInsightCanvas } from '@/components/canvas/BacktestInsightCanvas'
import { BacktestKlineChart } from '@/components/backtest/BacktestKlineChart'
import { BacktestEquityCurve } from '@/components/backtest/BacktestEquityCurve'
import { BacktestStatsCard } from '@/components/backtest/BacktestStatsCard'
import { BacktestParamPanel } from '@/components/backtest/BacktestParamPanel'
import type {
  BacktestInsightData,
  BacktestEquityPoint,
  BacktestStats,
  BacktestParameter,
  BacktestTrade,
  ChartData,
  Candle,
  ChartSignal,
} from '@/types/insight'
import { Button } from '@/components/ui/button'

// =============================================================================
// Mock Data
// =============================================================================

// 生成模拟K线数据
function generateChartData(days: number): ChartData {
  const candles: Candle[] = []
  const signals: ChartSignal[] = []
  let price = 42000
  const now = Date.now()

  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000
    const open = price
    const change = (Math.random() - 0.5) * 2000
    const high = Math.max(open, open + change) + Math.random() * 500
    const low = Math.min(open, open + change) - Math.random() * 500
    const close = open + change
    price = close

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000000 + 500000,
    })

    // 生成交易信号
    if (Math.random() > 0.85) {
      signals.push({
        timestamp,
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        price: close,
        label: Math.random() > 0.5 ? '网格买入' : '网格卖出',
      })
    }
  }

  return {
    symbol: 'BTC/USDT',
    timeframe: '1d',
    candles,
    signals,
  }
}

// 生成模拟权益曲线数据
function generateEquityCurve(days: number, initialCapital: number): BacktestEquityPoint[] {
  const data: BacktestEquityPoint[] = []
  let equity = initialCapital
  let peakEquity = initialCapital
  const now = Date.now()

  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000
    const dailyReturn = (Math.random() - 0.45) * 0.03 // 略微正向收益
    const dailyPnl = equity * dailyReturn
    equity += dailyPnl

    if (equity > peakEquity) peakEquity = equity
    const drawdown = ((equity - peakEquity) / peakEquity) * 100

    data.push({
      timestamp,
      equity,
      dailyPnl,
      cumulativePnl: equity - initialCapital,
      drawdown,
    })
  }

  return data
}

// 模拟统计数据
const mockStats: BacktestStats = {
  initialCapital: 100000,
  finalCapital: 118500,
  peakCapital: 125000,
  totalReturn: 18.5,
  annualizedReturn: 42.3,
  maxDrawdown: -12.5,
  maxDrawdownDays: 8,
  sharpeRatio: 1.85,
  sortinoRatio: 2.12,
  profitFactor: 1.68,
  winRate: 58.5,
  totalTrades: 156,
  winningTrades: 91,
  losingTrades: 65,
  avgWin: 450,
  avgLoss: -280,
  maxWin: 2500,
  maxLoss: -1200,
  avgHoldingTime: 4.5,
  totalFees: 890,
}

// 模拟参数
const mockParameters: BacktestParameter[] = [
  {
    key: 'gridSpacing',
    label: '网格间距',
    type: 'slider',
    value: 2.5,
    defaultValue: 2.5,
    description: '每个网格之间的价格间距百分比',
    config: { min: 0.5, max: 10, step: 0.5, unit: '%' },
    group: '网格设置',
  },
  {
    key: 'gridCount',
    label: '网格数量',
    type: 'number',
    value: 10,
    defaultValue: 10,
    description: '上下网格的总数量',
    config: { min: 3, max: 50, step: 1 },
    group: '网格设置',
  },
  {
    key: 'orderSize',
    label: '单笔金额',
    type: 'number',
    value: 1000,
    defaultValue: 1000,
    description: '每笔订单的交易金额',
    config: { min: 100, max: 10000, step: 100, unit: 'USDT' },
    group: '资金管理',
  },
  {
    key: 'stopLoss',
    label: '止损比例',
    type: 'slider',
    value: 15,
    defaultValue: 15,
    description: '触发全局止损的回撤比例',
    config: { min: 5, max: 30, step: 1, unit: '%' },
    group: '风险控制',
  },
  {
    key: 'useTrailingStop',
    label: '启用追踪止损',
    type: 'toggle',
    value: true,
    defaultValue: true,
    description: '是否启用追踪止损功能',
    config: {},
    group: '风险控制',
  },
]

// 生成模拟交易记录
function generateTrades(count: number): BacktestTrade[] {
  const trades: BacktestTrade[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const entryTime = now - (count - i) * 24 * 60 * 60 * 1000
    const exitTime = entryTime + Math.random() * 12 * 60 * 60 * 1000
    const direction = Math.random() > 0.5 ? 'long' : 'short' as const
    const entryPrice = 40000 + Math.random() * 5000
    const priceChange = (Math.random() - 0.45) * 0.05 * entryPrice
    const exitPrice = direction === 'long' ? entryPrice + priceChange : entryPrice - priceChange
    const quantity = 0.1 + Math.random() * 0.5
    const pnl = (exitPrice - entryPrice) * quantity * (direction === 'long' ? 1 : -1)

    trades.push({
      id: `trade-${i + 1}`,
      entryTime,
      exitTime,
      direction,
      entryPrice,
      exitPrice,
      quantity,
      pnl,
      pnlPercent: (pnl / (entryPrice * quantity)) * 100,
      fee: entryPrice * quantity * 0.001,
      status: 'closed',
    })
  }

  return trades
}

// 完整的 BacktestInsightData
const mockInsightData: BacktestInsightData = {
  id: 'backtest-test-001',
  type: 'backtest',
  strategy: {
    name: 'BTC 网格交易策略 v2.1',
    symbol: 'BTC/USDT',
    description: '基于网格交易的自动化策略，适用于震荡行情',
    timeframe: '1d',
    parameters: mockParameters,
    entryConditions: ['价格触及网格线', 'RSI 低于 30'],
    exitConditions: ['价格触及上方网格线', '止损触发'],
  },
  period: {
    start: Date.now() - 90 * 24 * 60 * 60 * 1000,
    end: Date.now(),
  },
  stats: mockStats,
  chartData: generateChartData(90),
  equityCurve: generateEquityCurve(90, 100000),
  trades: generateTrades(50),
  benchmark: {
    equityCurve: generateEquityCurve(90, 100000),
    totalReturn: 12.5,
  },
  aiSummary: '该策略在过去90天的回测中表现良好，总收益率达18.5%，年化收益42.3%。策略的夏普比率为1.85，表明风险调整后的收益较为可观。最大回撤为12.5%，处于可接受范围内。建议在震荡行情中使用此策略，单边行情时需谨慎。',
  suggestions: [
    '考虑增加网格间距至3%以减少交易频率和手续费',
    '在强趋势行情中适当降低仓位比例',
    '可以考虑添加动态网格功能以适应不同波动率',
    '建议设置每日最大交易次数限制',
  ],
  // InsightData required fields
  params: [],
  explanation: '回测分析结果',
  created_at: new Date().toISOString(),
}

// =============================================================================
// Test Page Component
// =============================================================================

export default function TestBacktestPage() {
  const [isCanvasOpen, setIsCanvasOpen] = React.useState(false)
  const [testMode, setTestMode] = React.useState<'all' | 'kline' | 'equity' | 'stats' | 'params'>('all')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">
            EPIC-007 回测组件测试
          </h1>
          <p className="text-zinc-400">
            测试 BacktestInsightCanvas 及相关组件的渲染效果
          </p>
        </div>

        {/* Test Mode Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'all', label: '全部组件' },
            { id: 'kline', label: 'K线图' },
            { id: 'equity', label: '权益曲线' },
            { id: 'stats', label: '统计卡片' },
            { id: 'params', label: '参数面板' },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={testMode === tab.id ? 'default' : 'outline'}
              onClick={() => setTestMode(tab.id as typeof testMode)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Canvas Trigger */}
        <div className="mb-8">
          <Button
            onClick={() => setIsCanvasOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            打开 BacktestInsightCanvas 面板
          </Button>
        </div>

        {/* Test Content */}
        <div className="space-y-8">
          {/* K-line Chart */}
          {(testMode === 'all' || testMode === 'kline') && (
            <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
              <h2 className="text-xl font-semibold mb-4 text-zinc-200">
                BacktestKlineChart - K线图组件
              </h2>
              <BacktestKlineChart
                data={mockInsightData.chartData}
                height={400}
                showVolume
              />
            </div>
          )}

          {/* Equity Curve */}
          {(testMode === 'all' || testMode === 'equity') && (
            <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
              <h2 className="text-xl font-semibold mb-4 text-zinc-200">
                BacktestEquityCurve - 权益曲线组件
              </h2>
              <BacktestEquityCurve
                data={mockInsightData.equityCurve}
                benchmark={mockInsightData.benchmark?.equityCurve}
                initialCapital={mockStats.initialCapital}
                height={350}
                showDrawdown
                showDailyPnL
                showBenchmark
              />
            </div>
          )}

          {/* Stats Card */}
          {(testMode === 'all' || testMode === 'stats') && (
            <div className="space-y-6">
              <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
                <h2 className="text-xl font-semibold mb-4 text-zinc-200">
                  BacktestStatsCard - 完整模式
                </h2>
                <BacktestStatsCard stats={mockStats} mode="full" />
              </div>

              <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
                <h2 className="text-xl font-semibold mb-4 text-zinc-200">
                  BacktestStatsCard - 紧凑模式
                </h2>
                <BacktestStatsCard stats={mockStats} mode="compact" />
              </div>

              <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
                <h2 className="text-xl font-semibold mb-4 text-zinc-200">
                  BacktestStatsCard - 最小模式
                </h2>
                <BacktestStatsCard stats={mockStats} mode="minimal" />
              </div>
            </div>
          )}

          {/* Param Panel */}
          {(testMode === 'all' || testMode === 'params') && (
            <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
              <h2 className="text-xl font-semibold mb-4 text-zinc-200">
                BacktestParamPanel - 参数面板组件
              </h2>
              <BacktestParamPanel
                parameters={mockParameters}
                onChange={(key, value) => console.log('Param changed:', key, value)}
                onReset={() => console.log('Reset params')}
                onRerun={() => console.log('Rerun backtest')}
                isRunning={false}
                grouped
              />
            </div>
          )}
        </div>

        {/* Canvas Component */}
        <BacktestInsightCanvas
          insight={mockInsightData}
          isOpen={isCanvasOpen}
          onClose={() => setIsCanvasOpen(false)}
          onParameterChange={(key, value) => console.log('Canvas param:', key, value)}
          onRerun={(params) => console.log('Canvas rerun:', params)}
        />
      </div>
    </div>
  )
}

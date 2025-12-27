'use client'

import { FlaskConical, History, LineChart } from 'lucide-react'
import React from 'react'

import { BacktestForm } from '@/components/backtest/BacktestForm'
import { BacktestHistory } from '@/components/backtest/BacktestHistory'
import { BacktestResults } from '@/components/backtest/BacktestResults'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent,TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BacktestConfig, BacktestResult, BacktestTrade,EquityPoint } from '@/types/backtest'

// =============================================================================
// Backtest Page
// =============================================================================

export default function BacktestPage() {
  const [activeTab, setActiveTab] = React.useState('new')
  const [isRunning, setIsRunning] = React.useState(false)
  const [result, setResult] = React.useState<BacktestResult | null>(null)

  // Handle backtest execution
  const handleRunBacktest = React.useCallback(async (config: BacktestConfig) => {
    setIsRunning(true)
    setResult(null)

    // Simulate backtest execution
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock result
    const mockResult: BacktestResult = {
      id: `bt_${Date.now()}`,
      config,
      metrics: {
        totalReturn: 45.67,
        annualizedReturn: 89.34,
        maxDrawdown: -12.45,
        sharpeRatio: 2.34,
        winRate: 68.5,
        totalTrades: 156,
        profitFactor: 2.1,
        avgWin: 3.2,
        avgLoss: -1.5,
      },
      equity: generateMockEquityCurve(config.startDate, config.endDate),
      trades: generateMockTrades(50),
      createdAt: new Date().toISOString(),
    }

    setResult(mockResult)
    setIsRunning(false)
    setActiveTab('results')
  }, [])

  // Mock history data
  const historyItems = [
    {
      id: 'bt_1',
      name: 'RSI 策略回测',
      symbol: 'BTC/USDT',
      period: '2024-01-01 - 2024-06-01',
      totalReturn: 34.5,
      status: 'completed' as const,
      createdAt: Date.now() - 86400000,
    },
    {
      id: 'bt_2',
      name: '均线交叉策略',
      symbol: 'ETH/USDT',
      period: '2024-03-01 - 2024-06-01',
      totalReturn: -5.2,
      status: 'completed' as const,
      createdAt: Date.now() - 172800000,
    },
    {
      id: 'bt_3',
      name: '网格策略回测',
      symbol: 'SOL/USDT',
      period: '2024-02-01 - 2024-06-01',
      totalReturn: 22.8,
      status: 'completed' as const,
      createdAt: Date.now() - 259200000,
    },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">策略回测</h1>
          <p className="text-muted-foreground mt-1">
            使用历史数据验证和优化你的交易策略
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="new" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              新建回测
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2" disabled={!result}>
              <LineChart className="h-4 w-4" />
              回测结果
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              历史记录
            </TabsTrigger>
          </TabsList>

          {/* New Backtest */}
          <TabsContent value="new" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Config Form */}
              <div className="lg:col-span-2">
                <BacktestForm
                  onSubmit={handleRunBacktest}
                  isRunning={isRunning}
                />
              </div>

              {/* Quick Tips */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">回测提示</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      • 选择足够长的时间周期以获得可靠的结果
                    </p>
                    <p>
                      • 考虑不同市场条件（牛市、熊市、震荡市）
                    </p>
                    <p>
                      • 注意滑点和手续费对收益的影响
                    </p>
                    <p>
                      • 避免过度拟合历史数据
                    </p>
                    <p>
                      • 使用样本外数据验证策略
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Results */}
          <TabsContent value="results" className="mt-6">
            {result ? (
              <BacktestResults result={result} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  运行回测后将在此显示结果
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="mt-6">
            <BacktestHistory
              items={historyItems}
              onSelect={(_id) => { /* TODO: Implement backtest selection */ }}
              onDelete={(_id) => { /* TODO: Implement backtest deletion */ }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateMockEquityCurve(startDate: string, endDate: string): EquityPoint[] {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const days = Math.floor((end - start) / (24 * 60 * 60 * 1000))
  const points: EquityPoint[] = []

  let equity = 10000
  for (let i = 0; i <= days; i++) {
    const date = new Date(start + i * 24 * 60 * 60 * 1000)
    equity *= 1 + (Math.random() - 0.45) * 0.03
    const dateStr = date.toISOString().split('T')[0]
    points.push({
      date: dateStr ?? '',
      equity: Math.round(equity * 100) / 100,
    })
  }

  return points
}

function generateMockTrades(count: number): BacktestTrade[] {
  const trades: BacktestTrade[] = []
  const symbols = ['BTC/USDT', 'ETH/USDT'] as const
  const sides = ['buy', 'sell'] as const

  for (let i = 0; i < count; i++) {
    const entryPrice = 40000 + Math.random() * 10000
    const pnlPercent = (Math.random() - 0.4) * 10
    const symbolIndex = Math.floor(Math.random() * symbols.length)
    const sideIndex = Math.floor(Math.random() * sides.length)
    trades.push({
      id: `trade_${i}`,
      symbol: symbols[symbolIndex] ?? 'BTC/USDT',
      side: sides[sideIndex] ?? 'buy',
      entryPrice,
      exitPrice: entryPrice * (1 + pnlPercent / 100),
      quantity: Math.random() * 0.5,
      pnl: pnlPercent * 100,
      pnlPercent,
      entryTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      exitTime: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  return trades
}

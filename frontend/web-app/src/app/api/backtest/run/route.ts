/**
 * POST /api/backtest/run
 *
 * 启动回测任务
 * 实际环境会调用 Python 回测引擎，这里先返回模拟数据
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import type {
  BacktestEquityPoint,
  BacktestInsightData,
  BacktestParameter,
  BacktestStats,
  BacktestTrade,
  Candle,
  ChartData,
  ChartSignal,
} from '@/types/insight'

// 模拟回测计算延迟
const SIMULATE_DELAY = 2000

// ============================================================================
// Mock Data Generators
// ============================================================================

function generateCandles(startTime: number, endTime: number, timeframe: string): Candle[] {
  const candles: Candle[] = []
  const intervalMs = getIntervalMs(timeframe)
  let price = 40000 + Math.random() * 5000
  let time = startTime

  while (time <= endTime) {
    const open = price
    const change = (Math.random() - 0.48) * price * 0.02
    const high = Math.max(open, open + change) + Math.random() * price * 0.005
    const low = Math.min(open, open + change) - Math.random() * price * 0.005
    const close = open + change
    price = close

    candles.push({
      timestamp: time,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000000 + 500000,
    })

    time += intervalMs
  }

  return candles
}

function generateSignals(candles: Candle[]): ChartSignal[] {
  const signals: ChartSignal[] = []

  candles.forEach((candle, i) => {
    if (i < 10) return
    if (Math.random() > 0.92) {
      signals.push({
        timestamp: candle.timestamp,
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        price: candle.close,
        label: Math.random() > 0.5 ? '网格买入' : '网格卖出',
      })
    }
  })

  return signals
}

function generateEquityCurve(
  startTime: number,
  endTime: number,
  initialCapital: number
): BacktestEquityPoint[] {
  const points: BacktestEquityPoint[] = []
  const dayMs = 24 * 60 * 60 * 1000
  let equity = initialCapital
  let peakEquity = initialCapital
  let time = startTime

  while (time <= endTime) {
    const dailyReturn = (Math.random() - 0.45) * 0.025
    const dailyPnl = equity * dailyReturn
    equity += dailyPnl

    if (equity > peakEquity) peakEquity = equity
    const drawdown = ((equity - peakEquity) / peakEquity) * 100

    points.push({
      timestamp: time,
      equity,
      dailyPnl,
      cumulativePnl: equity - initialCapital,
      drawdown,
    })

    time += dayMs
  }

  return points
}

function generateTrades(signals: ChartSignal[]): BacktestTrade[] {
  const trades: BacktestTrade[] = []

  for (let i = 0; i < signals.length - 1; i += 2) {
    const entry = signals[i]
    const exit = signals[i + 1]
    if (!entry || !exit) break

    const direction = entry.type === 'buy' ? 'long' : 'short' as const
    const quantity = 0.1 + Math.random() * 0.4
    const pnl =
      direction === 'long'
        ? (exit.price - entry.price) * quantity
        : (entry.price - exit.price) * quantity

    const trade: BacktestTrade = {
      id: `trade-${i}`,
      entryTime: entry.timestamp,
      exitTime: exit.timestamp,
      direction,
      entryPrice: entry.price,
      exitPrice: exit.price,
      quantity,
      pnl,
      pnlPercent: (pnl / (entry.price * quantity)) * 100,
      fee: entry.price * quantity * 0.001,
      status: 'closed',
    }

    // 可选字段：仅在有值时添加
    if (entry.label) trade.entrySignal = entry.label
    if (exit.label) trade.exitSignal = exit.label

    trades.push(trade)
  }

  return trades
}

function calculateStats(
  trades: BacktestTrade[],
  equityCurve: BacktestEquityPoint[],
  initialCapital: number
): BacktestStats {
  const winningTrades = trades.filter((t) => t.pnl > 0)
  const losingTrades = trades.filter((t) => t.pnl < 0)
  const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? initialCapital
  const peakEquity = Math.max(...equityCurve.map((p) => p.equity))
  const maxDrawdown = Math.min(...equityCurve.map((p) => p.drawdown))

  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100
  const days = equityCurve.length
  const annualizedReturn = (Math.pow(finalEquity / initialCapital, 365 / days) - 1) * 100

  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length
    : 0
  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length
    : 0

  const totalFees = trades.reduce((s, t) => s + t.fee, 0)

  // 简化的夏普比率计算
  const dailyReturns = equityCurve.map((p) => p.dailyPnl / (p.equity - p.dailyPnl))
  const avgDailyReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
  const stdDev = Math.sqrt(
    dailyReturns.reduce((s, r) => s + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length
  )
  const sharpeRatio = stdDev > 0 ? (avgDailyReturn * Math.sqrt(252)) / stdDev : 0

  return {
    totalReturn,
    annualizedReturn,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    profitFactor:
      Math.abs(avgLoss) > 0
        ? (winningTrades.reduce((s, t) => s + t.pnl, 0) /
            Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0))) || 0
        : 0,
    maxDrawdown,
    maxDrawdownDays: Math.floor(Math.random() * 10) + 1,
    sharpeRatio,
    sortinoRatio: sharpeRatio * 1.15,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWin,
    avgLoss,
    maxWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl)) : 0,
    maxLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl)) : 0,
    avgHoldingTime:
      trades.length > 0
        ? trades.reduce((s, t) => {
            const exitTime = t.exitTime ?? t.entryTime
            return s + (exitTime - t.entryTime)
          }, 0) / trades.length / 3600000
        : 0,
    initialCapital,
    finalCapital: finalEquity,
    peakCapital: peakEquity,
    totalFees,
  }
}

function getIntervalMs(timeframe: string): number {
  const defaultInterval = 60 * 60 * 1000 // 1h default
  const map: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': defaultInterval,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  }
  return map[timeframe] ?? defaultInterval
}

// ============================================================================
// API Handler
// ============================================================================

interface RunBacktestRequest {
  jobId: string
  config: {
    strategyName: string
    strategyDescription: string
    symbol: string
    timeframe: string
    startDate: number
    endDate: number
    initialCapital: number
    parameters: BacktestParameter[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RunBacktestRequest = await request.json()
    const { jobId, config } = body

    // 模拟回测计算时间
    await new Promise((resolve) => setTimeout(resolve, SIMULATE_DELAY))

    // 生成模拟数据
    const candles = generateCandles(config.startDate, config.endDate, config.timeframe)
    const signals = generateSignals(candles)
    const equityCurve = generateEquityCurve(
      config.startDate,
      config.endDate,
      config.initialCapital
    )
    const trades = generateTrades(signals)
    const stats = calculateStats(trades, equityCurve, config.initialCapital)

    const chartData: ChartData = {
      symbol: config.symbol,
      timeframe: config.timeframe,
      candles,
      signals,
    }

    const result: BacktestInsightData = {
      id: jobId,
      type: 'backtest',
      strategy: {
        name: config.strategyName || '未命名策略',
        description: config.strategyDescription || 'AI 生成的交易策略',
        symbol: config.symbol,
        timeframe: config.timeframe,
        parameters: config.parameters,
        entryConditions: ['RSI < 30', '价格触及支撑位'],
        exitConditions: ['RSI > 70', '价格触及阻力位', '止损触发'],
      },
      stats,
      trades,
      equityCurve,
      chartData,
      benchmark: {
        equityCurve: generateEquityCurve(
          config.startDate,
          config.endDate,
          config.initialCapital
        ),
        totalReturn: (Math.random() - 0.3) * 30,
      },
      period: {
        start: config.startDate,
        end: config.endDate,
      },
      aiSummary: generateAISummary(stats),
      suggestions: generateSuggestions(stats),
      params: [],
      explanation: `${config.strategyName || '策略'} 在 ${config.symbol} ${config.timeframe} 周期的回测结果`,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Backtest error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Backtest failed' },
      { status: 500 }
    )
  }
}

function generateAISummary(stats: BacktestStats): string {
  const performance = stats.totalReturn > 20 ? '优秀' : stats.totalReturn > 10 ? '良好' : '一般'
  const risk = Math.abs(stats.maxDrawdown) < 10 ? '较低' : Math.abs(stats.maxDrawdown) < 20 ? '中等' : '较高'

  return `该策略回测表现${performance}，总收益率 ${stats.totalReturn.toFixed(1)}%，年化收益 ${stats.annualizedReturn.toFixed(1)}%。` +
    `胜率 ${stats.winRate.toFixed(1)}%，盈亏比 ${stats.profitFactor.toFixed(2)}。` +
    `最大回撤 ${stats.maxDrawdown.toFixed(1)}%，风险水平${risk}。` +
    `夏普比率 ${stats.sharpeRatio.toFixed(2)}，表明风险调整后收益${stats.sharpeRatio > 1.5 ? '较好' : '一般'}。`
}

function generateSuggestions(stats: BacktestStats): string[] {
  const suggestions: string[] = []

  if (stats.winRate < 50) {
    suggestions.push('胜率偏低，建议优化入场条件或增加过滤信号')
  }
  if (Math.abs(stats.maxDrawdown) > 20) {
    suggestions.push('最大回撤较大，建议降低仓位或添加止损机制')
  }
  if (stats.profitFactor < 1.5) {
    suggestions.push('盈亏比不足，考虑优化止盈止损比例')
  }
  if (stats.totalTrades < 30) {
    suggestions.push('交易次数较少，样本量不足以得出可靠结论')
  }
  if (stats.sharpeRatio < 1) {
    suggestions.push('风险调整收益较低，建议减少交易频率或优化策略逻辑')
  }

  if (suggestions.length === 0) {
    suggestions.push('策略表现良好，可考虑小仓位实盘测试')
    suggestions.push('建议在不同市场环境下进行更多回测验证')
  }

  return suggestions
}

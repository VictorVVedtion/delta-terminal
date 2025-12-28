/**
 * POST /api/backtest/run
 *
 * 启动回测任务
 * 生产环境代理到 Python 回测引擎，开发环境返回模拟数据
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

// 回测引擎 API 地址（Railway 部署后设置）
const BACKTEST_ENGINE_URL = process.env.BACKTEST_ENGINE_URL

// 模拟回测计算延迟
const SIMULATE_DELAY = 2000

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * 根据交易对获取合理的价格范围
 */
function getPriceRangeForSymbol(symbol: string): { base: number; volatility: number } {
  const symbolLower = symbol.toLowerCase()

  // 常见交易对的价格范围
  if (symbolLower.includes('btc')) {
    return { base: 95000, volatility: 0.015 } // BTC 当前约 95000 USDT
  }
  if (symbolLower.includes('eth')) {
    return { base: 3400, volatility: 0.02 } // ETH 当前约 3400 USDT
  }
  if (symbolLower.includes('sol')) {
    return { base: 190, volatility: 0.03 } // SOL 当前约 190 USDT
  }
  if (symbolLower.includes('bnb')) {
    return { base: 700, volatility: 0.02 } // BNB 当前约 700 USDT
  }
  if (symbolLower.includes('xrp')) {
    return { base: 2.2, volatility: 0.03 } // XRP 当前约 2.2 USDT
  }
  if (symbolLower.includes('doge')) {
    return { base: 0.32, volatility: 0.04 } // DOGE 当前约 0.32 USDT
  }
  if (symbolLower.includes('ada')) {
    return { base: 0.9, volatility: 0.03 } // ADA 当前约 0.9 USDT
  }
  if (symbolLower.includes('avax')) {
    return { base: 40, volatility: 0.03 } // AVAX 当前约 40 USDT
  }
  if (symbolLower.includes('link')) {
    return { base: 23, volatility: 0.025 } // LINK 当前约 23 USDT
  }

  // 默认使用中等价格
  return { base: 100, volatility: 0.02 }
}

function generateCandles(
  startTime: number,
  endTime: number,
  timeframe: string,
  symbol: string
): Candle[] {
  const candles: Candle[] = []
  const intervalMs = getIntervalMs(timeframe)
  const { base, volatility } = getPriceRangeForSymbol(symbol)

  // 起始价格在基准价格附近波动
  let price = base * (0.95 + Math.random() * 0.1)
  let time = startTime

  while (time <= endTime) {
    const open = price
    // 使用符号特定的波动率
    const change = (Math.random() - 0.48) * price * volatility
    const high = Math.max(open, open + change) + Math.random() * price * volatility * 0.3
    const low = Math.min(open, open + change) - Math.random() * price * volatility * 0.3
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

function generateSignals(candles: Candle[], strategyName: string): ChartSignal[] {
  const signals: ChartSignal[] = []
  const isGrid = strategyName.toLowerCase().includes('网格') || strategyName.toLowerCase().includes('grid')

  // 确保生成足够多的信号用于可视化
  const signalProbability = isGrid ? 0.08 : 0.05 // 网格策略信号更频繁
  let lastSignalType: 'buy' | 'sell' | 'close' = 'sell' // 交替生成买卖信号

  candles.forEach((candle, i) => {
    if (i < 5) return // 跳过前几根K线

    if (Math.random() < signalProbability) {
      // 交替买卖，网格策略特点
      const type = lastSignalType === 'buy' ? 'sell' : 'buy'
      lastSignalType = type

      let label: string
      if (isGrid) {
        label = type === 'buy' ? '网格买入' : '网格卖出'
      } else {
        label = type === 'buy' ? '入场' : '出场'
      }

      signals.push({
        timestamp: candle.timestamp,
        type,
        price: type === 'buy' ? candle.low : candle.high, // 买在低点，卖在高点
        label,
      })
    }
  })

  // 确保至少有一些信号
  if (signals.length < 5 && candles.length > 20) {
    // 强制添加几个信号点
    const indices = [10, 25, 40, 55, 70].filter(i => i < candles.length)
    indices.forEach((idx, i) => {
      const candle = candles[idx]
      if (candle) {
        const type = i % 2 === 0 ? 'buy' : 'sell'
        signals.push({
          timestamp: candle.timestamp,
          type,
          price: type === 'buy' ? candle.low : candle.high,
          label: isGrid ? (type === 'buy' ? '网格买入' : '网格卖出') : (type === 'buy' ? '入场' : '出场'),
        })
      }
    })
  }

  // 按时间排序
  signals.sort((a, b) => a.timestamp - b.timestamp)

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

    // 如果配置了真实回测引擎 URL，则代理请求
    if (BACKTEST_ENGINE_URL) {
      try {
        const engineResponse = await fetch(`${BACKTEST_ENGINE_URL}/api/v1/backtest/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              strategy_id: config.strategyName,
              symbols: [config.symbol],
              start_date: new Date(config.startDate).toISOString(),
              end_date: new Date(config.endDate).toISOString(),
              initial_capital: config.initialCapital,
              commission: 0.001,
              slippage: 0.0005,
              parameters: Object.fromEntries(
                config.parameters.map(p => [p.key, p.value])
              ),
            },
            data_source: 'mock',
          }),
        })

        if (!engineResponse.ok) {
          throw new Error(`Backtest engine error: ${engineResponse.statusText}`)
        }

        const engineResult = await engineResponse.json()

        // 转换 Python 引擎响应格式为前端期望的格式
        return NextResponse.json(transformEngineResult(engineResult, config, jobId))
      } catch (engineError) {
        console.warn('Backtest engine unavailable, falling back to mock:', engineError)
        // 回退到 mock 数据
      }
    }

    // 模拟回测计算时间（Mock 模式）
    await new Promise((resolve) => setTimeout(resolve, SIMULATE_DELAY))

    // 生成模拟数据
    const candles = generateCandles(config.startDate, config.endDate, config.timeframe, config.symbol)
    const signals = generateSignals(candles, config.strategyName)
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

// ============================================================================
// Engine Result Transformer
// ============================================================================

interface EngineResult {
  backtest_id: string
  config: {
    strategy_id: string
    symbols: string[]
    start_date: string
    end_date: string
    initial_capital: number
  }
  metrics: {
    total_return: number
    annual_return: number
    volatility: number
    sharpe_ratio: number
    sortino_ratio: number
    calmar_ratio: number
    max_drawdown: number
    max_drawdown_duration: number
    total_trades: number
    win_rate: number
    profit_factor: number
    average_win: number
    average_loss: number
    largest_win: number
    largest_loss: number
  }
  equity_curve: Array<{
    timestamp: string
    equity: number
    drawdown: number
  }>
  trades: Array<{
    trade_id: string
    symbol: string
    direction: 'long' | 'short'
    entry_time: string
    exit_time: string
    entry_price: number
    exit_price: number
    quantity: number
    pnl: number
    commission: number
  }>
}

function transformEngineResult(
  engineResult: EngineResult,
  config: RunBacktestRequest['config'],
  jobId: string
): BacktestInsightData {
  const metrics = engineResult.metrics

  // 转换权益曲线
  const equityCurve: BacktestEquityPoint[] = engineResult.equity_curve.map((point, index, arr) => {
    const prevEquity = index > 0 ? (arr[index - 1]?.equity ?? config.initialCapital) : config.initialCapital
    return {
      timestamp: new Date(point.timestamp).getTime(),
      equity: point.equity,
      dailyPnl: point.equity - prevEquity,
      cumulativePnl: point.equity - config.initialCapital,
      drawdown: point.drawdown * 100,
    }
  })

  // 转换交易记录
  const trades: BacktestTrade[] = engineResult.trades.map(trade => ({
    id: trade.trade_id,
    entryTime: new Date(trade.entry_time).getTime(),
    exitTime: new Date(trade.exit_time).getTime(),
    direction: trade.direction,
    entryPrice: trade.entry_price,
    exitPrice: trade.exit_price,
    quantity: trade.quantity,
    pnl: trade.pnl,
    pnlPercent: (trade.pnl / (trade.entry_price * trade.quantity)) * 100,
    fee: trade.commission,
    status: 'closed' as const,
  }))

  // 构建统计数据
  const stats: BacktestStats = {
    totalReturn: metrics.total_return * 100,
    annualizedReturn: metrics.annual_return * 100,
    winRate: metrics.win_rate * 100,
    profitFactor: metrics.profit_factor,
    maxDrawdown: metrics.max_drawdown * 100,
    maxDrawdownDays: metrics.max_drawdown_duration,
    sharpeRatio: metrics.sharpe_ratio,
    sortinoRatio: metrics.sortino_ratio,
    totalTrades: metrics.total_trades,
    winningTrades: Math.round(metrics.total_trades * metrics.win_rate),
    losingTrades: Math.round(metrics.total_trades * (1 - metrics.win_rate)),
    avgWin: metrics.average_win,
    avgLoss: metrics.average_loss,
    maxWin: metrics.largest_win,
    maxLoss: metrics.largest_loss,
    avgHoldingTime: 0, // TODO: calculate from trades
    initialCapital: config.initialCapital,
    finalCapital: equityCurve[equityCurve.length - 1]?.equity ?? config.initialCapital,
    peakCapital: Math.max(...equityCurve.map(p => p.equity)),
    totalFees: trades.reduce((sum, t) => sum + t.fee, 0),
  }

  return {
    id: jobId,
    type: 'backtest',
    strategy: {
      name: config.strategyName,
      description: config.strategyDescription || 'AI 生成的交易策略',
      symbol: config.symbol,
      timeframe: config.timeframe,
      parameters: config.parameters,
      entryConditions: [],
      exitConditions: [],
    },
    stats,
    trades,
    equityCurve,
    chartData: {
      symbol: config.symbol,
      timeframe: config.timeframe,
      candles: [],
      signals: [],
    },
    benchmark: {
      equityCurve: [],
      totalReturn: 0,
    },
    period: {
      start: config.startDate,
      end: config.endDate,
    },
    aiSummary: generateAISummary(stats),
    suggestions: generateSuggestions(stats),
    params: [],
    explanation: `${config.strategyName} 在 ${config.symbol} ${config.timeframe} 周期的回测结果`,
    created_at: new Date().toISOString(),
  }
}

/**
 * API Mock Data - 开发和测试用 Mock 数据
 * Story 1.2: 部署 API 接口与 AgentStore 状态管理
 * Story 2.2: 回测 API 接口与 Mock 数据
 */

import type {
  BacktestConfig,
  BacktestHistoryItem,
  BacktestMetrics,
  BacktestResult,
  BacktestRunState,
  BacktestTrade,
  EquityPoint,
} from '@/types/backtest'
import type {
  BacktestSummary,
  DeploymentResult,
  DeploymentStatus,
  PaperPerformance,
} from '@/types/deployment'

// =============================================================================
// Mock Deployment Results
// =============================================================================

export const mockPaperDeploymentResult: DeploymentResult = {
  success: true,
  agentId: 'agent_mock_paper_001',
  deploymentId: 'deploy_paper_001',
  mode: 'paper',
  deployedAt: new Date().toISOString(),
  message: 'Paper 部署成功，虚拟资金 $10,000 已分配',
}

export const mockLiveDeploymentResult: DeploymentResult = {
  success: true,
  agentId: 'agent_mock_live_001',
  deploymentId: 'deploy_live_001',
  mode: 'live',
  deployedAt: new Date().toISOString(),
  message: 'Live 部署成功，初始资金 $5,000 已就位',
}

export const mockFailedDeploymentResult: DeploymentResult = {
  success: false,
  agentId: '',
  deploymentId: 'deploy_failed_001',
  mode: 'paper',
  deployedAt: new Date().toISOString(),
  message: '部署失败: 回测未通过',
}

// =============================================================================
// Mock Deployment Status
// =============================================================================

export const mockDeploymentStatusPending: DeploymentStatus = {
  status: 'pending',
  progress: 0,
  currentStep: '准备部署环境...',
  startedAt: new Date().toISOString(),
}

export const mockDeploymentStatusInProgress: DeploymentStatus = {
  status: 'in_progress',
  progress: 50,
  currentStep: '正在初始化交易引擎...',
  startedAt: new Date(Date.now() - 5000).toISOString(),
}

export const mockDeploymentStatusCompleted: DeploymentStatus = {
  status: 'completed',
  progress: 100,
  currentStep: '部署完成',
  startedAt: new Date(Date.now() - 10000).toISOString(),
  completedAt: new Date().toISOString(),
}

export const mockDeploymentStatusFailed: DeploymentStatus = {
  status: 'failed',
  progress: 30,
  currentStep: '初始化失败',
  error: '无法连接到交易所 API',
  startedAt: new Date(Date.now() - 5000).toISOString(),
}

// =============================================================================
// Mock Backtest Summary
// =============================================================================

export const mockBacktestPassed: BacktestSummary = {
  passed: true,
  expectedReturn: 15.2,
  maxDrawdown: 8.5,
  winRate: 68.5,
  backtestId: 'backtest_001',
  completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
}

export const mockBacktestFailed: BacktestSummary = {
  passed: false,
  expectedReturn: -5.2,
  maxDrawdown: 25.0,
  winRate: 35.0,
  backtestId: 'backtest_002',
  completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
}

// =============================================================================
// Mock Paper Performance
// =============================================================================

export const mockPaperPerformanceReady: PaperPerformance = {
  runningDays: 10,
  requiredDays: 7,
  pnl: 1250.5,
  pnlPercent: 12.5,
  startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
}

export const mockPaperPerformanceNotReady: PaperPerformance = {
  runningDays: 3,
  requiredDays: 7,
  pnl: 250.0,
  pnlPercent: 2.5,
  startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
}

export const mockPaperPerformanceNegative: PaperPerformance = {
  runningDays: 8,
  requiredDays: 7,
  pnl: -500.0,
  pnlPercent: -5.0,
  startedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
}

// =============================================================================
// Mock API Delay Simulator
// =============================================================================

/**
 * 模拟 API 延迟
 */
export function simulateDelay(ms = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 模拟随机延迟 (用于更真实的体验)
 */
export function simulateRandomDelay(min = 500, max = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return simulateDelay(delay)
}

// =============================================================================
// Mock API Functions
// =============================================================================

/**
 * Mock deployPaper API
 */
export async function mockDeployPaper(
  _strategyId: string,
  config: { virtualCapital: number }
): Promise<DeploymentResult> {
  await simulateDelay(1500)
  return {
    ...mockPaperDeploymentResult,
    message: `Paper 部署成功，虚拟资金 $${config.virtualCapital.toLocaleString()} 已分配`,
  }
}

/**
 * Mock deployLive API
 */
export async function mockDeployLive(
  _strategyId: string,
  config: { initialCapital: number; confirmationToken: string }
): Promise<DeploymentResult> {
  await simulateDelay(2000)

  // 模拟 token 验证
  if (!config.confirmationToken.startsWith('confirm_')) {
    return {
      ...mockFailedDeploymentResult,
      mode: 'live',
      message: '确认令牌无效',
    }
  }

  return {
    ...mockLiveDeploymentResult,
    message: `Live 部署成功，初始资金 $${config.initialCapital.toLocaleString()} 已就位`,
  }
}

/**
 * Mock getDeploymentStatus API
 */
export async function mockGetDeploymentStatus(
  _deploymentId: string
): Promise<DeploymentStatus> {
  await simulateDelay(500)
  // 随机返回不同状态用于测试
  const statuses: DeploymentStatus[] = [
    mockDeploymentStatusPending,
    mockDeploymentStatusInProgress,
    mockDeploymentStatusCompleted,
  ]
  const index = Math.floor(Math.random() * statuses.length)
  return statuses[index]
}

/**
 * Mock getStrategyBacktestResult API
 */
export async function mockGetStrategyBacktestResult(
  _strategyId: string
): Promise<BacktestSummary> {
  await simulateDelay(500)
  // 80% 概率返回通过
  return Math.random() > 0.2 ? mockBacktestPassed : mockBacktestFailed
}

/**
 * Mock getPaperPerformance API
 */
export async function mockGetPaperPerformance(
  _agentId: string
): Promise<PaperPerformance> {
  await simulateDelay(500)
  // 70% 概率返回已就绪
  return Math.random() > 0.3 ? mockPaperPerformanceReady : mockPaperPerformanceNotReady
}

// =============================================================================
// Development Mode Check
// =============================================================================

/**
 * 检查是否为开发模式
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * 检查是否启用 Mock API
 */
export function isMockApiEnabled(): boolean {
  return (
    isDevelopmentMode() &&
    process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'
  )
}

// =============================================================================
// Mock Backtest Data (Story 2.2)
// =============================================================================

/**
 * Mock 回测配置
 */
export const mockBacktestConfig: BacktestConfig = {
  name: 'RSI 策略回测',
  symbol: 'BTC/USDT',
  strategyType: 'rsi',
  startDate: '2024-01-01',
  endDate: '2024-06-30',
  initialCapital: 10000,
  feeRate: 0.1,
  slippage: 0.05,
  params: {
    period: 14,
    overbought: 70,
    oversold: 30,
  },
}

/**
 * Mock 回测指标
 */
export const mockBacktestMetrics: BacktestMetrics = {
  totalReturn: 23.45,
  annualizedReturn: 52.8,
  maxDrawdown: -12.3,
  sharpeRatio: 1.85,
  winRate: 62.5,
  totalTrades: 48,
  profitFactor: 1.92,
  avgWin: 3.2,
  avgLoss: -1.8,
  maxConsecutiveWins: 6,
  maxConsecutiveLosses: 3,
  avgHoldingTime: 18.5,
}

/**
 * Mock 权益曲线
 */
export const mockEquityCurve: EquityPoint[] = Array.from({ length: 180 }, (_, i) => {
  const date = new Date('2024-01-01')
  date.setDate(date.getDate() + i)
  const baseGrowth = 10000 * (1 + (i / 180) * 0.25)
  const volatility = Math.sin(i / 10) * 500 + Math.random() * 300
  return {
    date: date.toISOString().split('T')[0],
    equity: baseGrowth + volatility,
    drawdown: Math.random() * -5,
  }
})

/**
 * Mock 交易记录
 */
export const mockBacktestTrades: BacktestTrade[] = Array.from({ length: 48 }, (_, i) => {
  // 模拟 2025 年回测数据
  const entryDate = new Date('2025-01-01')
  entryDate.setDate(entryDate.getDate() + i * 3 + Math.floor(Math.random() * 3))
  const exitDate = new Date(entryDate)
  exitDate.setDate(exitDate.getDate() + 1 + Math.floor(Math.random() * 3))

  const side = Math.random() > 0.5 ? 'buy' : 'sell' as const
  const entryPrice = 90000 + Math.random() * 15000
  const pnlPercent = (Math.random() - 0.4) * 10
  const exitPrice = entryPrice * (1 + pnlPercent / 100)
  const quantity = 0.01 + Math.random() * 0.1

  return {
    id: `trade_${i + 1}`,
    symbol: 'BTC/USDT',
    side,
    entryPrice,
    exitPrice,
    quantity,
    pnl: (exitPrice - entryPrice) * quantity * (side === 'buy' ? 1 : -1),
    pnlPercent,
    entryTime: entryDate.toISOString(),
    exitTime: exitDate.toISOString(),
    fee: entryPrice * quantity * 0.001,
    signal: side === 'buy' ? 'RSI 超卖' : 'RSI 超买',
  }
})

/**
 * Mock 完整回测结果
 */
export const mockBacktestResult: BacktestResult = {
  id: 'backtest_' + Date.now(),
  config: mockBacktestConfig,
  metrics: mockBacktestMetrics,
  equity: mockEquityCurve,
  trades: mockBacktestTrades,
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
}

/**
 * Mock 回测进度序列
 */
export const mockBacktestProgressSequence: BacktestRunState[] = [
  { isRunning: true, progress: 0, stage: 'preparing' },
  { isRunning: true, progress: 15, stage: 'loading_data' },
  { isRunning: true, progress: 30, stage: 'loading_data' },
  { isRunning: true, progress: 45, stage: 'running' },
  { isRunning: true, progress: 60, stage: 'running' },
  { isRunning: true, progress: 75, stage: 'running' },
  { isRunning: true, progress: 85, stage: 'analyzing' },
  { isRunning: true, progress: 95, stage: 'analyzing' },
  { isRunning: false, progress: 100, stage: 'completed' },
]

/**
 * Mock 回测历史
 */
export const mockBacktestHistory: BacktestHistoryItem[] = [
  {
    id: 'bt_001',
    name: 'RSI 策略 v1',
    symbol: 'BTC/USDT',
    period: '2024-01-01 - 2024-03-31',
    totalReturn: 15.3,
    status: 'completed',
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'bt_002',
    name: 'MACD 交叉策略',
    symbol: 'ETH/USDT',
    period: '2024-02-01 - 2024-04-30',
    totalReturn: -3.2,
    status: 'completed',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'bt_003',
    name: '网格策略测试',
    symbol: 'BTC/USDT',
    period: '2024-03-01 - 2024-05-31',
    totalReturn: 8.7,
    status: 'completed',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
]

// =============================================================================
// Mock Backtest API Functions (Story 2.2)
// =============================================================================

let mockProgressIndex = 0

/**
 * Mock runBacktest API
 */
export async function mockRunBacktest(
  _config: BacktestConfig
): Promise<{ backtestId: string }> {
  await simulateDelay(1000)
  mockProgressIndex = 0 // Reset progress
  return {
    backtestId: 'backtest_' + Date.now(),
  }
}

/**
 * Mock getBacktestRunStatus API
 */
export async function mockGetBacktestRunStatus(
  _backtestId: string
): Promise<BacktestRunState> {
  await simulateDelay(300)
  const status = mockBacktestProgressSequence[mockProgressIndex] ||
    mockBacktestProgressSequence[mockBacktestProgressSequence.length - 1]
  if (mockProgressIndex < mockBacktestProgressSequence.length - 1) {
    mockProgressIndex++
  }
  return status
}

/**
 * Mock getBacktestFullResult API
 */
export async function mockGetBacktestFullResult(
  _backtestId: string
): Promise<BacktestResult> {
  await simulateDelay(500)
  return {
    ...mockBacktestResult,
    id: _backtestId,
  }
}

/**
 * Mock pauseBacktest API
 */
export async function mockPauseBacktest(
  _backtestId: string
): Promise<{ success: boolean }> {
  await simulateDelay(200)
  return { success: true }
}

/**
 * Mock resumeBacktest API
 */
export async function mockResumeBacktest(
  _backtestId: string
): Promise<{ success: boolean }> {
  await simulateDelay(200)
  return { success: true }
}

/**
 * Mock cancelBacktestRun API
 */
export async function mockCancelBacktestRun(
  _backtestId: string
): Promise<{ success: boolean }> {
  await simulateDelay(200)
  mockProgressIndex = 0
  return { success: true }
}

/**
 * Mock getBacktestHistory API
 */
export async function mockGetBacktestHistory(
  _strategyId: string
): Promise<BacktestHistoryItem[]> {
  await simulateDelay(300)
  return mockBacktestHistory
}

// =============================================================================
// Mock Monitor Data (Story 3.2)
// =============================================================================

/**
 * Mock 策略信息
 */
export const mockStrategyInfo = {
  name: 'BTC 网格策略',
  symbol: 'BTC/USDT',
  status: 'running' as const,
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
}

/**
 * Mock 盈亏数据
 */
export const mockPnLData = {
  daily: 125.50,
  total: 1250.80,
  unrealized: 85.20,
  realized: 1165.60,
}

/**
 * Mock 持仓数据 - 价格基于 2025年12月市场行情
 */
export const mockPositions = [
  {
    symbol: 'BTC',
    amount: 0.05,
    avgPrice: 92000,
    currentPrice: 95500,
    unrealizedPnl: 175,
    unrealizedPnlPercent: 3.80,
  },
  {
    symbol: 'ETH',
    amount: 0.5,
    avgPrice: 3350,
    currentPrice: 3480,
    unrealizedPnl: 65,
    unrealizedPnlPercent: 3.88,
  },
]

/**
 * Mock 交易记录
 */
export const mockTrades = [
  {
    id: 'trade_001',
    timestamp: Date.now() - 1 * 60 * 60 * 1000,
    symbol: 'BTC/USDT',
    side: 'buy' as const,
    price: 95200,
    amount: 0.02,
    fee: 1.90,
    realizedPnl: 0,
  },
  {
    id: 'trade_002',
    timestamp: Date.now() - 3 * 60 * 60 * 1000,
    symbol: 'BTC/USDT',
    side: 'sell' as const,
    price: 95800,
    amount: 0.015,
    fee: 1.44,
    realizedPnl: 12.50,
  },
  {
    id: 'trade_003',
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
    symbol: 'ETH/USDT',
    side: 'buy' as const,
    price: 3450,
    amount: 0.3,
    fee: 1.04,
    realizedPnl: 0,
  },
  {
    id: 'trade_004',
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    symbol: 'BTC/USDT',
    side: 'buy' as const,
    price: 94500,
    amount: 0.025,
    fee: 2.36,
    realizedPnl: 0,
  },
  {
    id: 'trade_005',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    symbol: 'ETH/USDT',
    side: 'sell' as const,
    price: 3520,
    amount: 0.2,
    fee: 0.70,
    realizedPnl: 24.00,
  },
]

/**
 * Mock 性能指标
 */
export const mockMetrics = {
  winRate: 0.65,
  avgHoldTime: '4.2h',
  maxDrawdown: 8.5,
  totalTrades: 28,
  winningTrades: 18,
  losingTrades: 10,
}

// =============================================================================
// Mock Monitor API Functions (Story 3.2)
// =============================================================================

// 模拟策略状态变化
let mockAgentStatus: 'running' | 'paused' | 'stopped' = 'running'

/**
 * Mock getAgentStatus API
 */
export async function mockGetAgentStatus(
  _agentId: string
): Promise<{
  strategy: {
    name: string
    symbol: string
    status: 'running' | 'paused' | 'stopped'
    createdAt: string
    updatedAt?: string
  }
  pnl: typeof mockPnLData
}> {
  await simulateDelay(300)

  // 模拟实时盈亏变化
  const pnlVariation = (Math.random() - 0.5) * 20
  return {
    strategy: {
      ...mockStrategyInfo,
      status: mockAgentStatus,
      updatedAt: new Date().toISOString(),
    },
    pnl: {
      ...mockPnLData,
      daily: mockPnLData.daily + pnlVariation,
      unrealized: mockPnLData.unrealized + pnlVariation * 0.5,
    },
  }
}

/**
 * Mock getAgentPositions API
 */
export async function mockGetAgentPositions(
  _agentId: string
): Promise<typeof mockPositions> {
  await simulateDelay(200)

  // 模拟价格变化
  return mockPositions.map((pos) => {
    const priceChange = (Math.random() - 0.5) * pos.currentPrice * 0.01
    const newPrice = pos.currentPrice + priceChange
    const newPnl = (newPrice - pos.avgPrice) * pos.amount
    const newPnlPercent = ((newPrice - pos.avgPrice) / pos.avgPrice) * 100
    return {
      ...pos,
      currentPrice: newPrice,
      unrealizedPnl: newPnl,
      unrealizedPnlPercent: newPnlPercent,
    }
  })
}

/**
 * Mock getAgentTrades API
 */
export async function mockGetAgentTrades(
  _agentId: string,
  limit = 10
): Promise<typeof mockTrades> {
  await simulateDelay(200)
  return mockTrades.slice(0, limit)
}

/**
 * Mock getAgentMetrics API
 */
export async function mockGetAgentMetrics(
  _agentId: string
): Promise<typeof mockMetrics> {
  await simulateDelay(200)
  return mockMetrics
}

/**
 * Mock pauseAgent API
 */
export async function mockPauseAgent(
  _agentId: string
): Promise<{ success: boolean }> {
  await simulateDelay(500)
  mockAgentStatus = 'paused'
  return { success: true }
}

/**
 * Mock resumeAgent API
 */
export async function mockResumeAgent(
  _agentId: string
): Promise<{ success: boolean }> {
  await simulateDelay(500)
  mockAgentStatus = 'running'
  return { success: true }
}

/**
 * Mock stopAgent API
 */
export async function mockStopAgent(
  _agentId: string
): Promise<{ success: boolean }> {
  await simulateDelay(800)
  mockAgentStatus = 'stopped'
  return { success: true }
}

/**
 * 重置 Mock 状态 (用于测试)
 */
export function resetMockAgentStatus() {
  mockAgentStatus = 'running'
}

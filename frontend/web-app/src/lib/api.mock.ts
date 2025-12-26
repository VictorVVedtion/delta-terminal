/**
 * API Mock Data - 开发和测试用 Mock 数据
 * Story 1.2: 部署 API 接口与 AgentStore 状态管理
 */

import type {
  DeploymentResult,
  DeploymentStatus,
  BacktestSummary,
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
export function simulateDelay(ms: number = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 模拟随机延迟 (用于更真实的体验)
 */
export function simulateRandomDelay(min: number = 500, max: number = 2000): Promise<void> {
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
  const statuses = [
    mockDeploymentStatusPending,
    mockDeploymentStatusInProgress,
    mockDeploymentStatusCompleted,
  ]
  return statuses[Math.floor(Math.random() * statuses.length)]
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

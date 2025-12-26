/**
 * Deployment Types - 策略部署相关类型定义
 * Story 1.2: 部署 API 接口与 AgentStore 状态管理
 */

// =============================================================================
// Deployment Result
// =============================================================================

/**
 * 部署操作结果
 */
export interface DeploymentResult {
  /** 是否成功 */
  success: boolean
  /** Agent ID */
  agentId: string
  /** 部署 ID (用于状态追踪) */
  deploymentId: string
  /** 部署模式 */
  mode: 'paper' | 'live'
  /** 部署时间 ISO 字符串 */
  deployedAt: string
  /** 结果消息 */
  message: string
}

// =============================================================================
// Deployment Status
// =============================================================================

/**
 * 部署状态枚举
 */
export type DeploymentStatusType = 'pending' | 'in_progress' | 'completed' | 'failed'

/**
 * 部署进度状态
 */
export interface DeploymentStatus {
  /** 当前状态 */
  status: DeploymentStatusType
  /** 进度百分比 0-100 */
  progress: number
  /** 当前步骤描述 */
  currentStep: string
  /** 错误信息 (失败时) */
  error?: string | undefined
  /** 开始时间 */
  startedAt?: string | undefined
  /** 完成时间 */
  completedAt?: string | undefined
}

// =============================================================================
// Deployment Config
// =============================================================================

/**
 * Paper 部署配置
 */
export interface PaperDeployConfig {
  /** 虚拟资金 */
  virtualCapital: number
}

/**
 * Live 部署配置
 */
export interface LiveDeployConfig {
  /** 初始资金 */
  initialCapital: number
  /** 确认令牌 (双重确认) */
  confirmationToken: string
}

// =============================================================================
// Backtest & Performance Types
// =============================================================================

/**
 * 回测结果摘要
 * 与 Story 1.1 DeployCanvas 中定义的类型保持一致
 */
export interface BacktestSummary {
  /** 是否通过 */
  passed: boolean
  /** 预期收益率 (%) */
  expectedReturn: number
  /** 最大回撤 (%) */
  maxDrawdown: number
  /** 胜率 (%) */
  winRate: number
  /** 回测 ID */
  backtestId?: string | undefined
  /** 回测完成时间 */
  completedAt?: string | undefined
}

/**
 * Paper 阶段表现
 * 与 Story 1.1 DeployCanvas 中定义的类型保持一致
 */
export interface PaperPerformance {
  /** 已运行天数 */
  runningDays: number
  /** 要求运行天数 (通常为 7) */
  requiredDays: number
  /** 盈亏金额 */
  pnl: number
  /** 盈亏百分比 */
  pnlPercent: number
  /** Paper 开始时间 */
  startedAt?: string | undefined
}

// =============================================================================
// Deployment Error
// =============================================================================

/**
 * 部署错误代码
 */
export type DeploymentErrorCode =
  | 'BACKTEST_NOT_PASSED'      // 回测未通过
  | 'PAPER_TIME_INSUFFICIENT'  // Paper 运行时间不足
  | 'INVALID_TOKEN'            // 无效的确认令牌
  | 'INSUFFICIENT_BALANCE'     // 余额不足
  | 'STRATEGY_NOT_FOUND'       // 策略未找到
  | 'AGENT_ALREADY_DEPLOYED'   // Agent 已部署
  | 'API_ERROR'                // API 错误
  | 'NETWORK_ERROR'            // 网络错误
  | 'UNKNOWN_ERROR'            // 未知错误

/**
 * 部署错误类
 */
export class DeploymentError extends Error {
  /** 错误代码 */
  public readonly code: DeploymentErrorCode
  /** 详细信息 */
  public readonly details?: unknown

  constructor(
    message: string,
    code: DeploymentErrorCode,
    details?: unknown
  ) {
    super(message)
    this.name = 'DeploymentError'
    this.code = code
    this.details = details

    // 确保原型链正确
    Object.setPrototypeOf(this, DeploymentError.prototype)
  }

  /**
   * 创建用户友好的错误消息
   */
  toUserMessage(): string {
    switch (this.code) {
      case 'BACKTEST_NOT_PASSED':
        return '策略回测未通过，无法部署'
      case 'PAPER_TIME_INSUFFICIENT':
        return 'Paper 模式运行时间不足 7 天，无法升级到 Live'
      case 'INVALID_TOKEN':
        return '确认令牌无效，请重新确认'
      case 'INSUFFICIENT_BALANCE':
        return '账户余额不足'
      case 'STRATEGY_NOT_FOUND':
        return '策略不存在'
      case 'AGENT_ALREADY_DEPLOYED':
        return 'Agent 已经在运行中'
      case 'API_ERROR':
        return `服务器错误: ${this.message}`
      case 'NETWORK_ERROR':
        return '网络连接失败，请检查网络'
      default:
        return this.message
    }
  }
}

// =============================================================================
// Agent Deployment State
// =============================================================================

/**
 * Agent 部署状态
 */
export type AgentDeploymentStatus = 'idle' | 'deploying' | 'deployed' | 'failed'

/**
 * Agent 扩展字段 (用于部署)
 */
export interface AgentDeploymentFields {
  /** 部署状态 */
  deploymentStatus?: AgentDeploymentStatus | undefined
  /** 部署时间戳 */
  deployedAt?: number | undefined
  /** 关联的回测 ID */
  backtestId?: string | undefined
  /** Paper 模式的虚拟资金 */
  virtualCapital?: number | undefined
  /** Live 模式的初始资金 */
  initialCapital?: number | undefined
  /** Paper 开始时间 (用于计算运行天数) */
  paperStartedAt?: number | undefined
}

// =============================================================================
// Deployment Actions (for InsightData)
// =============================================================================

/**
 * 部署相关的 Action 类型
 */
export type DeploymentAction = 'deploy_paper' | 'deploy_live'

// =============================================================================
// Type Guards
// =============================================================================

/**
 * 检查是否为 DeploymentError
 */
export function isDeploymentError(error: unknown): error is DeploymentError {
  return error instanceof DeploymentError
}

/**
 * 检查部署结果是否成功
 */
export function isDeploymentSuccess(result: DeploymentResult): boolean {
  return result.success === true
}

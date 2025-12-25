/**
 * Deep Research Mode Type Definitions
 * 基于 PRD S78 - 深度研究模式规范
 *
 * 深度研究模式使用 Claude Opus 模型进行多维度综合分析，
 * 包含技术面分析、链上数据、宏观事件等多个分析步骤。
 */

// =============================================================================
// Research Step Types
// =============================================================================

export type ResearchStepId =
  | 'technical'    // 技术面分析
  | 'onchain'      // 链上数据获取
  | 'macro'        // 宏观事件整理
  | 'sentiment'    // 市场情绪分析
  | 'correlation'  // 相关性分析
  | 'synthesis'    // 综合报告生成

export type ResearchStepStatus =
  | 'pending'      // 待执行
  | 'running'      // 执行中
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'skipped'      // 跳过

export interface ResearchStep {
  id: ResearchStepId
  name: string
  icon: string
  description: string
  status: ResearchStepStatus
  progress: number        // 0-100
  duration?: number | undefined       // 耗时(秒)
  result?: ResearchStepResult | undefined
  error?: string | undefined
}

export interface ResearchStepResult {
  summary: string
  details?: string | undefined
  metrics?: ResearchMetric[] | undefined
  charts?: ResearchChart[] | undefined
  confidence?: number | undefined     // 0-1
}

export interface ResearchMetric {
  key: string
  label: string
  value: number | string
  unit?: string | undefined
  trend?: 'up' | 'down' | 'neutral' | undefined
  significance?: 'high' | 'medium' | 'low' | undefined
}

export interface ResearchChart {
  type: 'line' | 'bar' | 'pie' | 'heatmap'
  title: string
  data: Record<string, unknown>
}

// =============================================================================
// Research Session Types
// =============================================================================

export type ResearchSessionStatus =
  | 'idle'         // 空闲
  | 'planning'     // 规划中
  | 'researching'  // 研究中
  | 'completed'    // 已完成
  | 'failed'       // 失败

export interface ResearchSession {
  id: string
  symbol: string
  query: string           // 用户的研究问题
  status: ResearchSessionStatus
  steps: ResearchStep[]
  currentStepIndex: number
  report?: ResearchReport | undefined
  createdAt: number
  updatedAt: number
  completedAt?: number | undefined
}

export interface ResearchReport {
  id: string
  title: string
  symbol: string
  summary: string
  sections: ResearchSection[]
  recommendation: ResearchRecommendation
  confidence: number      // 0-1
  createdAt: string
}

export interface ResearchSection {
  title: string
  icon: string
  content: string
  metrics?: ResearchMetric[] | undefined
}

export interface ResearchRecommendation {
  action: 'buy' | 'sell' | 'hold' | 'wait'
  strength: 'strong' | 'moderate' | 'weak'
  rationale: string
  timeframe: string
  risks: string[]
}

// =============================================================================
// Research Step Configurations
// =============================================================================

export const RESEARCH_STEP_CONFIGS: Record<ResearchStepId, Omit<ResearchStep, 'status' | 'progress' | 'result' | 'error' | 'duration'>> = {
  technical: {
    id: 'technical',
    name: '技术面分析',
    icon: '📈',
    description: 'K线形态、指标分析、支撑阻力位',
  },
  onchain: {
    id: 'onchain',
    name: '链上数据',
    icon: '⛓️',
    description: '巨鲸动向、资金流向、持仓分布',
  },
  macro: {
    id: 'macro',
    name: '宏观事件',
    icon: '🌍',
    description: '政策动态、经济指标、行业新闻',
  },
  sentiment: {
    id: 'sentiment',
    name: '市场情绪',
    icon: '😊',
    description: '社媒热度、恐慌贪婪指数、舆论分析',
  },
  correlation: {
    id: 'correlation',
    name: '相关性分析',
    icon: '🔗',
    description: '与BTC相关性、板块联动、风险敞口',
  },
  synthesis: {
    id: 'synthesis',
    name: '综合报告',
    icon: '📋',
    description: '多维度综合判断，生成投资建议',
  },
}

// =============================================================================
// Default Research Steps
// =============================================================================

export function createDefaultResearchSteps(): ResearchStep[] {
  const stepOrder: ResearchStepId[] = [
    'technical',
    'onchain',
    'macro',
    'sentiment',
    'correlation',
    'synthesis',
  ]

  return stepOrder.map((id, index) => ({
    ...RESEARCH_STEP_CONFIGS[id],
    status: index === 0 ? 'pending' : 'pending',
    progress: 0,
  }))
}

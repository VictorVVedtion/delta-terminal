/**
 * Agent Store - 交易代理状态管理
 * 基于 PRD S77 Sidebar 布局规范
 * Story 1.2: 扩展部署状态管理
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type { AgentDeploymentStatus, DeploymentStatus } from '@/types/deployment'

// Agent 状态类型
export type AgentStatus = 'live' | 'paper' | 'shadow' | 'paused' | 'stopped'

// 交易代理接口
export interface Agent {
  id: string
  name: string
  symbol: string
  status: AgentStatus
  pnl: number           // 盈亏金额
  pnlPercent: number    // 盈亏百分比
  trades: number        // 交易次数
  winRate: number       // 胜率
  createdAt: number
  updatedAt: number

  // ===== 部署相关字段 (Story 1.2) =====
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

// 风险概览接口
export interface RiskOverview {
  marginRate: number      // 保证金率
  totalExposure: number   // 总敞口
  maxDrawdown: number     // 最大回撤
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

// 盈亏仪表盘接口
export interface PnLDashboard {
  totalPnL: number        // 总盈亏
  totalPnLPercent: number // 总盈亏百分比
  todayPnL: number        // 今日盈亏
  todayPnLPercent: number // 今日盈亏百分比
  weekPnL: number         // 本周盈亏
  monthPnL: number        // 本月盈亏
}

// 历史对话接口
export interface ChatHistory {
  id: string
  title: string
  preview: string
  timestamp: number
  agentId?: string
}

interface AgentState {
  // 数据
  agents: Agent[]
  activeAgentId: string | null
  riskOverview: RiskOverview
  pnlDashboard: PnLDashboard
  chatHistory: ChatHistory[]

  // Actions
  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  setActiveAgent: (id: string | null) => void

  updateRiskOverview: (risk: Partial<RiskOverview>) => void
  updatePnLDashboard: (pnl: Partial<PnLDashboard>) => void

  addChatHistory: (chat: ChatHistory) => void
  removeChatHistory: (id: string) => void
  clearChatHistory: () => void

  // ===== 部署相关 Actions (Story 1.2) =====
  /** 部署 Agent 到 Paper 模式 */
  deployAgentToPaper: (agentId: string, virtualCapital: number) => void
  /** 部署 Agent 到 Live 模式 */
  deployAgentToLive: (agentId: string, initialCapital: number) => void
  /** 更新部署进度 */
  updateDeploymentProgress: (agentId: string, status: DeploymentStatus) => void
  /** 回滚部署 */
  rollbackDeployment: (agentId: string, previousStatus: AgentStatus) => void
  /** 检查是否可以部署到 Paper */
  canDeployToPaper: (agentId: string) => boolean
  /** 检查是否可以部署到 Live */
  canDeployToLive: (agentId: string) => boolean
  /** 获取 Paper 运行天数 */
  getPaperRunningDays: (agentId: string) => number
}

// 默认风险概览 (初始为零，数据将从实际持仓和账户计算)
const defaultRiskOverview: RiskOverview = {
  marginRate: 0,        // 需从交易所账户余额计算
  totalExposure: 0,     // 需从 Agent 持仓汇总
  maxDrawdown: 0,       // 需从 Agent 历史盈亏计算
  riskLevel: 'low',
}

// 默认盈亏仪表盘 (初始为零，数据将从实际 Agent 汇总)
const defaultPnLDashboard: PnLDashboard = {
  totalPnL: 0,
  totalPnLPercent: 0,
  todayPnL: 0,
  todayPnLPercent: 0,
  weekPnL: 0,
  monthPnL: 0,
}

// 初始 Agents 数据 (清空硬编码，从用户批准的策略动态创建)
const initialAgents: Agent[] = []

// 初始历史对话 (清空硬编码)
const initialChatHistory: ChatHistory[] = []

export const useAgentStore = create<AgentState>()(
  devtools((set) => ({
    // 初始状态 (清空硬编码，数据从用户批准的策略动态创建)
    agents: initialAgents,
    activeAgentId: null,
    riskOverview: defaultRiskOverview,
    pnlDashboard: defaultPnLDashboard,
    chatHistory: initialChatHistory,

    // Agent Actions
    setAgents: (agents) =>
      { set({ agents }, false, 'agent/setAgents'); },

    addAgent: (agent) =>
      { set(
        (state) => ({ agents: [...state.agents, agent] }),
        false,
        'agent/addAgent'
      ); },

    updateAgent: (id, updates) =>
      { set(
        (state) => ({
          agents: state.agents.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
          ),
        }),
        false,
        'agent/updateAgent'
      ); },

    removeAgent: (id) =>
      { set(
        (state) => ({
          agents: state.agents.filter((a) => a.id !== id),
          activeAgentId: state.activeAgentId === id ? null : state.activeAgentId,
        }),
        false,
        'agent/removeAgent'
      ); },

    setActiveAgent: (id) =>
      { set({ activeAgentId: id }, false, 'agent/setActiveAgent'); },

    // Risk Actions
    updateRiskOverview: (risk) =>
      { set(
        (state) => ({ riskOverview: { ...state.riskOverview, ...risk } }),
        false,
        'agent/updateRiskOverview'
      ); },

    // PnL Actions
    updatePnLDashboard: (pnl) =>
      { set(
        (state) => ({ pnlDashboard: { ...state.pnlDashboard, ...pnl } }),
        false,
        'agent/updatePnLDashboard'
      ); },

    // Chat History Actions
    addChatHistory: (chat) =>
      { set(
        (state) => ({ chatHistory: [chat, ...state.chatHistory] }),
        false,
        'agent/addChatHistory'
      ); },

    removeChatHistory: (id) =>
      { set(
        (state) => ({ chatHistory: state.chatHistory.filter((c) => c.id !== id) }),
        false,
        'agent/removeChatHistory'
      ); },

    clearChatHistory: () =>
      { set({ chatHistory: [] }, false, 'agent/clearChatHistory'); },

    // ===== 部署相关 Actions (Story 1.2) =====

    deployAgentToPaper: (agentId, virtualCapital) =>
      { set(
        (state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId
              ? {
                  ...a,
                  status: 'paper' as AgentStatus,
                  deploymentStatus: 'deployed' as const,
                  deployedAt: Date.now(),
                  paperStartedAt: Date.now(),
                  virtualCapital,
                  updatedAt: Date.now(),
                }
              : a
          ),
        }),
        false,
        'agent/deployToPaper'
      ); },

    deployAgentToLive: (agentId, initialCapital) =>
      { set(
        (state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId
              ? {
                  ...a,
                  status: 'live' as AgentStatus,
                  deploymentStatus: 'deployed' as const,
                  deployedAt: Date.now(),
                  initialCapital,
                  updatedAt: Date.now(),
                }
              : a
          ),
        }),
        false,
        'agent/deployToLive'
      ); },

    updateDeploymentProgress: (agentId, status) =>
      { set(
        (state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId
              ? {
                  ...a,
                  deploymentStatus:
                    status.status === 'completed'
                      ? ('deployed' as const)
                      : status.status === 'failed'
                      ? ('failed' as const)
                      : ('deploying' as const),
                  updatedAt: Date.now(),
                }
              : a
          ),
        }),
        false,
        'agent/updateDeploymentProgress'
      ); },

    rollbackDeployment: (agentId, previousStatus) =>
      { set(
        (state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId
              ? {
                  ...a,
                  status: previousStatus,
                  deploymentStatus: 'failed' as const,
                  updatedAt: Date.now(),
                }
              : a
          ),
        }),
        false,
        'agent/rollbackDeployment'
      ); },

    canDeployToPaper: (agentId: string): boolean => {
      const { agents } = useAgentStore.getState()
      const agent = agents.find((a: Agent) => a.id === agentId)
      if (!agent) return false
      // 检查是否有回测 ID (表示回测已通过)
      return !!agent.backtestId
    },

    canDeployToLive: (agentId: string): boolean => {
      const { agents, getPaperRunningDays } = useAgentStore.getState()
      const agent = agents.find((a: Agent) => a.id === agentId)
      if (!agent) return false
      // 必须在 Paper 模式
      if (agent.status !== 'paper') return false
      // 检查 Paper 运行时间 >= 7 天
      const runningDays = getPaperRunningDays(agentId)
      return runningDays >= 7
    },

    getPaperRunningDays: (agentId: string): number => {
      const { agents } = useAgentStore.getState()
      const agent = agents.find((a: Agent) => a.id === agentId)
      if (!agent?.paperStartedAt) return 0
      const msPerDay = 24 * 60 * 60 * 1000
      return Math.floor((Date.now() - agent.paperStartedAt) / msPerDay)
    },
  }))
)

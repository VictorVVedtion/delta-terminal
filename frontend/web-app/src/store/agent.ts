/**
 * Agent Store - 交易代理状态管理
 * 基于 PRD S77 Sidebar 布局规范
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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
}

// 默认风险概览
const defaultRiskOverview: RiskOverview = {
  marginRate: 185,
  totalExposure: 4200,
  maxDrawdown: 12.5,
  riskLevel: 'low',
}

// 默认盈亏仪表盘
const defaultPnLDashboard: PnLDashboard = {
  totalPnL: 2340,
  totalPnLPercent: 5.2,
  todayPnL: 120,
  todayPnLPercent: 0.8,
  weekPnL: 580,
  monthPnL: 2340,
}

// Mock Agents 数据
const mockAgents: Agent[] = [
  {
    id: 'agent_1',
    name: 'RSI 反弹',
    symbol: 'BTC/USDT',
    status: 'live',
    pnl: 120,
    pnlPercent: 2.4,
    trades: 15,
    winRate: 73,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
  {
    id: 'agent_2',
    name: '网格交易',
    symbol: 'ETH/USDT',
    status: 'live',
    pnl: -45,
    pnlPercent: -1.2,
    trades: 42,
    winRate: 52,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
  {
    id: 'agent_3',
    name: '突破追踪',
    symbol: 'SOL/USDT',
    status: 'shadow',
    pnl: 89,
    pnlPercent: 3.1,
    trades: 8,
    winRate: 62,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
]

// Mock 历史对话
const mockChatHistory: ChatHistory[] = [
  {
    id: 'chat_1',
    title: 'BTC 策略优化',
    preview: '调整止损参数到 2.5%...',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    agentId: 'agent_1',
  },
  {
    id: 'chat_2',
    title: 'ETH 网格设置',
    preview: '网格间距设为 1%...',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    agentId: 'agent_2',
  },
]

export const useAgentStore = create<AgentState>()(
  devtools((set) => ({
    // 初始状态
    agents: mockAgents,
    activeAgentId: null,
    riskOverview: defaultRiskOverview,
    pnlDashboard: defaultPnLDashboard,
    chatHistory: mockChatHistory,

    // Agent Actions
    setAgents: (agents) =>
      set({ agents }, false, 'agent/setAgents'),

    addAgent: (agent) =>
      set(
        (state) => ({ agents: [...state.agents, agent] }),
        false,
        'agent/addAgent'
      ),

    updateAgent: (id, updates) =>
      set(
        (state) => ({
          agents: state.agents.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
          ),
        }),
        false,
        'agent/updateAgent'
      ),

    removeAgent: (id) =>
      set(
        (state) => ({
          agents: state.agents.filter((a) => a.id !== id),
          activeAgentId: state.activeAgentId === id ? null : state.activeAgentId,
        }),
        false,
        'agent/removeAgent'
      ),

    setActiveAgent: (id) =>
      set({ activeAgentId: id }, false, 'agent/setActiveAgent'),

    // Risk Actions
    updateRiskOverview: (risk) =>
      set(
        (state) => ({ riskOverview: { ...state.riskOverview, ...risk } }),
        false,
        'agent/updateRiskOverview'
      ),

    // PnL Actions
    updatePnLDashboard: (pnl) =>
      set(
        (state) => ({ pnlDashboard: { ...state.pnlDashboard, ...pnl } }),
        false,
        'agent/updatePnLDashboard'
      ),

    // Chat History Actions
    addChatHistory: (chat) =>
      set(
        (state) => ({ chatHistory: [chat, ...state.chatHistory] }),
        false,
        'agent/addChatHistory'
      ),

    removeChatHistory: (id) =>
      set(
        (state) => ({ chatHistory: state.chatHistory.filter((c) => c.id !== id) }),
        false,
        'agent/removeChatHistory'
      ),

    clearChatHistory: () =>
      set({ chatHistory: [] }, false, 'agent/clearChatHistory'),
  }))
)

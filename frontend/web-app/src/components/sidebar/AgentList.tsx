import { AlertTriangle,BarChart3, GitCompare, History, MoreVertical, Plus, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

import { ThinkingIndicator } from '@/components/thinking/ThinkingIndicator'
import { cn } from '@/lib/utils'
import type { Agent, AgentStatus} from '@/store/agent';
import {useAgentStore } from '@/store/agent'
import { useAnalysisStore } from '@/store/analysis'
import type { AttributionInsightData, ComparisonInsightData,SensitivityInsightData } from '@/types/insight'
import type { ThinkingProcess } from '@/types/thinking'

/**
 * Agent 列表组件
 * 基于 PRD S77 Sidebar 规格 - ③ Agent 列表 (自适应高度，最多 5 个可见)
 */

// 状态配置
const STATUS_CONFIG: Record<AgentStatus, { color: string; label: string; dotClass: string }> = {
  live: { color: 'border-l-green-500', label: 'LIVE', dotClass: 'bg-green-500' },
  paper: { color: 'border-l-yellow-500', label: 'PAPER', dotClass: 'bg-yellow-500' },
  shadow: { color: 'border-l-muted-foreground', label: 'Shadow', dotClass: 'bg-muted-foreground border border-muted-foreground' },
  paused: { color: 'border-l-orange-500', label: 'PAUSED', dotClass: 'bg-orange-500' },
  stopped: { color: 'border-l-muted', label: 'STOPPED', dotClass: 'bg-muted' },
}

interface AgentItemProps {
  agent: Agent
  isActive: boolean
  onClick: () => void
  thinkingProcess?: ThinkingProcess // Optional thinking process for Glass Box UI
}

function AgentItem({ agent, isActive, onClick, thinkingProcess }: AgentItemProps) {
  const statusConfig = STATUS_CONFIG[agent.status]
  const isPositive = agent.pnl >= 0
  const isShadow = agent.status === 'shadow'
  const [menuOpen, setMenuOpen] = React.useState(false)

  const {
    openSensitivityAnalysis,
    openAttributionAnalysis,
    openComparisonAnalysis,
    openVersionHistory,
    openEmergencyActions,
  } = useAnalysisStore()

  // 处理菜单项点击
  const handleMenuClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation() // 阻止冒泡，避免触发卡片点击
    setMenuOpen(false)

    // 根据不同的操作类型创建对应的数据
    switch (action) {
      case 'sensitivity':
        // 创建敏感度分析数据
        const sensitivityData: SensitivityInsightData = {
          id: `sensitivity_${agent.id}_${Date.now()}`,
          type: 'sensitivity',
          params: [],
          explanation: `${agent.name} 策略的敏感度分析`,
          created_at: new Date().toISOString(),
          target: {
            strategy_id: agent.id,
            name: agent.name,
            symbol: agent.symbol,
          },
          strategyName: agent.name,
          symbol: agent.symbol,
          sensitivityMatrix: [
            {
              paramKey: 'rsi_threshold',
              paramLabel: 'RSI 阈值',
              impacts: [
                { paramValue: 20, totalReturn: 15, winRate: 52, maxDrawdown: 12, sharpeRatio: 1.3 },
                { paramValue: 30, totalReturn: 22, winRate: 58, maxDrawdown: 10, sharpeRatio: 1.8 },
                { paramValue: 40, totalReturn: 18, winRate: 54, maxDrawdown: 11, sharpeRatio: 1.5 },
              ],
            },
          ],
          keyParameters: [
            {
              paramKey: 'rsi_threshold',
              paramLabel: 'RSI 阈值',
              impactScore: 85,
              sensitivity: 'high',
            },
          ],
          baseline: {
            totalReturn: 22,
            winRate: 58,
            maxDrawdown: 10,
            sharpeRatio: 1.8,
          },
          aiInsight: '参数敏感度分析显示 RSI 阈值对策略表现影响最大',
        }
        openSensitivityAnalysis(sensitivityData)
        break

      case 'attribution':
        // 创建归因分析数据
        const attributionData: AttributionInsightData = {
          id: `attribution_${agent.id}_${Date.now()}`,
          type: 'attribution',
          params: [],
          explanation: `${agent.name} 策略的归因分析`,
          created_at: new Date().toISOString(),
          target: {
            strategy_id: agent.id,
            name: agent.name,
            symbol: agent.symbol,
          },
          strategyName: agent.name,
          symbol: agent.symbol,
          attributionBreakdown: [
            {
              factor: '趋势跟踪',
              contribution: agent.pnl * 0.45,
              contributionPercent: 45,
              color: '#10b981',
              description: '成功捕捉主要趋势带来的收益',
            },
            {
              factor: '均值回归',
              contribution: agent.pnl * 0.30,
              contributionPercent: 30,
              color: '#3b82f6',
              description: '区间震荡中的短线交易收益',
            },
          ],
          timeSeriesAttribution: [],
          totalPnL: agent.pnl,
          period: {
            start: Date.now() - 30 * 24 * 60 * 60 * 1000,
            end: Date.now(),
          },
          aiInsight: '归因分析显示趋势跟踪是主要盈利来源',
        }
        openAttributionAnalysis(attributionData)
        break

      case 'comparison':
        // 创建对比分析数据
        const comparisonData: ComparisonInsightData = {
          id: `comparison_${agent.id}_${Date.now()}`,
          type: 'comparison',
          params: [],
          explanation: `${agent.name} 与其他策略的对比`,
          created_at: new Date().toISOString(),
          target: {
            strategy_id: agent.id,
            name: agent.name,
            symbol: agent.symbol,
          },
          strategies: [
            {
              id: agent.id,
              name: agent.name,
              symbol: agent.symbol,
              color: '#3b82f6',
              metrics: {
                totalReturn: agent.pnlPercent,
                annualizedReturn: agent.pnlPercent * 2,
                winRate: agent.winRate,
                maxDrawdown: -5,
                sharpeRatio: 1.5,
                sortinoRatio: 1.8,
                profitFactor: 2.0,
                totalTrades: 100,
              },
              equityCurve: [],
            },
          ],
          differences: [],
          aiSummary: '策略对比分析完成',
        }
        openComparisonAnalysis(comparisonData)
        break

      case 'version':
        openVersionHistory(agent.id, agent.name)
        break

      case 'emergency':
        openEmergencyActions(agent.id)
        break
    }
  }

  return (
    <div className="relative group">
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'w-full text-left rounded-md p-2.5 mb-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'bg-muted/50 hover:bg-muted transition-colors',
        'border-l-[3px]',
        statusConfig.color,
        isShadow && 'opacity-70',
        isActive && 'ring-1 ring-primary'
      )}
    >
      {/* 头部：名称 + 盈亏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              statusConfig.dotClass
            )}
          />
          <span className="text-[11px] font-semibold truncate">
            {agent.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'text-[11px] font-mono font-medium',
              isShadow
                ? 'text-muted-foreground'
                : isPositive
                  ? 'text-green-500'
                  : 'text-red-500'
            )}
          >
            {isShadow ? (
              `虚拟 ${isPositive ? '+' : ''}$${agent.pnl}`
            ) : (
              `${isPositive ? '+' : ''}$${agent.pnl}`
            )}
          </span>
          {/* 更多菜单按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className={cn(
              'h-5 w-5 rounded flex items-center justify-center',
              'opacity-0 group-hover:opacity-100 hover:bg-background/80 transition-opacity',
              menuOpen && 'opacity-100'
            )}
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 底部：状态 + 交易对 */}
      <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground">
        <span>{statusConfig.label}</span>
        <span>·</span>
        <span>{agent.symbol}</span>
      </div>

      {/* Glass Box: Thinking Indicator (Visible when active and has process) */}
      {isActive && thinkingProcess && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <ThinkingIndicator process={thinkingProcess} compact defaultExpanded={false} />
        </div>
      )}
    </div>

      {/* 下拉菜单 */}
      {menuOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setMenuOpen(false); }}
          />
          {/* 菜单内容 */}
          <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-popover border border-border rounded-lg shadow-lg py-1">
            <button
              onClick={(e) => { handleMenuClick(e, 'sensitivity'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">敏感度分析</span>
            </button>
            <button
              onClick={(e) => { handleMenuClick(e, 'attribution'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
            >
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">归因分析</span>
            </button>
            <button
              onClick={(e) => { handleMenuClick(e, 'comparison'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
            >
              <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">对比分析</span>
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={(e) => { handleMenuClick(e, 'version'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
            >
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">版本历史</span>
            </button>
            <button
              onClick={(e) => { handleMenuClick(e, 'emergency'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors text-orange-600"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs">紧急操作</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function AgentList() {
  const router = useRouter()
  const { agents, activeAgentId, setActiveAgent } = useAgentStore()

  const handleNewAgent = () => {
    // 跳转到 /chat 页面开始新策略对话
    router.push('/chat')
  }

  // MOCK: Generate a fake thinking process for the active agent to demonstrate "Glass Box"
  // In a real app, this would come from a useThinkingStore or agent.thinkingState
  const mockThinkingProcess: ThinkingProcess | undefined = React.useMemo(() => {
    return {
      process_id: 'mock-process-1',
      user_message: 'Analyze BTC/USDT market conditions',
      status: 'thinking',
      todos: [
        { id: '1', description: 'Analyzing market depth', status: 'completed' },
        { id: '2', description: 'Calculating RSI divergence', status: 'in_progress' },
        { id: '3', description: 'Checking risk limits', status: 'pending' },
      ],
      tool_history: [],
      progress: {
        percentage: 33,
        current_step: 'Calculating RSI divergence'
      },
      started_at: Date.now() - 5000, // Started 5 seconds ago
    }
  }, [])

  return (
    <div className="agent-list flex-1 overflow-y-auto p-3">
      {/* 标题 */}
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Agents
      </div>

      {/* Agent 列表 */}
      <div className="space-y-0">
        {agents.map((agent) => {
          const showThinking = agent.id === activeAgentId && mockThinkingProcess
          return (
            <AgentItem
              key={agent.id}
              agent={agent}
              isActive={agent.id === activeAgentId}
              onClick={() => { setActiveAgent(agent.id); }}
              // Only show thinking process for the active agent for demo purposes or if they are 'live'
              {...(showThinking && { thinkingProcess: mockThinkingProcess })}
            />
          )
        })}
      </div>

      {/* 新建按钮 */}
      <button
        onClick={handleNewAgent}
        className={cn(
          'w-full mt-2 p-2.5 rounded-md',
          'border border-dashed border-primary/50',
          'bg-primary/5 hover:bg-primary/10',
          'text-primary text-[11px] font-semibold',
          'flex items-center justify-center gap-1.5',
          'transition-colors'
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        新策略
      </button>
    </div>
  )
}

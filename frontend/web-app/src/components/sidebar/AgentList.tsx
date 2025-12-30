import { AlertTriangle, Archive, ArchiveRestore, BarChart3, Clock, GitCompare, History, MoreVertical, Plus, RefreshCcw, Trash2, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { DeleteConfirmDialog, PermanentDeleteDialog } from '@/components/strategy/DeleteConfirmDialog'
import { ThinkingIndicator } from '@/components/thinking/ThinkingIndicator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Agent, AgentStatus } from '@/store/agent';
import { useAgentStore } from '@/store/agent'
import { useAnalysisStore } from '@/store/analysis'
import { useStrategyLifecycleStore, useStrategyLifecycleHydration } from '@/store/strategyLifecycle'
import type { AttributionInsightData, ComparisonInsightData, SensitivityInsightData } from '@/types/insight'
import type { StrategyWithLifecycle } from '@/types/strategy-lifecycle'
import type { ThinkingProcess } from '@/types/thinking'

/**
 * Agent 列表组件
 * 基于 PRD S77 Sidebar 规格 - ③ Agent 列表 (自适应高度，最多 5 个可见)
 *
 * S12a: 集成策略生命周期管理（活跃/归档/回收站）
 */

// 侧边栏标签页类型
type SidebarTab = 'active' | 'archived' | 'deleted'

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

// =============================================================================
// 归档策略项组件（紧凑版）
// =============================================================================

interface ArchivedStrategyItemProps {
  strategy: StrategyWithLifecycle
  onRestore: () => void
  onDelete: () => void
}

function ArchivedStrategyItem({ strategy, onRestore, onDelete }: ArchivedStrategyItemProps) {
  const isPositive = strategy.performance.pnl >= 0

  return (
    <div className="relative group rounded-md p-2.5 mb-1.5 bg-muted/30 hover:bg-muted/50 transition-colors border-l-[3px] border-l-muted opacity-70 hover:opacity-100">
      {/* 头部：名称 + 归档标签 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <ArchiveRestore className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] font-semibold truncate text-muted-foreground">
            {strategy.name}
          </span>
        </div>
        <span
          className={cn(
            'text-[11px] font-mono font-medium',
            isPositive ? 'text-green-500/70' : 'text-red-500/70'
          )}
        >
          {isPositive ? '+' : ''}${strategy.performance.pnl.toFixed(0)}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onRestore}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        >
          <RefreshCcw className="h-2.5 w-2.5" />
          恢复
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
        >
          <Trash2 className="h-2.5 w-2.5" />
          删除
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// 回收站策略项组件（紧凑版）
// =============================================================================

interface DeletedStrategyItemProps {
  strategy: StrategyWithLifecycle
  remainingDays: number
  onRestore: () => void
  onPermanentDelete: () => void
}

function DeletedStrategyItem({ strategy, remainingDays, onRestore, onPermanentDelete }: DeletedStrategyItemProps) {
  const isUrgent = remainingDays <= 7

  return (
    <div className="relative group rounded-md p-2.5 mb-1.5 bg-destructive/5 hover:bg-destructive/10 transition-colors border-l-[3px] border-l-destructive/50">
      {/* 头部：名称 + 倒计时 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Trash2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] font-semibold truncate">
            {strategy.name}
          </span>
        </div>
        <Badge
          variant={isUrgent ? 'destructive' : 'secondary'}
          className="text-[8px] px-1 py-0 h-4"
        >
          <Clock className="h-2 w-2 mr-0.5" />
          {remainingDays}天
        </Badge>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onRestore}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        >
          <RefreshCcw className="h-2.5 w-2.5" />
          恢复
        </button>
        <button
          onClick={onPermanentDelete}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
        >
          <Trash2 className="h-2.5 w-2.5" />
          永久删除
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// 主组件
// =============================================================================

export function AgentList() {
  const router = useRouter()
  const { agents, activeAgentId, setActiveAgent } = useAgentStore()

  // S12a: 策略生命周期 store
  const hydrated = useStrategyLifecycleHydration()
  const {
    getArchivedStrategies,
    getDeletedStrategies,
    restoreStrategy,
    softDeleteStrategy,
    permanentDeleteStrategy,
    getRemainingDays,
  } = useStrategyLifecycleStore()

  // 当前选中的标签页
  const [currentTab, setCurrentTab] = useState<SidebarTab>('active')

  // 对话框状态
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyWithLifecycle | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false)

  // 获取归档和回收站策略（仅在 hydrated 后）
  const archivedStrategies = hydrated ? getArchivedStrategies() : []
  const deletedStrategies = hydrated ? getDeletedStrategies() : []

  const handleNewAgent = () => {
    // 跳转到 /chat 页面开始新策略对话
    router.push('/chat')
  }

  // 恢复策略
  const handleRestore = (strategy: StrategyWithLifecycle) => {
    const result = restoreStrategy(strategy.id)
    if (result.success) {
      toast.success(`策略 "${strategy.name}" 已恢复`)
      // 如果恢复成功，切换到活跃标签
      setCurrentTab('active')
    } else {
      toast.error(result.error || '恢复失败')
    }
  }

  // 软删除策略（移入回收站）
  const handleSoftDelete = (strategyId: string) => {
    softDeleteStrategy(strategyId)
    setSelectedStrategy(null)
    toast.success('策略已移入回收站')
  }

  // 永久删除策略
  const handlePermanentDelete = (strategyId: string) => {
    permanentDeleteStrategy(strategyId)
    setSelectedStrategy(null)
    toast.success('策略已永久删除')
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
      {/* 标题 + 标签页切换 */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Agents
        </div>

        {/* 标签页切换按钮 */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
          <button
            onClick={() => setCurrentTab('active')}
            className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
              currentTab === 'active'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="活跃策略"
          >
            活跃 ({agents.length})
          </button>
          <button
            onClick={() => setCurrentTab('archived')}
            className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
              currentTab === 'archived'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="已归档"
          >
            <Archive className="h-2.5 w-2.5 inline mr-0.5" />
            {archivedStrategies.length}
          </button>
          <button
            onClick={() => setCurrentTab('deleted')}
            className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
              currentTab === 'deleted'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="回收站"
          >
            <Trash2 className="h-2.5 w-2.5 inline mr-0.5" />
            {deletedStrategies.length}
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="space-y-0">
        {/* 活跃策略 */}
        {currentTab === 'active' && (
          <>
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

            {agents.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <div className="text-[11px]">暂无活跃策略</div>
              </div>
            )}
          </>
        )}

        {/* 归档策略 */}
        {currentTab === 'archived' && (
          <>
            {archivedStrategies.map((strategy) => (
              <ArchivedStrategyItem
                key={strategy.id}
                strategy={strategy}
                onRestore={() => handleRestore(strategy)}
                onDelete={() => {
                  setSelectedStrategy(strategy)
                  setShowDeleteDialog(true)
                }}
              />
            ))}

            {archivedStrategies.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Archive className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <div className="text-[11px]">暂无归档策略</div>
              </div>
            )}
          </>
        )}

        {/* 回收站 */}
        {currentTab === 'deleted' && (
          <>
            {deletedStrategies.map((strategy) => (
              <DeletedStrategyItem
                key={strategy.id}
                strategy={strategy}
                remainingDays={getRemainingDays(strategy.id)}
                onRestore={() => handleRestore(strategy)}
                onPermanentDelete={() => {
                  setSelectedStrategy(strategy)
                  setShowPermanentDeleteDialog(true)
                }}
              />
            ))}

            {deletedStrategies.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Trash2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <div className="text-[11px]">回收站为空</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 新建按钮（仅在活跃标签显示） */}
      {currentTab === 'active' && (
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
      )}

      {/* 删除确认对话框（软删除，移入回收站） */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        strategy={selectedStrategy}
        onConfirmDelete={handleSoftDelete}
      />

      {/* 永久删除确认对话框 */}
      <PermanentDeleteDialog
        open={showPermanentDeleteDialog}
        onOpenChange={setShowPermanentDeleteDialog}
        strategy={selectedStrategy}
        remainingDays={selectedStrategy ? getRemainingDays(selectedStrategy.id) : 0}
        onConfirmPermanentDelete={handlePermanentDelete}
      />
    </div>
  )
}

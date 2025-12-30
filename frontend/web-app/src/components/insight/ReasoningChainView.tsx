'use client'

import {
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GitBranch,
  Lightbulb,
  LineChart,
  MessageSquare,
  Pencil,
  SkipForward,
  Sparkles,
  Target,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type {
  NodeAction,
  ReasoningBranch,
  ReasoningChainViewProps,
  ReasoningEvidence,
  ReasoningNodeStatus,
  ReasoningNodeType,
  ReasoningNodeViewProps,
} from '@/types/reasoning'

// =============================================================================
// Constants
// =============================================================================

const NODE_TYPE_CONFIG: Record<ReasoningNodeType, {
  icon: React.ReactNode
  label: string
  bgColor: string
  borderColor: string
  textColor: string
}> = {
  understanding: {
    icon: <Brain className="h-4 w-4" />,
    label: '理解意图',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-l-blue-500',
    textColor: 'text-blue-500',
  },
  analysis: {
    icon: <LineChart className="h-4 w-4" />,
    label: '市场分析',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-l-cyan-500',
    textColor: 'text-cyan-500',
  },
  decision: {
    icon: <Target className="h-4 w-4" />,
    label: '决策点',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-l-purple-500',
    textColor: 'text-purple-500',
  },
  recommendation: {
    icon: <Lightbulb className="h-4 w-4" />,
    label: '策略推荐',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-l-amber-500',
    textColor: 'text-amber-500',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: '风险提示',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-l-red-500',
    textColor: 'text-red-500',
  },
  branch: {
    icon: <GitBranch className="h-4 w-4" />,
    label: '探索分支',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-l-indigo-500',
    textColor: 'text-indigo-500',
  },
}

const STATUS_CONFIG: Record<ReasoningNodeStatus, {
  label: string
  variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
  icon: React.ReactNode
}> = {
  pending: {
    label: '待确认',
    variant: 'secondary',
    icon: <MessageSquare className="h-3 w-3" />,
  },
  confirmed: {
    label: '已确认',
    variant: 'success',
    icon: <Check className="h-3 w-3" />,
  },
  challenged: {
    label: '质疑中',
    variant: 'warning',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  modified: {
    label: '已修改',
    variant: 'default',
    icon: <Pencil className="h-3 w-3" />,
  },
  skipped: {
    label: '已跳过',
    variant: 'outline',
    icon: <SkipForward className="h-3 w-3" />,
  },
  auto: {
    label: '自动确认',
    variant: 'secondary',
    icon: <Sparkles className="h-3 w-3" />,
  },
}

// =============================================================================
// Sub Components
// =============================================================================

/**
 * ConfidenceBar - 置信度条
 */
function ConfidenceBar({ confidence, size = 'md' }: { confidence: number; size?: 'sm' | 'md' }) {
  const percent = Math.round(confidence * 100)
  const colorClass = confidence >= 0.8
    ? 'bg-green-500'
    : confidence >= 0.6
      ? 'bg-amber-500'
      : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'flex-1 bg-muted rounded-full overflow-hidden',
        size === 'sm' ? 'h-1' : 'h-1.5'
      )}>
        <div
          className={cn('h-full transition-all duration-300', colorClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={cn(
        'text-muted-foreground font-medium',
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      )}>
        {percent}%
      </span>
    </div>
  )
}

/**
 * EvidenceTag - 证据标签
 */
function EvidenceTag({ evidence }: { evidence: ReasoningEvidence }) {
  const significanceColor = {
    high: 'border-green-500/50 bg-green-500/10 text-green-600',
    medium: 'border-amber-500/50 bg-amber-500/10 text-amber-600',
    low: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs',
      significanceColor[evidence.significance]
    )}>
      <span className="font-medium">{evidence.label}:</span>
      <span>{typeof evidence.value === 'object' ? JSON.stringify(evidence.value) : String(evidence.value)}</span>
    </div>
  )
}

/**
 * BranchCard - 分支选项卡
 */
function BranchCard({
  branch,
  onSelect,
}: {
  branch: ReasoningBranch
  onSelect?: () => void
}) {
  const probabilityPercent = Math.round(branch.probability * 100)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 rounded-lg border border-border/50',
        'bg-card/50 hover:bg-muted/50 transition-all',
        'hover:border-primary/30 hover:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary/20'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
            <span className="font-medium text-sm truncate">{branch.label || branch.id || '分支'}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {branch.description}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] flex-shrink-0">
          {probabilityPercent}%
        </Badge>
      </div>
      {branch.trade_offs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {branch.trade_offs.slice(0, 2).map((tradeOff, idx) => (
            <span
              key={idx}
              className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground"
            >
              {tradeOff}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

/**
 * NodeActions - 节点操作按钮组
 */
function NodeActions({
  availableActions,
  onAction,
}: {
  availableActions: NodeAction[]
  onAction?: ((action: NodeAction) => void) | undefined
}) {
  const actionConfig: Record<NodeAction, {
    label: string
    icon: React.ReactNode
    variant: 'default' | 'outline' | 'ghost' | 'destructive'
  }> = {
    confirm: {
      label: '确认',
      icon: <Check className="h-3 w-3" />,
      variant: 'default',
    },
    challenge: {
      label: '质疑',
      icon: <AlertTriangle className="h-3 w-3" />,
      variant: 'outline',
    },
    modify: {
      label: '修改',
      icon: <Pencil className="h-3 w-3" />,
      variant: 'outline',
    },
    expand: {
      label: '展开',
      icon: <ChevronDown className="h-3 w-3" />,
      variant: 'ghost',
    },
    collapse: {
      label: '收起',
      icon: <ChevronUp className="h-3 w-3" />,
      variant: 'ghost',
    },
    branch: {
      label: '探索分支',
      icon: <GitBranch className="h-3 w-3" />,
      variant: 'outline',
    },
    skip: {
      label: '跳过',
      icon: <SkipForward className="h-3 w-3" />,
      variant: 'ghost',
    },
  }

  // Only show confirm, challenge, skip actions in button bar
  const visibleActions = availableActions.filter(a =>
    ['confirm', 'challenge', 'modify', 'skip'].includes(a)
  )

  if (visibleActions.length === 0) return null

  return (
    <div className="flex items-center gap-2 pt-2">
      {visibleActions.map(action => {
        const config = actionConfig[action]
        return (
          <Button
            key={action}
            size="sm"
            variant={config.variant}
            onClick={() => onAction?.(action)}
            className="gap-1"
          >
            {config.icon}
            {config.label}
          </Button>
        )
      })}
    </div>
  )
}

// =============================================================================
// ReasoningNodeView Component
// =============================================================================

/**
 * ReasoningNodeView - 单个推理节点视图
 */
export function ReasoningNodeView({
  node,
  isActive = false,
  onAction,
  onBranchSelect,
  className,
}: ReasoningNodeViewProps) {
  const [isExpanded, setIsExpanded] = React.useState(node.expanded)
  const typeConfig = NODE_TYPE_CONFIG[node.type]
  const statusConfig = STATUS_CONFIG[node.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-200',
          'border-l-4',
          typeConfig.borderColor,
          isActive && 'ring-2 ring-primary/30 shadow-md',
          node.highlight && 'bg-primary/[0.02]',
          className
        )}
      >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-start justify-between gap-3 text-left hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition-colors"
            >
              {/* Left: Icon + Title */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn(
                  'p-2 rounded-lg flex-shrink-0',
                  typeConfig.bgColor
                )}>
                  <span className={typeConfig.textColor}>
                    {typeConfig.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm truncate">
                      {node.title}
                    </h4>
                    <Badge
                      variant={statusConfig.variant}
                      className="text-[10px] gap-0.5 flex-shrink-0"
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn('text-xs', typeConfig.textColor)}>
                      {typeConfig.label}
                    </span>
                    <div className="flex-1 max-w-[120px]">
                      <ConfidenceBar confidence={node.confidence} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Expand/Collapse */}
              <ChevronRight
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 mt-2',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Content */}
            <div
              className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: formatContent(node.content) }}
            />

            {/* Evidence */}
            {node.evidence.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">证据支撑</span>
                <div className="flex flex-wrap gap-2">
                  {node.evidence.map((ev, idx) => (
                    <EvidenceTag key={idx} evidence={ev} />
                  ))}
                </div>
              </div>
            )}

            {/* Branches */}
            {node.branches.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">其他可能</span>
                <div className="grid gap-2">
                  {node.branches.map(branch => (
                    <BranchCard
                      key={branch.id}
                      branch={branch}
                      onSelect={() => onBranchSelect?.(branch.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {node.status === 'pending' && (
              <NodeActions
                availableActions={node.available_actions}
                onAction={onAction ? (action) => onAction(action) : undefined}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
    </motion.div>
  )
}

// =============================================================================
// ReasoningChainView Component
// =============================================================================

/**
 * ReasoningChainView - 推理链完整视图
 *
 * 展示 AI 从理解用户意图到给出推荐的完整思考过程。
 * 用户可以在任意节点进行确认、质疑或探索其他分支。
 */
export function ReasoningChainView({
  chain,
  displayMode = 'collapsed',
  defaultExpanded = false,
  onNodeAction,
  onBranchSelect,
  className,
}: ReasoningChainViewProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded || displayMode === 'expanded')

  const progressPercent = chain.total_count > 0
    ? (chain.confirmed_count / chain.total_count) * 100
    : 0

  const confidencePercent = Math.round(chain.overall_confidence * 100)

  // Filter nodes based on display mode
  const visibleNodes = displayMode === 'highlight_only'
    ? chain.nodes.filter(n => n.highlight)
    : chain.nodes

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-lg border',
              'bg-card/50 hover:bg-muted/50 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              chain.status === 'in_progress' && 'border-primary/30 bg-primary/5'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">AI 推理过程</h3>
                <p className="text-xs text-muted-foreground">
                  {chain.confirmed_count}/{chain.total_count} 步已确认
                  {' · '}
                  置信度 {confidencePercent}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Progress */}
              <div className="hidden sm:flex items-center gap-2 w-32">
                <Progress value={progressPercent} className="h-1.5" />
                <span className="text-xs text-muted-foreground w-8">
                  {Math.round(progressPercent)}%
                </span>
              </div>

              {/* Toggle */}
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {/* User Input Context */}
          <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">您说：</span>
                <p className="text-sm mt-0.5">「{chain.user_input}」</p>
              </div>
            </div>
          </div>

          {/* Nodes */}
          <div className="mt-3 space-y-3">
            <AnimatePresence mode="popLayout">
              {visibleNodes.map((node, index) => (
                <div key={node.id} className="relative">
                  {/* Connector Line */}
                  {index > 0 && (
                    <div className="absolute left-6 -top-3 w-px h-3 bg-border" />
                  )}
                  <ReasoningNodeView
                    node={node}
                    isActive={node.id === chain.active_node_id}
                    onAction={(action, input) => onNodeAction?.(node.id, action, input)}
                    onBranchSelect={(branchId) => onBranchSelect?.(node.id, branchId)}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>

          {/* Footer: Overall Confidence */}
          <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">整体置信度</span>
              </div>
              <div className="w-40">
                <ConfidenceBar confidence={chain.overall_confidence} />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * 格式化内容 - 处理 Markdown 样式
 */
function formatContent(content: string): string {
  // Simple markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/• /g, '<span class="text-muted-foreground">•</span> ')
}

// =============================================================================
// Exports
// =============================================================================

export default ReasoningChainView

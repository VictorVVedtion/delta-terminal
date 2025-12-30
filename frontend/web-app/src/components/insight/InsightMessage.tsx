'use client'

import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import React from 'react'

import { cn } from '@/lib/utils'
import type {
  ClarificationAnswer,
  ClarificationInsight,
  InsightCardStatus,
  InsightData,
  InsightParam
} from '@/types/insight';
import {
  isClarificationInsight,
  isSensitivityInsight,
  isAttributionInsight,
  isComparisonInsight,
} from '@/types/insight'
import type { NodeAction } from '@/types/reasoning'

import { ClarificationCard } from './ClarificationCard'
import { InsightCard } from './InsightCard'
import { ReasoningChainView } from './ReasoningChainView'
import { SensitivityInsightCard } from './SensitivityInsightCard'
import { AttributionInsightCard } from './AttributionInsightCard'
import { ComparisonInsightCard } from './ComparisonInsightCard'
import { PaperTradingInsightCard, isPaperTradingInsight } from './PaperTradingInsightCard'

// =============================================================================
// Types
// =============================================================================

interface InsightMessageProps {
  /** The InsightData from AI response */
  insight: InsightData
  /** Status of the insight card */
  status?: InsightCardStatus | undefined
  /** Timestamp of the message */
  timestamp?: number | undefined
  /** Called when user wants to expand to Canvas */
  onExpand?: ((insight: InsightData) => void) | undefined
  /** Called when user approves the insight */
  onApprove?: ((insight: InsightData, params: InsightParam[]) => void) | undefined
  /** Called when user rejects the insight */
  onReject?: ((insight: InsightData) => void) | undefined
  /** Called when user answers a clarification question (EPIC-010) */
  onClarificationAnswer?: ((insight: ClarificationInsight, answer: ClarificationAnswer) => void) | undefined
  /** Called when user interacts with reasoning chain node (A2UI 2.0) */
  onReasoningNodeAction?: ((insight: InsightData, nodeId: string, action: NodeAction, input?: string) => void) | undefined
  /** Called when user selects a reasoning branch (A2UI 2.0) */
  onReasoningBranchSelect?: ((insight: InsightData, nodeId: string, branchId: string) => void) | undefined
  /** Whether to show in compact mode */
  compact?: boolean | undefined
  /** Whether to show avatar (default: false, for use within existing message layout) */
  showAvatar?: boolean | undefined
  /** Additional className */
  className?: string | undefined
}

interface MultiInsightMessageProps {
  /** Array of InsightData from AI response */
  insights: InsightData[]
  /** Array of statuses corresponding to each insight */
  statuses?: InsightCardStatus[] | undefined
  /** Called when user wants to expand to Canvas */
  onExpand?: ((insight: InsightData, index: number) => void) | undefined
  /** Called when user approves an insight */
  onApprove?: ((insight: InsightData, params: InsightParam[], index: number) => void) | undefined
  /** Called when user rejects an insight */
  onReject?: ((insight: InsightData, index: number) => void) | undefined
  /** Whether to show in compact mode */
  compact?: boolean | undefined
  /** Additional className */
  className?: string | undefined
}

// =============================================================================
// InsightMessage Component (Single Insight)
// =============================================================================

/**
 * InsightMessage - Wraps InsightCard for display in chat interface
 *
 * When used within an existing message layout (with avatar already rendered),
 * set showAvatar=false (default). This component only renders the InsightCard.
 *
 * When used standalone, set showAvatar=true to include the AI avatar.
 */
export function InsightMessage({
  insight,
  status = 'pending',
  timestamp,
  onExpand,
  onApprove,
  onReject,
  onClarificationAnswer,
  onReasoningNodeAction,
  onReasoningBranchSelect,
  compact = false,
  showAvatar = false,
  className,
}: InsightMessageProps) {
  const handleExpand = React.useCallback(() => {
    onExpand?.(insight)
  }, [insight, onExpand])

  const handleApprove = React.useCallback((params: InsightParam[]) => {
    onApprove?.(insight, params)
  }, [insight, onApprove])

  const handleReject = React.useCallback(() => {
    onReject?.(insight)
  }, [insight, onReject])

  const handleClarificationAnswer = React.useCallback((answer: ClarificationAnswer) => {
    if (isClarificationInsight(insight)) {
      onClarificationAnswer?.(insight, answer)
    }
  }, [insight, onClarificationAnswer])

  const handleReasoningNodeAction = React.useCallback((nodeId: string, action: NodeAction, input?: string) => {
    onReasoningNodeAction?.(insight, nodeId, action, input)
  }, [insight, onReasoningNodeAction])

  const handleReasoningBranchSelect = React.useCallback((nodeId: string, branchId: string) => {
    onReasoningBranchSelect?.(insight, nodeId, branchId)
  }, [insight, onReasoningBranchSelect])

  // Determine clarification status from insight status
  const clarificationStatus: 'pending' | 'answered' | 'skipped' =
    status === 'approved' ? 'answered' :
      status === 'rejected' ? 'skipped' :
        'pending'

  // Check if reasoning chain should be shown
  const hasReasoningChain = insight.reasoning_chain && insight.show_reasoning

  // Render appropriate card based on insight type
  const renderCard = () => {
    // EPIC-010: Clarification questions
    if (isClarificationInsight(insight)) {
      return (
        <ClarificationCard
          insight={insight}
          onAnswer={handleClarificationAnswer}
          status={clarificationStatus}
          compact={compact}
        />
      )
    }

    // EPIC-008: Sensitivity analysis
    if (isSensitivityInsight(insight)) {
      return (
        <SensitivityInsightCard
          data={insight}
          onExpand={handleExpand}
          compact={compact}
        />
      )
    }

    // EPIC-008: Attribution analysis
    if (isAttributionInsight(insight)) {
      return (
        <AttributionInsightCard
          data={insight}
          onExpand={handleExpand}
          compact={compact}
        />
      )
    }

    // EPIC-008: Comparison analysis
    if (isComparisonInsight(insight)) {
      return (
        <ComparisonInsightCard
          data={insight}
          onExpand={handleExpand}
          compact={compact}
        />
      )
    }

    // EPIC-008: Paper Trading
    if (isPaperTradingInsight(insight)) {
      return (
        <PaperTradingInsightCard
          insight={insight}
          onExecuted={(result) => {
            // Mark as approved/rejected based on result
            if (result.success) {
              handleApprove(insight.params)
            } else {
              handleReject()
            }
          }}
          onCancel={handleReject}
        />
      )
    }

    // Default: Standard InsightCard for other types
    return (
      <InsightCard
        insight={insight}
        status={status}
        onExpand={handleExpand}
        onApprove={handleApprove}
        onReject={handleReject}
        compact={compact}
      />
    )
  }

  // Render reasoning chain if available
  const renderReasoningChain = () => {
    if (!hasReasoningChain || !insight.reasoning_chain) return null

    return (
      <ReasoningChainView
        chain={insight.reasoning_chain}
        displayMode={insight.reasoning_display_mode || 'collapsed'}
        onNodeAction={handleReasoningNodeAction}
        onBranchSelect={handleReasoningBranchSelect}
        className="mt-3"
      />
    )
  }

  // Without avatar - just render the card
  if (!showAvatar) {
    return (
      <div className={cn('max-w-lg', className)}>
        {/* Reasoning Chain (A2UI 2.0) - shows above card */}
        {renderReasoningChain()}
        {/* Main Insight Card */}
        {renderCard()}
      </div>
    )
  }

  // With avatar - full message layout
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, filter: 'blur(10px)', y: -20 }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={cn('flex gap-3 relative', className)}
    >
      {/* Beam Connector (Projecting from top) */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 40, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="absolute left-[15px] -top-8 w-[2px] bg-gradient-to-b from-transparent via-cyan-500/50 to-cyan-500/20 z-0 pointer-events-none"
      />

      {/* AI Avatar */}
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center relative z-10">
        <Bot className="h-4 w-4 text-foreground" />
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-2">
        {/* Reasoning Chain (A2UI 2.0) - shows above card */}
        <div className="max-w-lg">
          {renderReasoningChain()}
        </div>

        {/* Card */}
        <div className="max-w-lg relative">
          {/* Connection Line to Avatar */}
          <div className="absolute -left-6 top-4 w-4 h-[2px] bg-gradient-to-r from-muted to-transparent opacity-50" />
          {renderCard()}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// =============================================================================
// MultiInsightMessage Component (Multiple Insights)
// =============================================================================

/**
 * MultiInsightMessage - Renders multiple InsightCards in a chat message
 *
 * Used when an AI response contains multiple insights (e.g., batch adjustments,
 * multiple strategy proposals).
 */
export function MultiInsightMessage({
  insights,
  statuses = [],
  onExpand,
  onApprove,
  onReject,
  compact = false,
  className,
}: MultiInsightMessageProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {insights.map((insight, index) => (
        <InsightMessage
          key={insight.id}
          insight={insight}
          status={statuses[index] || 'pending'}
          onExpand={onExpand ? (i) => { onExpand(i, index); } : undefined}
          onApprove={onApprove ? (i, p) => { onApprove(i, p, index); } : undefined}
          onReject={onReject ? (i) => { onReject(i, index); } : undefined}
          compact={compact}
          showAvatar={false}
        />
      ))}
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default InsightMessage

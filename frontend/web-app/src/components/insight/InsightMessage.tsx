'use client'

import React from 'react'
import { Bot } from 'lucide-react'
import { InsightCard } from './InsightCard'
import { InsightData, InsightParam, InsightCardStatus } from '@/types/insight'
import { cn } from '@/lib/utils'

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

  // Without avatar - just render the InsightCard
  if (!showAvatar) {
    return (
      <div className={cn('max-w-md', className)}>
        <InsightCard
          insight={insight}
          status={status}
          onExpand={handleExpand}
          onApprove={handleApprove}
          onReject={handleReject}
          compact={compact}
        />
      </div>
    )
  }

  // With avatar - full message layout
  return (
    <div className={cn('flex gap-3', className)}>
      {/* AI Avatar */}
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
        <Bot className="h-4 w-4 text-foreground" />
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-2">
        {/* InsightCard */}
        <div className="max-w-md">
          <InsightCard
            insight={insight}
            status={status}
            onExpand={handleExpand}
            onApprove={handleApprove}
            onReject={handleReject}
            compact={compact}
          />
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
    </div>
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
          onExpand={onExpand ? (i) => onExpand(i, index) : undefined}
          onApprove={onApprove ? (i, p) => onApprove(i, p, index) : undefined}
          onReject={onReject ? (i) => onReject(i, index) : undefined}
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

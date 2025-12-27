'use client'

/**
 * ClarificationCard Component
 *
 * EPIC-010 Story 10.2: AI追问卡片
 * 当 AI 需要更多信息来完善策略时显示的交互式追问卡片
 */

import { Check, HelpCircle, MessageCircleQuestion, Sparkles, X } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  ClarificationAnswer,
  ClarificationInsight,
  ClarificationOption,
} from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface ClarificationCardProps {
  /** 追问数据 */
  insight: ClarificationInsight
  /** 回答提交回调 */
  onAnswer: (answer: ClarificationAnswer) => void
  /** 卡片状态 */
  status?: 'pending' | 'answered' | 'skipped'
  /** 紧凑模式 */
  compact?: boolean
  /** 禁用状态 */
  disabled?: boolean
}

// =============================================================================
// Category Icons & Labels
// =============================================================================

const CATEGORY_CONFIG: Record<
  ClarificationInsight['category'],
  { icon: string; label: string; color: string }
> = {
  risk_preference: { icon: '⚖️', label: '风险偏好', color: 'text-orange-500' },
  trading_pair: { icon: '💱', label: '交易对', color: 'text-blue-500' },
  timeframe: { icon: '⏱️', label: '时间周期', color: 'text-purple-500' },
  strategy_type: { icon: '🎯', label: '策略类型', color: 'text-green-500' },
  capital_allocation: { icon: '💰', label: '资金配置', color: 'text-yellow-500' },
  entry_condition: { icon: '📈', label: '入场条件', color: 'text-cyan-500' },
  exit_condition: { icon: '📉', label: '出场条件', color: 'text-pink-500' },
  general: { icon: '💡', label: '一般问题', color: 'text-muted-foreground' },
}

// =============================================================================
// ClarificationCard Component
// =============================================================================

export function ClarificationCard({
  insight,
  onAnswer,
  status = 'pending',
  compact = false,
  disabled = false,
}: ClarificationCardProps) {
  // State
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>([])
  const [customText, setCustomText] = React.useState('')
  const [showCustomInput, setShowCustomInput] = React.useState(false)

  const categoryConfig = CATEGORY_CONFIG[insight.category]
  const isPending = status === 'pending'
  const isSingleSelect = insight.optionType === 'single'

  // Handle option click
  const handleOptionClick = (optionId: string) => {
    if (!isPending || disabled) return

    if (isSingleSelect) {
      setSelectedOptions([optionId])
    } else {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      )
    }
  }

  // Handle submit
  const handleSubmit = () => {
    if (!isPending || disabled) return
    if (selectedOptions.length === 0 && !customText.trim()) return

    const answer: ClarificationAnswer = {
      questionId: insight.id,
      selectedOptions,
      skipped: false,
    }

    const trimmedText = customText.trim()
    if (trimmedText) {
      answer.customText = trimmedText
    }

    onAnswer(answer)
  }

  // Handle skip
  const handleSkip = () => {
    if (!isPending || disabled) return

    onAnswer({
      questionId: insight.id,
      selectedOptions: [],
      skipped: true,
    })
  }

  // Auto-submit for single select without custom input
  React.useEffect(() => {
    if (
      isSingleSelect &&
      selectedOptions.length === 1 &&
      !insight.allowCustomInput &&
      isPending &&
      !disabled
    ) {
      // Small delay for visual feedback
      const timer = setTimeout(() => {
        onAnswer({
          questionId: insight.id,
          selectedOptions,
          skipped: false,
        })
      }, 300)
      return () => { clearTimeout(timer); }
    }
  }, [selectedOptions, isSingleSelect, insight.allowCustomInput, insight.id, isPending, disabled, onAnswer])

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden transition-all duration-300',
        isPending
          ? 'border-primary/50 shadow-lg shadow-primary/5'
          : 'border-border opacity-75',
        compact && 'text-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            'bg-primary/10'
          )}
        >
          <MessageCircleQuestion className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Delta AI 追问</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                'bg-muted',
                categoryConfig.color
              )}
            >
              <span>{categoryConfig.icon}</span>
              <span>{categoryConfig.label}</span>
            </span>
          </div>
        </div>
        {status === 'answered' && (
          <div className="flex items-center gap-1 text-xs text-green-500">
            <Check className="h-3.5 w-3.5" />
            <span>已回答</span>
          </div>
        )}
        {status === 'skipped' && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            <span>已跳过</span>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="px-4 py-4">
        <p className={cn('text-foreground leading-relaxed', compact ? 'text-sm' : 'text-base')}>
          {insight.question}
        </p>

        {/* Context hint */}
        {insight.context && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            <HelpCircle className="inline h-3 w-3 mr-1" />
            {insight.context}
          </p>
        )}
      </div>

      {/* Options */}
      {insight.options.length > 0 && (
        <div className="px-4 pb-4">
          <div
            className={cn(
              'grid gap-2',
              insight.options.length <= 2 ? 'grid-cols-2' : 'grid-cols-1'
            )}
          >
            {insight.options.map((option) => (
              <OptionButton
                key={option.id}
                option={option}
                selected={selectedOptions.includes(option.id)}
                onClick={() => { handleOptionClick(option.id); }}
                disabled={!isPending || disabled}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Input */}
      {insight.allowCustomInput && (
        <div className="px-4 pb-4">
          {!showCustomInput ? (
            <button
              onClick={() => { setShowCustomInput(true); }}
              disabled={!isPending || disabled}
              className={cn(
                'w-full p-3 rounded-lg border border-dashed border-muted-foreground/30',
                'text-sm text-muted-foreground',
                'hover:border-primary/50 hover:text-primary transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {insight.customInputPlaceholder || '或者输入自定义回答...'}
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={customText}
                onChange={(e) => { setCustomText(e.target.value); }}
                placeholder={insight.customInputPlaceholder || '输入您的回答...'}
                disabled={!isPending || disabled}
                className={cn(
                  'w-full p-3 rounded-lg border border-border bg-muted/50',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'resize-none min-h-[80px]',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomText('')
                  }}
                  disabled={!isPending || disabled}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!isPending || disabled || !customText.trim()}
                >
                  提交
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isPending && !isSingleSelect && (
        <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border">
          {insight.skipLabel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={disabled}
              className="text-muted-foreground"
            >
              {insight.skipLabel}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={disabled || (selectedOptions.length === 0 && !customText.trim())}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            确认
          </Button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// OptionButton Component
// =============================================================================

interface OptionButtonProps {
  option: ClarificationOption
  selected: boolean
  onClick: () => void
  disabled: boolean
  compact: boolean
}

function OptionButton({
  option,
  selected,
  onClick,
  disabled,
  compact,
}: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
        selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed',
        compact && 'p-2'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
          'transition-colors mt-0.5',
          selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
        )}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {option.icon && <span className="text-base">{option.icon}</span>}
          <span className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>
            {option.label}
          </span>
          {option.recommended && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary">
              推荐
            </span>
          )}
        </div>
        {option.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
        )}
      </div>
    </button>
  )
}

// =============================================================================
// Export
// =============================================================================

export default ClarificationCard

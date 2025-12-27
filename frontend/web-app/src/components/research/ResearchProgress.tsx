'use client'

import { Check, ChevronDown, ChevronUp,Clock, Loader2, X } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ResearchStep, ResearchStepStatus } from '@/types/research'

/**
 * ResearchProgress - 研究进度组件
 * 基于 PRD S78 - 显示多步骤分析进度
 */

interface ResearchProgressProps {
  steps: ResearchStep[]
  currentStepIndex: number
  overallProgress: number
  className?: string
  compact?: boolean
}

// Step status icon
function StepStatusIcon({ status }: { status: ResearchStepStatus }) {
  switch (status) {
    case 'completed':
      return (
        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-3 h-3 text-green-500" />
        </div>
      )
    case 'running':
      return (
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        </div>
      )
    case 'failed':
      return (
        <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
          <X className="w-3 h-3 text-destructive" />
        </div>
      )
    case 'skipped':
      return (
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">-</span>
        </div>
      )
    default:
      return (
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
          <Clock className="w-3 h-3 text-muted-foreground" />
        </div>
      )
  }
}

// Single step item
function StepItem({
  step,
  isActive,
  isLast,
}: {
  step: ResearchStep
  isActive: boolean
  isLast: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const hasResult = step.status === 'completed' && step.result

  return (
    <div className="relative">
      {/* Connection line */}
      {!isLast && (
        <div
          className={cn(
            'absolute left-[9px] top-6 w-0.5 h-full -bottom-2',
            step.status === 'completed' ? 'bg-green-500/50' : 'bg-muted'
          )}
        />
      )}

      <div className="flex items-start gap-3">
        <StepStatusIcon status={step.status} />

        <div className="flex-1 min-w-0 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">{step.icon}</span>
            <span
              className={cn(
                'text-sm font-medium',
                isActive && 'text-primary',
                step.status === 'completed' && 'text-green-500',
                step.status === 'failed' && 'text-destructive'
              )}
            >
              {step.name}
            </span>

            {/* Progress percentage for running step */}
            {step.status === 'running' && (
              <span className="text-xs text-muted-foreground">
                {step.progress}%
              </span>
            )}

            {/* Duration for completed step */}
            {step.status === 'completed' && step.duration && (
              <span className="text-xs text-muted-foreground">
                {step.duration}s
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mt-0.5">
            {step.description}
          </p>

          {/* Progress bar for running step */}
          {step.status === 'running' && (
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${step.progress}%` }}
              />
            </div>
          )}

          {/* Result preview for completed step */}
          {hasResult && step.result && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs mt-1"
                >
                  {isOpen ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      收起结果
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      查看结果
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                  <p className="text-foreground">{step.result.summary}</p>
                  {step.result.confidence !== undefined && (
                    <p className="text-muted-foreground">
                      置信度: {Math.round(step.result.confidence * 100)}%
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Error message */}
          {step.status === 'failed' && step.error && (
            <p className="text-xs text-destructive mt-1">{step.error}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function ResearchProgress({
  steps,
  currentStepIndex,
  overallProgress,
  className,
  compact = false,
}: ResearchProgressProps) {
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const currentStep = steps[currentStepIndex]

  if (compact) {
    // Compact mode: single line with progress bar
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {currentStep && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-primary">{currentStep.icon}</span>
                <span>{currentStep.name}</span>
              </>
            )}
          </div>
          <span className="text-muted-foreground">
            {completedCount}/{steps.length}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔬</span>
          <span className="text-sm font-medium">深度研究</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {completedCount}/{steps.length} 步骤
          </span>
          <span className="text-xs font-medium text-primary">
            {overallProgress}%
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Steps list */}
      <div className="mt-4">
        {steps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            isActive={index === currentStepIndex}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

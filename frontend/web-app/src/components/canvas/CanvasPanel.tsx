'use client'

import React from 'react'
import { X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Canvas } from './Canvas'
import { InsightData, InsightParam, CanvasMode } from '@/types/insight'
import { cn } from '@/lib/utils'

// =============================================================================
// CanvasPanel Props
// =============================================================================

interface CanvasPanelProps {
  /** The InsightData to display */
  insight: InsightData | null
  /** Whether the panel is open */
  isOpen: boolean
  /** Current canvas mode */
  mode?: CanvasMode | undefined
  /** Called when panel should close */
  onClose?: (() => void) | undefined
  /** Called when user approves the insight */
  onApprove?: ((insight: InsightData, params: InsightParam[]) => void) | undefined
  /** Called when user rejects the insight */
  onReject?: ((insight: InsightData) => void) | undefined
  /** Whether the panel is loading */
  isLoading?: boolean | undefined
}

// =============================================================================
// CanvasPanel Component - ChatGPT-style sliding sidebar
// =============================================================================

export function CanvasPanel({
  insight,
  isOpen,
  mode = 'proposal',
  onClose,
  onApprove,
  onReject,
  isLoading = false,
}: CanvasPanelProps) {
  // Track edited params
  const [editedParams, setEditedParams] = React.useState<InsightParam[]>([])

  // Reset edited params when insight changes
  React.useEffect(() => {
    if (insight) {
      setEditedParams(insight.params)
    }
  }, [insight])

  // Handle approve with edited params
  const handleApprove = React.useCallback((params: InsightParam[]) => {
    if (insight) {
      onApprove?.(insight, params)
    }
  }, [insight, onApprove])

  // Handle reject
  const handleReject = React.useCallback(() => {
    if (insight) {
      onReject?.(insight)
    }
  }, [insight, onReject])

  // Handle param changes
  const handleParamsChange = React.useCallback((params: InsightParam[]) => {
    setEditedParams(params)
  }, [])

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!insight) {
    return null
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-40 h-full w-full sm:w-[480px]',
          'bg-card border-l border-border shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Strategy configuration"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">策略配置</h2>
              <p className="text-xs text-muted-foreground">
                调整参数并确认执行
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <Canvas
            insight={insight}
            mode={mode}
            onClose={onClose}
            onApprove={handleApprove}
            onReject={handleReject}
            onParamsChange={handleParamsChange}
            isLoading={isLoading}
            variant="embedded"
          />
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isLoading}
            className="flex-1"
          >
            拒绝
          </Button>
          <Button
            onClick={() => handleApprove(editedParams)}
            disabled={isLoading}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                处理中...
              </span>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                批准执行
              </>
            )}
          </Button>
        </footer>
      </aside>
    </>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default CanvasPanel

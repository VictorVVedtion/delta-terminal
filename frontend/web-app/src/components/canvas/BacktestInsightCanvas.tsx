'use client'

/**
 * BacktestInsightCanvas - A2UI Canvas Component for Backtest Results
 *
 * Renders BacktestInsightData as an interactive canvas with:
 * - K-line chart with buy/sell signals
 * - Equity curve
 * - Statistics cards
 * - Parameter adjustment panel
 * - AI summary and suggestions
 */

import {
  ChevronDown,
  ChevronUp,
  Download,
  LineChart,
  Maximize2,
  MessageSquare,
  Minimize2,
  Settings,
  Share2,
  TrendingUp,
  X,
} from 'lucide-react'
import React from 'react'

import { BacktestEquityCurve } from '@/components/backtest/BacktestEquityCurve'
import { BacktestKlineChart } from '@/components/backtest/BacktestKlineChart'
import { BacktestParamPanel, CompactParamDisplay } from '@/components/backtest/BacktestParamPanel'
import { BacktestStatsCard } from '@/components/backtest/BacktestStatsCard'
import { InsightEmptyState } from '@/components/insight/InsightEmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { safeNumber, safePercentChange, formatSafePercent } from '@/lib/safe-number'
import { cn } from '@/lib/utils'
import type { BacktestInsightData, BacktestParameter } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface BacktestInsightCanvasProps {
  insight: BacktestInsightData
  isOpen: boolean
  onClose: () => void
  onParameterChange?: (key: string, value: number | string | boolean) => void
  onRerun?: (parameters: BacktestParameter[]) => void
  className?: string
}

type TabType = 'chart' | 'equity' | 'params'

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(timestamp: number | undefined): string {
  const safeTimestamp = safeNumber(timestamp, Date.now())
  return new Date(safeTimestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatPercent(value: number | undefined): string {
  return formatSafePercent(value, 2, true)
}

// =============================================================================
// Component
// =============================================================================

export function BacktestInsightCanvas({
  insight,
  isOpen,
  onClose,
  onParameterChange,
  onRerun,
  className,
}: BacktestInsightCanvasProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>('chart')
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [showSummary, setShowSummary] = React.useState(true)
  const [parameters, setParameters] = React.useState(insight.strategy.parameters)
  const [isRunning, setIsRunning] = React.useState(false)

  // ========== 数据完整性检查 ==========
  // 检查是否有图表数据
  const hasChartData = insight.chartData && insight.chartData.length > 0
  const hasEquityCurve = insight.equityCurve && insight.equityCurve.length > 0
  const hasStats = insight.stats && insight.stats.initialCapital !== undefined

  // Handle parameter change
  const handleParamChange = React.useCallback(
    (key: string, value: number | string | boolean) => {
      setParameters((prev) =>
        prev.map((p) => (p.key === key ? { ...p, value } : p))
      )
      onParameterChange?.(key, value)
    },
    [onParameterChange]
  )

  // Handle reset parameters
  const handleReset = React.useCallback(() => {
    setParameters((prev) =>
      prev.map((p) => ({ ...p, value: p.defaultValue }))
    )
  }, [])

  // Handle rerun backtest
  const handleRerun = React.useCallback(async () => {
    setIsRunning(true)
    try {
      await onRerun?.(parameters)
    } finally {
      setIsRunning(false)
    }
  }, [parameters, onRerun])

  // Calculate period display
  const periodDisplay = React.useMemo(() => {
    return `${formatDate(insight.period.start)} - ${formatDate(insight.period.end)}`
  }, [insight.period])

  // Total return for header (使用安全计算)
  const totalReturn = React.useMemo(() => {
    const initial = safeNumber(insight.stats?.initialCapital, 0)
    const final = safeNumber(insight.stats?.finalCapital, 0)
    return safePercentChange(final, initial, false)
  }, [insight.stats])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl',
        'flex flex-col transition-all duration-300 ease-out z-50',
        isExpanded ? 'w-full lg:w-[80%]' : 'w-full max-w-[520px] lg:w-[520px]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <LineChart className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-100 truncate max-w-[200px]">
              {insight.strategy.name} 回测结果
            </h2>
            <p className="text-xs text-zinc-400">{periodDisplay}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Return Badge */}
          <Badge
            variant={totalReturn >= 0 ? 'success' : 'destructive'}
            className="mr-2"
          >
            {formatPercent(totalReturn)}
          </Badge>

          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setIsExpanded(!isExpanded); }}
            className="h-8 w-8"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Strategy Info */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-200">
            {insight.strategy.name}
          </span>
          <Badge variant="outline" className="text-xs">
            {insight.strategy.symbol}
          </Badge>
        </div>
        <CompactParamDisplay
          parameters={parameters.slice(0, 4)}
          className="mb-2"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {[
          { id: 'chart' as TabType, label: 'K线图', icon: TrendingUp },
          { id: 'equity' as TabType, label: '权益曲线', icon: LineChart },
          { id: 'params' as TabType, label: '参数', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3',
              'text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Statistics (always visible) */}
        <div className="p-4 border-b border-zinc-800">
          <BacktestStatsCard stats={insight.stats} mode="compact" />
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'chart' && (
            <div className="space-y-4">
              {hasChartData ? (
                <BacktestKlineChart
                  data={insight.chartData}
                  height={isExpanded ? 450 : 300}
                  showVolume
                />
              ) : (
                <InsightEmptyState
                  reason="no-chart-data"
                  compact
                  onRetry={handleRerun}
                />
              )}
            </div>
          )}

          {activeTab === 'equity' && (
            <div className="space-y-4">
              {hasEquityCurve ? (
                <BacktestEquityCurve
                  data={insight.equityCurve}
                  benchmark={insight.benchmark?.equityCurve}
                  initialCapital={safeNumber(insight.stats?.initialCapital, 10000)}
                  height={isExpanded ? 450 : 300}
                  showDrawdown
                  showDailyPnL
                  showBenchmark={!!insight.benchmark}
                />
              ) : (
                <InsightEmptyState
                  reason="no-chart-data"
                  compact
                  onRetry={handleRerun}
                  title="暂无权益曲线数据"
                />
              )}
            </div>
          )}

          {activeTab === 'params' && (
            <BacktestParamPanel
              parameters={parameters}
              onChange={handleParamChange}
              onReset={handleReset}
              onRerun={handleRerun}
              isRunning={isRunning}
              grouped
            />
          )}
        </div>

        {/* Full Stats (when expanded) */}
        {isExpanded && activeTab !== 'params' && (
          <div className="p-4 border-t border-zinc-800">
            <BacktestStatsCard stats={insight.stats} mode="full" />
          </div>
        )}

        {/* AI Summary */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => { setShowSummary(!showSummary); }}
            className="w-full flex items-center justify-between mb-2"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-zinc-200">AI 分析总结</span>
            </div>
            {showSummary ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </button>

          {showSummary && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300 leading-relaxed">
                {insight.aiSummary}
              </p>

              {insight.suggestions && insight.suggestions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    优化建议
                  </span>
                  <ul className="space-y-1">
                    {insight.suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-zinc-400"
                      >
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            分享
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
        </div>
        <Button onClick={onClose} variant="secondary" size="sm">
          关闭
        </Button>
      </div>
    </div>
  )
}

export default BacktestInsightCanvas

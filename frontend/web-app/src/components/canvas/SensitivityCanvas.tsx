'use client'

/**
 * SensitivityCanvas Component
 *
 * EPIC-008 Story 8.1: 参数敏感度分析面板
 * 通过热力图和条形图展示参数对策略性能的影响程度
 */

import React from 'react'
import {
  Activity,
  X,
  TrendingUp,
  Target,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SensitivityInsightData, KeyParameter } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface SensitivityCanvasProps {
  /** 敏感度分析数据 */
  data: SensitivityInsightData
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
}

// =============================================================================
// Constants
// =============================================================================

const METRIC_LABELS: Record<string, string> = {
  totalReturn: '收益率',
  winRate: '胜率',
  maxDrawdown: '回撤',
  sharpeRatio: '夏普',
}

const SENSITIVITY_CONFIG = {
  high: { label: '高敏感', color: 'text-red-500', bg: 'bg-red-500' },
  medium: { label: '中敏感', color: 'text-yellow-500', bg: 'bg-yellow-500' },
  low: { label: '低敏感', color: 'text-green-500', bg: 'bg-green-500' },
} as const

// =============================================================================
// HeatmapCell Component
// =============================================================================

interface HeatmapCellProps {
  value: number
  isSelected: boolean
  onClick: () => void
}

function HeatmapCell({ value, isSelected, onClick }: HeatmapCellProps) {
  // 根据值确定颜色 (-1 到 1 的范围)
  const normalizedValue = Math.max(-1, Math.min(1, value))
  const getColor = () => {
    if (normalizedValue > 0.3) return 'bg-green-500'
    if (normalizedValue > 0.1) return 'bg-green-400'
    if (normalizedValue > -0.1) return 'bg-gray-400'
    if (normalizedValue > -0.3) return 'bg-red-400'
    return 'bg-red-500'
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-10 h-10 rounded transition-all',
        getColor(),
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      title={`${(normalizedValue * 100).toFixed(1)}%`}
    />
  )
}

// =============================================================================
// KeyParamBar Component
// =============================================================================

interface KeyParamBarProps {
  param: KeyParameter
  rank: number
}

function KeyParamBar({ param, rank }: KeyParamBarProps) {
  const config = SENSITIVITY_CONFIG[param.sensitivity]

  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-sm text-muted-foreground">{rank}.</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{param.paramLabel}</span>
          <Badge variant="outline" className={cn('text-xs', config.color)}>
            {config.label}
          </Badge>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full transition-all', config.bg)}
            style={{ width: `${param.impactScore}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          影响分数: {param.impactScore}
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// SensitivityCanvas Component
// =============================================================================

export function SensitivityCanvas({
  data,
  isOpen,
  onClose,
}: SensitivityCanvasProps) {
  const [selectedCell, setSelectedCell] = React.useState<{
    paramKey: string
    metric: string
  } | null>(null)

  if (!isOpen) return null

  const metrics = ['totalReturn', 'winRate', 'maxDrawdown', 'sharpeRatio']

  // 计算热力图数据
  const getHeatmapValue = (paramKey: string, metric: string): number => {
    const matrixItem = data.sensitivityMatrix.find(m => m.paramKey === paramKey)
    if (!matrixItem || matrixItem.impacts.length === 0) return 0

    // 计算该参数对指标的影响范围
    const values = matrixItem.impacts.map(
      impact => impact[metric as keyof typeof impact] as number
    )
    const baseline = data.baseline[metric as keyof typeof data.baseline]
    const maxChange = Math.max(...values.map(v => Math.abs(v - baseline)))
    const avgChange = values.reduce((sum, v) => sum + (v - baseline), 0) / values.length

    return avgChange / (maxChange || 1)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Canvas */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-2xl z-50',
          'bg-background border-l border-border shadow-xl',
          'animate-in slide-in-from-right duration-300',
          'flex flex-col'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              敏感度分析
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.strategyName} · {data.symbol}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 参数影响热力图 */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              参数影响热力图
            </h3>

            <div className="overflow-x-auto">
              <div className="min-w-fit">
                {/* Header Row */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-24" />
                  {data.sensitivityMatrix.map(item => (
                    <div
                      key={item.paramKey}
                      className="w-10 text-center text-xs text-muted-foreground truncate"
                      title={item.paramLabel}
                    >
                      {item.paramLabel.slice(0, 4)}
                    </div>
                  ))}
                </div>

                {/* Metric Rows */}
                {metrics.map(metric => (
                  <div key={metric} className="flex items-center gap-2 mb-2">
                    <div className="w-24 text-sm text-muted-foreground">
                      {METRIC_LABELS[metric]}
                    </div>
                    {data.sensitivityMatrix.map(item => (
                      <HeatmapCell
                        key={`${metric}-${item.paramKey}`}
                        value={getHeatmapValue(item.paramKey, metric)}
                        isSelected={
                          selectedCell?.paramKey === item.paramKey &&
                          selectedCell?.metric === metric
                        }
                        onClick={() =>
                          setSelectedCell({ paramKey: item.paramKey, metric })
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>正向影响</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-400" />
                <span>中性</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>负向影响</span>
              </div>
            </div>
          </div>

          {/* 关键参数识别 */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              关键参数识别
            </h3>

            <div className="space-y-4">
              {data.keyParameters.map((param, index) => (
                <KeyParamBar
                  key={param.paramKey}
                  param={param}
                  rank={index + 1}
                />
              ))}
            </div>
          </div>

          {/* 基准性能 */}
          <div className="space-y-3">
            <h3 className="font-medium">基准性能 (未调参)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">收益率</p>
                <p className="font-mono font-medium">
                  {data.baseline.totalReturn >= 0 ? '+' : ''}
                  {data.baseline.totalReturn.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">胜率</p>
                <p className="font-mono font-medium">
                  {data.baseline.winRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">最大回撤</p>
                <p className="font-mono font-medium text-red-500">
                  {data.baseline.maxDrawdown.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">夏普比率</p>
                <p className="font-mono font-medium">
                  {data.baseline.sharpeRatio.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* AI 洞察 */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">AI 洞察</p>
                <p className="text-sm text-muted-foreground">{data.aiInsight}</p>
              </div>
            </div>
          </div>

          {/* 选中参数详细分析 */}
          {selectedCell && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  详细分析
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCell(null)}
                >
                  关闭
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                参数: {data.sensitivityMatrix.find(m => m.paramKey === selectedCell.paramKey)?.paramLabel}
                <br />
                指标: {METRIC_LABELS[selectedCell.metric]}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                点击热力图格子查看参数对指标的详细影响曲线
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button className="w-full" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </>
  )
}

export default SensitivityCanvas

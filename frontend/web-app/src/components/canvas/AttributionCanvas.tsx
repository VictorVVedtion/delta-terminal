'use client'

/**
 * AttributionCanvas Component
 *
 * EPIC-008 Story 8.2: 盈亏归因分析面板
 * 分解策略盈亏来源并展示各因子贡献度
 */

import {
  AlertTriangle,
  Calendar,
  PieChart,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AttributionBreakdownItem,AttributionInsightData } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface AttributionCanvasProps {
  /** 归因分析数据 */
  data: AttributionInsightData
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
}

// =============================================================================
// AttributionBar Component
// =============================================================================

interface AttributionBarProps {
  item: AttributionBreakdownItem
  maxAbsValue: number
}

function AttributionBar({ item, maxAbsValue }: AttributionBarProps) {
  const isPositive = item.contribution >= 0
  const widthPercent = Math.abs(item.contribution) / maxAbsValue * 50

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.factor}</span>
        </div>
        <span
          className={cn(
            'font-mono font-medium',
            isPositive ? 'text-green-500' : 'text-red-500'
          )}
        >
          {isPositive ? '+' : ''}${item.contribution.toLocaleString()}
          <span className="text-xs text-muted-foreground ml-1">
            ({item.contributionPercent >= 0 ? '+' : ''}{item.contributionPercent.toFixed(1)}%)
          </span>
        </span>
      </div>

      {/* Bar Visualization */}
      <div className="relative h-4 flex items-center">
        {/* Center line */}
        <div className="absolute left-1/2 w-px h-full bg-border" />

        {/* Bar */}
        <div
          className={cn(
            'absolute h-3 rounded',
            isPositive ? 'left-1/2' : 'right-1/2'
          )}
          style={{
            width: `${widthPercent}%`,
            backgroundColor: item.color,
            [isPositive ? 'marginLeft' : 'marginRight']: '2px',
          }}
        />
      </div>

      {item.description && (
        <p className="text-xs text-muted-foreground">{item.description}</p>
      )}
    </div>
  )
}

// =============================================================================
// SimplePieChart Component
// =============================================================================

interface SimplePieChartProps {
  data: AttributionBreakdownItem[]
  size?: number
}

function SimplePieChart({ data, size = 160 }: SimplePieChartProps) {
  // 只显示正向贡献
  const positiveData = data.filter(d => d.contribution > 0)
  const total = positiveData.reduce((sum, d) => sum + d.contribution, 0)

  let currentAngle = 0
  const segments = positiveData.map(item => {
    const angle = (item.contribution / total) * 360
    const segment = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    }
    currentAngle += angle
    return segment
  })

  const center = size / 2
  const radius = size / 2 - 10

  const polarToCartesian = (angle: number) => {
    const rad = (angle - 90) * Math.PI / 180
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    }
  }

  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle)
    const end = polarToCartesian(endAngle)
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

    return [
      `M ${center} ${center}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      'Z',
    ].join(' ')
  }

  return (
    <svg width={size} height={size} className="mx-auto">
      {segments.map((segment, index) => (
        <path
          key={index}
          d={createArc(segment.startAngle, segment.endAngle)}
          fill={segment.color}
          className="transition-opacity hover:opacity-80"
        />
      ))}
      {/* Center circle */}
      <circle cx={center} cy={center} r={radius * 0.5} fill="var(--background)" />
      {/* Total text */}
      <text
        x={center}
        y={center - 5}
        textAnchor="middle"
        className="text-xs fill-muted-foreground"
      >
        总收益
      </text>
      <text
        x={center}
        y={center + 15}
        textAnchor="middle"
        className="text-sm font-medium fill-foreground"
      >
        ${total.toLocaleString()}
      </text>
    </svg>
  )
}

// =============================================================================
// AttributionCanvas Component
// =============================================================================

export function AttributionCanvas({
  data,
  isOpen,
  onClose,
}: AttributionCanvasProps) {
  if (!isOpen) return null

  const maxAbsValue = Math.max(
    ...data.attributionBreakdown.map(item => Math.abs(item.contribution))
  )

  const positiveFactors = data.attributionBreakdown.filter(f => f.contribution > 0)
  const negativeFactors = data.attributionBreakdown.filter(f => f.contribution < 0)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
              <PieChart className="h-5 w-5 text-primary" />
              归因分析
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
          {/* 总盈亏 */}
          <div
            className={cn(
              'p-4 rounded-lg text-center',
              data.totalPnL >= 0
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            )}
          >
            <p className="text-sm text-muted-foreground mb-1">总盈亏</p>
            <p
              className={cn(
                'text-3xl font-mono font-bold',
                data.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
              )}
            >
              {data.totalPnL >= 0 ? '+' : ''}${data.totalPnL.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(data.period.start)} - {formatDate(data.period.end)}
            </p>
          </div>

          {/* 因子贡献饼图 */}
          <div className="space-y-3">
            <h3 className="font-medium">因子贡献分布</h3>
            <SimplePieChart data={data.attributionBreakdown} />

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3">
              {data.attributionBreakdown.map(item => (
                <div key={item.factor} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 盈亏归因分解 */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              盈利因子
            </h3>
            {positiveFactors.length > 0 ? (
              <div className="space-y-4">
                {positiveFactors.map(item => (
                  <AttributionBar
                    key={item.factor}
                    item={item}
                    maxAbsValue={maxAbsValue}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">无盈利因子</p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              亏损因子
            </h3>
            {negativeFactors.length > 0 ? (
              <div className="space-y-4">
                {negativeFactors.map(item => (
                  <AttributionBar
                    key={item.factor}
                    item={item}
                    maxAbsValue={maxAbsValue}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">无亏损因子</p>
            )}
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

export default AttributionCanvas

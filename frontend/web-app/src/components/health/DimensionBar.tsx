/**
 * DimensionBar - 维度评分条形图
 *
 * @module S74 策略健康评分
 *
 * 横向条形图展示各维度评分
 */

'use client'

import { cn } from '@/lib/utils'
import type { DimensionScore } from '@/types/health'
import { HEALTH_STATUS_COLORS } from '@/types/health'

export interface DimensionBarProps {
  /** 维度评分数据 */
  dimension: DimensionScore
  /** 是否展开显示指标 */
  expanded?: boolean
  /** 点击展开回调 */
  onToggle?: () => void
  /** 自定义样式 */
  className?: string
}

export function DimensionBar({
  dimension,
  expanded = false,
  onToggle,
  className,
}: DimensionBarProps) {
  const color = HEALTH_STATUS_COLORS[dimension.status]
  const percentage = Math.min(100, Math.max(0, dimension.score))

  return (
    <div className={cn('space-y-2', className)}>
      {/* 维度标题行 */}
      <div
        className={cn(
          'flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity',
          onToggle && 'cursor-pointer'
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {dimension.label}
          </span>
          <span className="text-xs text-muted-foreground">
            (权重 {(dimension.weight * 100).toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color }}
          >
            {dimension.score.toFixed(0)}分
          </span>
          {onToggle && (
            <span className="text-muted-foreground text-xs">
              {expanded ? '▼' : '▶'}
            </span>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* 展开的指标列表 */}
      {expanded && dimension.indicators.length > 0 && (
        <div className="mt-3 pl-4 space-y-2 border-l-2 border-muted/30">
          {dimension.indicators.map((indicator) => (
            <div key={indicator.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{indicator.name}</span>
                <span
                  className="font-medium"
                  style={{ color: HEALTH_STATUS_COLORS[indicator.status] }}
                >
                  {indicator.value.toFixed(0)}分
                </span>
              </div>
              <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, indicator.value)}%`,
                    backgroundColor: HEALTH_STATUS_COLORS[indicator.status],
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {indicator.description}
              </p>
              {indicator.suggestion && (
                <p className="text-xs text-yellow-500">
                  💡 {indicator.suggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DimensionBar

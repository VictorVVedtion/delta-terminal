/**
 * GridVisualization Component
 *
 * 网格策略可视化组件，展示：
 * - 价格区间（上下边界）
 * - 网格线分布
 * - 当前市场价格
 * - 买卖区域标识
 */

'use client'

import React, { useMemo } from 'react'

import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface GridVisualizationProps {
  /** 上边界价格 */
  upperBound: number
  /** 下边界价格 */
  lowerBound: number
  /** 网格数量 */
  gridCount: number
  /** 当前市场价格（可选） */
  currentPrice?: number
  /** 组件高度 */
  height?: number
  /** 是否显示价格标签 */
  showLabels?: boolean
  /** 是否显示网格间距 */
  showSpacing?: boolean
  /** 额外的 className */
  className?: string
  /** 是否禁用动画 */
  disableAnimation?: boolean
}

interface GridLine {
  price: number
  percentage: number
  isUpper: boolean
  isLower: boolean
  index: number
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatPrice(value: number): string {
  if (value >= 10000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  if (value >= 100) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }
  if (value >= 1) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

function calculateGridLines(
  upperBound: number,
  lowerBound: number,
  gridCount: number
): GridLine[] {
  if (gridCount <= 0 || upperBound <= lowerBound) return []

  const lines: GridLine[] = []
  const range = upperBound - lowerBound
  const spacing = range / gridCount

  // 生成从上到下的网格线（包括上下边界）
  for (let i = 0; i <= gridCount; i++) {
    const price = upperBound - spacing * i
    const percentage = (i / gridCount) * 100

    lines.push({
      price,
      percentage,
      isUpper: i === 0,
      isLower: i === gridCount,
      index: i,
    })
  }

  return lines
}

// =============================================================================
// Component
// =============================================================================

export function GridVisualization({
  upperBound,
  lowerBound,
  gridCount,
  currentPrice,
  height = 200,
  showLabels = true,
  showSpacing = true,
  className,
  disableAnimation = false,
}: GridVisualizationProps) {
  // 验证输入
  const isValid = useMemo(() => {
    return (
      upperBound > 0 &&
      lowerBound > 0 &&
      upperBound > lowerBound &&
      gridCount > 0 &&
      gridCount <= 200
    )
  }, [upperBound, lowerBound, gridCount])

  // 计算网格线
  const gridLines = useMemo(() => {
    if (!isValid) return []
    return calculateGridLines(upperBound, lowerBound, gridCount)
  }, [upperBound, lowerBound, gridCount, isValid])

  // 计算当前价格位置
  const currentPricePosition = useMemo(() => {
    if (!currentPrice || !isValid) return null
    const range = upperBound - lowerBound
    const percentage = ((upperBound - currentPrice) / range) * 100

    // 限制在 0-100% 范围内
    if (percentage < 0 || percentage > 100) return null
    return percentage
  }, [currentPrice, upperBound, lowerBound, isValid])

  // 计算网格间距
  const gridSpacing = useMemo(() => {
    if (!isValid) return 0
    return (upperBound - lowerBound) / gridCount
  }, [upperBound, lowerBound, gridCount, isValid])

  // 计算每格利润率
  const gridProfitPercent = useMemo(() => {
    if (!isValid || lowerBound === 0) return 0
    return (gridSpacing / lowerBound) * 100
  }, [gridSpacing, lowerBound, isValid])

  if (!isValid) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20',
          className
        )}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">
          请设置有效的价格区间和网格数量
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 网格可视化区域 */}
      <div
        className="relative rounded-lg border border-border bg-background/50 overflow-hidden"
        style={{ height }}
      >
        {/* 背景渐变 - 买区/卖区 */}
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 bg-gradient-to-b from-red-500/5 to-transparent" />
          <div className="flex-1 bg-gradient-to-t from-green-500/5 to-transparent" />
        </div>

        {/* 网格线 */}
        <div className="absolute inset-0">
          {gridLines.map((line, idx) => (
            <div
              key={line.index}
              className={cn(
                'absolute left-0 right-0 border-t transition-all duration-300',
                line.isUpper || line.isLower
                  ? 'border-primary/60 border-dashed'
                  : 'border-muted-foreground/20',
                !disableAnimation && 'animate-in fade-in duration-500'
              )}
              style={{
                top: `${line.percentage}%`,
                animationDelay: disableAnimation ? undefined : `${idx * 30}ms`,
              }}
            >
              {/* 价格标签 */}
              {showLabels && (
                <span
                  className={cn(
                    'absolute right-2 -translate-y-1/2 text-[10px] font-mono tabular-nums',
                    line.isUpper || line.isLower
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground/60'
                  )}
                >
                  {formatPrice(line.price)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 当前价格指示器 */}
        {currentPricePosition !== null && (
          <div
            className={cn(
              'absolute left-0 right-0 flex items-center',
              !disableAnimation && 'animate-in slide-in-from-left duration-500'
            )}
            style={{ top: `${currentPricePosition}%` }}
          >
            {/* 价格线 */}
            <div className="flex-1 h-0.5 bg-yellow-500/80" />

            {/* 价格标签 */}
            <div className="absolute left-2 -translate-y-1/2 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-[10px] font-mono font-medium text-yellow-500 bg-background/90 px-1 rounded">
                {formatPrice(currentPrice!)}
              </span>
            </div>

            {/* 当前价格标识 */}
            <div className="absolute right-2 -translate-y-1/2">
              <span className="text-[9px] font-medium text-yellow-500/80 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                当前价
              </span>
            </div>
          </div>
        )}

        {/* 边界标识 */}
        <div className="absolute top-1 left-2">
          <span className="text-[9px] font-medium text-red-400/80 bg-red-500/10 px-1.5 py-0.5 rounded">
            卖出区
          </span>
        </div>
        <div className="absolute bottom-1 left-2">
          <span className="text-[9px] font-medium text-green-400/80 bg-green-500/10 px-1.5 py-0.5 rounded">
            买入区
          </span>
        </div>

        {/* 网格数量标识 */}
        <div className="absolute top-1 right-2">
          <span className="text-[9px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            {gridCount} 格
          </span>
        </div>
      </div>

      {/* 统计信息 */}
      {showSpacing && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted/30 p-2">
            <div className="text-[10px] text-muted-foreground">每格间距</div>
            <div className="text-xs font-mono font-medium text-foreground">
              {formatPrice(gridSpacing)}
            </div>
          </div>
          <div className="rounded-md bg-muted/30 p-2">
            <div className="text-[10px] text-muted-foreground">每格利润</div>
            <div className="text-xs font-mono font-medium text-green-500">
              {gridProfitPercent.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-md bg-muted/30 p-2">
            <div className="text-[10px] text-muted-foreground">价格区间</div>
            <div className="text-xs font-mono font-medium text-foreground">
              {((upperBound - lowerBound) / lowerBound * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Compact Variant
// =============================================================================

export interface GridVisualizationCompactProps {
  /** 上边界价格 */
  upperBound: number
  /** 下边界价格 */
  lowerBound: number
  /** 网格数量 */
  gridCount: number
  /** 当前市场价格（可选） */
  currentPrice?: number
  /** 额外的 className */
  className?: string
}

/**
 * 紧凑版网格可视化 - 用于列表或卡片展示
 */
export function GridVisualizationCompact({
  upperBound,
  lowerBound,
  gridCount,
  currentPrice,
  className,
}: GridVisualizationCompactProps) {
  // 验证输入
  const isValid =
    upperBound > 0 &&
    lowerBound > 0 &&
    upperBound > lowerBound &&
    gridCount > 0

  // 计算当前价格位置百分比
  const currentPricePercent = useMemo(() => {
    if (!currentPrice || !isValid) return null
    const range = upperBound - lowerBound
    const percent = ((currentPrice - lowerBound) / range) * 100
    return Math.max(0, Math.min(100, percent))
  }, [currentPrice, upperBound, lowerBound, isValid])

  if (!isValid) {
    return (
      <div className={cn('h-3 rounded bg-muted/30', className)} />
    )
  }

  return (
    <div className={cn('relative h-3 rounded-full overflow-hidden', className)}>
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 via-muted/30 to-red-500/30" />

      {/* 网格线示意 */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: Math.min(gridCount, 20) }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-muted-foreground/10 last:border-r-0"
          />
        ))}
      </div>

      {/* 当前价格指示器 */}
      {currentPricePercent !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.5)]"
          style={{ left: `${currentPricePercent}%` }}
        />
      )}
    </div>
  )
}

// =============================================================================
// Export
// =============================================================================

export default GridVisualization

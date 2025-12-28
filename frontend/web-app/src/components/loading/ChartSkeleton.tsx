import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// =============================================================================
// Chart Skeleton
// =============================================================================

export interface ChartSkeletonProps {
  className?: string
  /** Chart height */
  height?: number | string
  /** Show chart title */
  showTitle?: boolean
  /** Show legend */
  showLegend?: boolean
  /** Animation style */
  animation?: 'pulse' | 'shimmer' | 'none'
}

export function ChartSkeleton({
  className,
  height = 300,
  showTitle = true,
  showLegend = true,
  animation = 'shimmer',
}: ChartSkeletonProps) {
  const heightClass = typeof height === 'number' ? `h-[${height}px]` : height

  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-4', className)}>
      {/* Title */}
      {showTitle && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" animation={animation} />
          <Skeleton className="h-8 w-24 rounded-md" animation={animation} />
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" animation={animation} />
              <Skeleton className="h-3 w-16" animation={animation} />
            </div>
          ))}
        </div>
      )}

      {/* Chart Area */}
      <Skeleton
        className={cn('w-full rounded-md', heightClass)}
        animation={animation}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      />
    </div>
  )
}

// =============================================================================
// Line Chart Skeleton (with simulated data points)
// =============================================================================

export interface LineChartSkeletonProps {
  className?: string
  height?: number
  showTitle?: boolean
  animation?: 'pulse' | 'shimmer' | 'none'
}

export function LineChartSkeleton({
  className,
  height = 300,
  showTitle = true,
  animation = 'shimmer',
}: LineChartSkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-4', className)}>
      {showTitle && (
        <Skeleton className="h-6 w-32" animation={animation} />
      )}

      {/* Simulated line chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        <div className="absolute inset-0 flex items-end justify-between px-4 pb-4 gap-1">
          {Array.from({ length: 20 }).map((_, i) => {
            // Random heights for visual variety
            const randomHeight = Math.random() * 60 + 20
            return (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-sm"
                animation={animation}
                style={{ height: `${randomHeight}%` }}
              />
            )
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-3 w-12" animation={animation} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Candlestick Chart Skeleton (Trading)
// =============================================================================

export interface CandlestickSkeletonProps {
  className?: string
  height?: number
  showControls?: boolean
  animation?: 'pulse' | 'shimmer' | 'none'
}

export function CandlestickSkeleton({
  className,
  height = 400,
  showControls = true,
  animation = 'shimmer',
}: CandlestickSkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Chart Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-24" animation={animation} />
          <Skeleton className="h-6 w-16" animation={animation} />
        </div>
        {showControls && (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-8" animation={animation} />
            ))}
          </div>
        )}
      </div>

      {/* Chart Area */}
      <Skeleton
        className="m-4 rounded-md"
        animation={animation}
        style={{ height: `${height}px` }}
      />
    </div>
  )
}

// =============================================================================
// Dashboard Chart Grid Skeleton
// =============================================================================

export interface DashboardChartSkeletonProps {
  className?: string
  animation?: 'pulse' | 'shimmer' | 'none'
}

export function DashboardChartSkeleton({
  className,
  animation = 'shimmer',
}: DashboardChartSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-20" animation={animation} />
            <Skeleton className="h-8 w-32" animation={animation} />
            <Skeleton className="h-3 w-16" animation={animation} />
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <ChartSkeleton height={300} animation={animation} />

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton height={200} showLegend={false} animation={animation} />
        <ChartSkeleton height={200} showLegend={false} animation={animation} />
      </div>
    </div>
  )
}

// =============================================================================
// Mini Chart Skeleton (Sparkline style)
// =============================================================================

export interface MiniChartSkeletonProps {
  className?: string
  width?: number
  height?: number
  animation?: 'pulse' | 'shimmer' | 'none'
}

export function MiniChartSkeleton({
  className,
  width = 100,
  height = 40,
  animation = 'shimmer',
}: MiniChartSkeletonProps) {
  return (
    <Skeleton
      className={cn('rounded', className)}
      animation={animation}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  )
}

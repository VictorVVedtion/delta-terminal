import { cn } from '@/lib/utils'

// =============================================================================
// Base Skeleton
// =============================================================================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation style */
  animation?: 'pulse' | 'shimmer' | 'none' | undefined
}

export function Skeleton({
  className,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted',
        animation === 'pulse' && 'animate-pulse',
        animation === 'shimmer' && 'skeleton-shimmer',
        className,
      )}
      {...props}
    />
  )
}

// =============================================================================
// Text Skeleton
// =============================================================================

interface TextSkeletonProps {
  lines?: number | undefined
  className?: string | undefined
}

export function TextSkeleton({ lines = 3, className }: TextSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full',
          )}
        />
      ))}
    </div>
  )
}

// =============================================================================
// Card Skeleton
// =============================================================================

interface CardSkeletonProps {
  hasImage?: boolean | undefined
  hasFooter?: boolean | undefined
  className?: string | undefined
}

export function CardSkeleton({
  hasImage = false,
  hasFooter = true,
  className,
}: CardSkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-4', className)}>
      {hasImage && (
        <Skeleton className="h-40 w-full rounded-md" />
      )}
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
      {hasFooter && (
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Table Skeleton
// =============================================================================

interface TableSkeletonProps {
  rows?: number | undefined
  columns?: number | undefined
  className?: string | undefined
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('rounded-lg border', className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Chat Skeleton
// =============================================================================

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-3/4 max-w-sm" />
        </div>
      </div>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <ChatMessageSkeleton />
      <ChatMessageSkeleton />
      <ChatMessageSkeleton />
    </div>
  )
}

// =============================================================================
// Strategy Card Skeleton
// =============================================================================

export function StrategyCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  )
}

// =============================================================================
// Dashboard Skeleton
// =============================================================================

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-32" />
        </div>
        <TableSkeleton rows={5} columns={5} className="border-0" />
      </div>
    </div>
  )
}

// =============================================================================
// Trading View Skeleton
// =============================================================================

export function TradingViewSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
      {/* Chart Area */}
      <div className="lg:col-span-3 rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-8" />
            ))}
          </div>
        </div>
        <Skeleton className="h-[400px] m-4" />
      </div>

      {/* Order Book & Form */}
      <div className="space-y-4">
        {/* Order Book */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <Skeleton className="h-5 w-20" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Order Form */}
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default Skeleton

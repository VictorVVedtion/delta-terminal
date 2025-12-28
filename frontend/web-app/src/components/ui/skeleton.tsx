'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  animation?: 'pulse' | 'shimmer' | 'none'
}

export function Skeleton({
  className,
  animation = 'shimmer',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted',
        animation === 'pulse' && 'animate-pulse',
        animation === 'shimmer' &&
        'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        className
      )}
      {...props}
    />
  )
}

export function SkeletonText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-4 w-full', className)} {...props} />
}

export function SkeletonCircle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-10 w-10 rounded-full', className)} {...props} />
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-3 p-4 border rounded-lg', className)} {...props}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}

export function TradingViewSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-4 h-full w-full p-4", className)} {...props}>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="flex gap-4 flex-1 h-[600px]">
        <div className="flex-1">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
        <div className="w-72 hidden lg:block space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}

export function ChatSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-4 p-4 max-w-3xl mx-auto w-full", className)} {...props}>
      <div className="flex gap-4 items-start">
        <SkeletonCircle className="h-8 w-8" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <div className="flex gap-4 items-start flex-row-reverse">
        <SkeletonCircle className="h-8 w-8" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2 ml-auto" />
          <Skeleton className="h-12 w-3/4 ml-auto" />
        </div>
      </div>
      <div className="flex gap-4 items-start">
        <SkeletonCircle className="h-8 w-8" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-6", className)} {...props}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <div className="col-span-full mt-4">
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </div>
  )
}

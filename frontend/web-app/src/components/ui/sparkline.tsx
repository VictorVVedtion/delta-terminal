'use client'

import React, { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  color?: string
  className?: string
  height?: number
  showGradient?: boolean
}

export function Sparkline({
  data,
  color = '#10b981', // Default green
  className,
  height = 40,
  showGradient = true,
}: SparklineProps) {
  // Convert simple array to object array for Recharts
  const chartData = useMemo(() => {
    return data.map((val, i) => ({ i, val }))
  }, [data])

  const id = useMemo(() => `sparkline-${Math.random().toString(36).substr(2, 9)}`, [])

  if (!data || data.length === 0) return null

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            {showGradient && (
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          <Area
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={1.5}
            fill={showGradient ? `url(#${id})` : 'transparent'}
            isAnimationActive={false} // Disable animation for performance in lists
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
